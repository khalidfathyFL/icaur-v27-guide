import { ObjectId } from 'mongodb'
import { requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { auditableChanges, recordAudit } from '../_lib/audit.js'
import { compact, requireName, setAndUnset } from '../_lib/catalog.js'
import { syncStationsIfStale, syncStationsNow, syncStatus } from '../_lib/openChargeMap.js'
import {
  STATION_CONNECTORS,
  optionalNumber,
  optionalPhone,
  optionalString,
  requireEnum,
  type ChargingStationDoc,
  type StationConnection,
} from '../_lib/models.js'

/**
 * Public charging stations, shown on the map at `#/charging`.
 *
 * - `GET charging/stations`: every active station; `all=1` (staff) adds
 *   removed ones and the import status.
 * - `POST charging/stations`: staff add a station by hand.
 * - `PATCH`/`DELETE charging/stations/:id`: staff correct or remove one.
 * - `POST charging/stations/sync`: staff run the Open Charge Map import now.
 */

const MAX_CONNECTIONS = 20

function toPublic(station: ChargingStationDoc) {
  return {
    id: station._id.toHexString(),
    source: station.source,
    name: station.name,
    operator: station.operator,
    city: station.city,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    connections: station.connections,
    connectors: station.connectors,
    pricePerKwh: station.pricePerKwh,
    priceNote: station.priceNote,
    hours: station.hours,
    phone: station.phone,
    access: station.access,
    operational: station.operational,
    dataProvider: station.dataProvider,
    active: station.active,
    adminEdited: station.adminEdited,
    checkedAt: station.checkedAt,
  }
}

export async function handleCharging(request: Request, segments: string[]): Promise<Response> {
  const [resource, id] = segments
  if (resource !== 'stations') throw new HttpError(404, 'Not found.')

  if (id === 'sync') {
    if (request.method === 'POST') return runSync(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (!id) {
    if (request.method === 'GET') return listStations(request)
    if (request.method === 'POST') return createStation(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (request.method === 'PATCH') return updateStation(request, id)
  if (request.method === 'DELETE') return removeStation(request, id)
  throw new HttpError(405, 'Method not allowed.')
}

async function listStations(request: Request): Promise<Response> {
  const staff = searchParams(request).get('all') === '1'
  if (staff) await requirePermission(request, 'charging.manage')
  else {
    // The first visitor of the day refreshes the list; a failure only means yesterday's stations.
    await syncStationsIfStale().catch((error: unknown) => console.error('Station refresh failed:', error))
  }

  const db = await getDb()
  const stations = await db
    .collection<ChargingStationDoc>('chargingStations')
    .find(staff ? {} : { active: true })
    .sort({ city: 1, 'name.en': 1 })
    .limit(3000)
    .toArray()

  return json(request, {
    stations: stations.map(toPublic),
    ...(staff ? { sync: await syncStatus() } : {}),
  })
}

/* ---------- validation ---------- */

function readConnections(value: unknown): StationConnection[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Plugs must be a list.')
  if (value.length > MAX_CONNECTIONS) throw new HttpError(400, `A station can list at most ${MAX_CONNECTIONS} plugs.`)
  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new HttpError(400, `Plug ${index + 1} is not valid.`)
    const body = item as Record<string, unknown>
    return compact({
      type: requireEnum(body.type, STATION_CONNECTORS, `Plug ${index + 1} type`),
      powerKw: optionalNumber(body.powerKw, `Plug ${index + 1} power`, { min: 0, max: 1000 }),
      count: optionalNumber(body.count, `Plug ${index + 1} count`, { min: 1, max: 100 }),
    })
  })
}

function readCoordinate(value: unknown, field: string, min: number, max: number): number {
  const number = optionalNumber(value, field, { min, max })
  if (number === undefined) throw new HttpError(400, `${field} is required.`)
  return number
}

function readStationBody(body: Record<string, unknown>) {
  const connections = readConnections(body.connections)
  return {
    name: requireName(body.name, 'station'),
    operator: optionalString(body.operator, 'Operator', { max: 120 }),
    city: optionalString(body.city, 'City', { max: 80 }),
    address: optionalString(body.address, 'Address', { max: 300 }),
    // Egypt's extent, with a margin.
    lat: readCoordinate(body.lat, 'Latitude', 21, 32.5),
    lng: readCoordinate(body.lng, 'Longitude', 24, 37.5),
    connections,
    connectors: [...new Set(connections.map((connection) => connection.type))],
    // Tariffs have piastres, so not the whole-pound money check.
    pricePerKwh: optionalNumber(body.pricePerKwh, 'Price per kWh', { min: 0, max: 1000 }),
    priceNote: optionalString(body.priceNote, 'Price note', { max: 300 }),
    hours: optionalString(body.hours, 'Hours', { max: 300 }),
    phone: optionalPhone(body.phone),
    access: optionalString(body.access, 'Access', { max: 120 }),
    operational: body.operational !== false,
  }
}

/* ---------- writes ---------- */

async function createStation(request: Request): Promise<Response> {
  const editor = await requirePermission(request, 'charging.manage')
  const fields = readStationBody(await readJsonBody<Record<string, unknown>>(request))

  const now = new Date().toISOString()
  const doc = compact({ ...fields, source: 'manual' as const, active: true, adminEdited: true, checkedAt: now, createdAt: now, updatedAt: now })

  const db = await getDb()
  const result = await db.collection<ChargingStationDoc>('chargingStations').insertOne(doc as ChargingStationDoc)

  await recordAudit(editor, 'station.created', {
    target: { kind: 'station', id: result.insertedId.toHexString(), label: doc.name.en || doc.name.ar },
  })

  return json(request, { station: toPublic({ ...doc, _id: result.insertedId } as ChargingStationDoc) }, 201)
}

async function updateStation(request: Request, id: string): Promise<Response> {
  const editor = await requirePermission(request, 'charging.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Station not found.')

  const body = await readJsonBody<Record<string, unknown>>(request)
  const db = await getDb()
  const collection = db.collection<ChargingStationDoc>('chargingStations')
  const existing = await collection.findOne({ _id: new ObjectId(id) })
  if (!existing) throw new HttpError(404, 'Station not found.')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updatedAt: now }

  // A body with a name is the full form; one without is a toggle.
  if (body.name !== undefined) {
    Object.assign(update, readStationBody(body), { adminEdited: true, checkedAt: now })
  }
  if (body.active !== undefined) {
    update.active = body.active === true
    // Removing an imported station must survive the next import.
    if (existing.source === 'ocm') update.adminEdited = true
  }
  // Handing an imported station back to the import: the next run overwrites it.
  if (body.adminEdited === false && existing.source === 'ocm') update.adminEdited = false
  if (body.checked === true) update.checkedAt = now

  const { set, update: changes } = setAndUnset(update)
  await collection.updateOne({ _id: existing._id }, changes)

  await recordAudit(editor, 'station.updated', {
    target: { kind: 'station', id, label: existing.name.en || existing.name.ar },
    changes: auditableChanges(set),
  })

  const saved = await collection.findOne({ _id: existing._id })
  return json(request, { station: saved ? toPublic(saved) : null })
}

/** Soft delete, so an imported station does not come back with the next import. */
async function removeStation(request: Request, id: string): Promise<Response> {
  const editor = await requirePermission(request, 'charging.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Station not found.')

  const db = await getDb()
  const station = await db
    .collection<ChargingStationDoc>('chargingStations')
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { active: false, adminEdited: true, updatedAt: new Date().toISOString() } })
  if (!station) throw new HttpError(404, 'Station not found.')

  await recordAudit(editor, 'station.removed', { target: { kind: 'station', id, label: station.name.en || station.name.ar } })
  return json(request, { ok: true })
}

async function runSync(request: Request): Promise<Response> {
  const editor = await requirePermission(request, 'charging.manage')
  const result = await syncStationsNow().catch((error: unknown) => {
    throw new HttpError(502, error instanceof Error ? error.message : 'The import failed.')
  })
  await recordAudit(editor, 'station.synced', { changes: { ...result } })
  return json(request, { result, sync: await syncStatus() })
}
