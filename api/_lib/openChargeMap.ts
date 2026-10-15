import type { AnyBulkWriteOperation, Collection } from 'mongodb'
import { compact } from './catalog.js'
import { getDb } from './mongo.js'
import type { ChargingStationDoc, StationConnection, StationConnector } from './models.js'

/**
 * Imports Egypt's public charging stations from Open Charge Map, a
 * community-maintained registry with a free API (needs `OCM_API_KEY`).
 *
 * The operators' own apps (Infinity, Elsewedy Plug, Ikarus…) publish no API,
 * so this is the open source of truth; coverage is partial, and staff fill
 * the gaps by hand. A station staff have edited is never overwritten.
 *
 * The import runs at most once a day: the public list starts it when the last
 * attempt is older than that, and staff can run it from the panel.
 */

const API_URL = 'https://api.openchargemap.io/v3/poi'
const STATE_ID = 'ocm'
const DAY_MS = 24 * 60 * 60 * 1000
/** A run that started this long ago and never finished has died; another may start. */
const STALE_LOCK_MS = 5 * 60 * 1000

/** Egypt with a margin, so a mistyped coordinate in the sea is left out. */
const EGYPT_BOUNDS = { minLat: 21, maxLat: 32.5, minLng: 24, maxLng: 37.5 }

type OcmConnection = {
  ConnectionType?: { Title?: string } | null
  PowerKW?: number | null
  Quantity?: number | null
}

type OcmPoi = {
  ID: number
  AddressInfo?: {
    Title?: string
    AddressLine1?: string | null
    Town?: string | null
    StateOrProvince?: string | null
    Latitude?: number
    Longitude?: number
    ContactTelephone1?: string | null
    AccessComments?: string | null
  } | null
  OperatorInfo?: { Title?: string } | null
  UsageType?: { Title?: string } | null
  DataProvider?: { Title?: string; License?: string | null; WebsiteURL?: string | null } | null
  UsageCost?: string | null
  StatusType?: { IsOperational?: boolean | null } | null
  Connections?: OcmConnection[] | null
}

type SyncState = { _id: string; attemptedAt?: string; syncedAt?: string; runningSince?: string | null; lastError?: string | null }

export type SyncResult = { fetched: number; added: number; updated: number; keptEdited: number; skipped: number }

export function openChargeMapConfigured(): boolean {
  return Boolean(process.env.OCM_API_KEY)
}

/** Open Charge Map names plugs in prose; map them onto ours by their title. */
function connectorFrom(title: string | undefined): StationConnector {
  const text = (title ?? '').toLowerCase()
  if (text.includes('gb-t') || text.includes('gb/t') || text.includes('gbt')) return text.includes('dc') ? 'gbt-dc' : 'gbt-ac'
  if (text.includes('ccs')) return 'ccs2'
  if (text.includes('chademo')) return 'chademo'
  if (text.includes('type 2') || text.includes('mennekes')) return 'type2'
  return 'other'
}

/** A price per kWh when the note states one plainly, e.g. "3.5 EGP/kWh". */
function pricePerKwh(note: string | undefined): number | undefined {
  if (!note) return undefined
  const match = /(\d+(?:[.,]\d+)?)\s*(?:egp|le|l\.e\.?|جنيه|ج\.م)?\s*(?:\/|per|لكل)\s*(?:kwh|كيلووات)/i.exec(note)
  if (!match?.[1]) return undefined
  const value = Number(match[1].replace(',', '.'))
  return Number.isFinite(value) && value > 0 && value < 1000 ? value : undefined
}

function toStation(poi: OcmPoi, now: string): Omit<ChargingStationDoc, '_id' | 'active' | 'adminEdited' | 'createdAt'> | null {
  const address = poi.AddressInfo
  const lat = address?.Latitude
  const lng = address?.Longitude
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (lat < EGYPT_BOUNDS.minLat || lat > EGYPT_BOUNDS.maxLat || lng < EGYPT_BOUNDS.minLng || lng > EGYPT_BOUNDS.maxLng) return null

  const connections: StationConnection[] = (poi.Connections ?? []).map((connection) =>
    compact({
      type: connectorFrom(connection.ConnectionType?.Title),
      powerKw: typeof connection.PowerKW === 'number' && connection.PowerKW > 0 ? connection.PowerKW : undefined,
      count: typeof connection.Quantity === 'number' && connection.Quantity > 0 ? connection.Quantity : undefined,
    }),
  )
  const priceNote = poi.UsageCost?.trim() || undefined
  const title = address?.Title?.trim() || poi.OperatorInfo?.Title?.trim() || `Station ${poi.ID}`

  return compact({
    source: 'ocm' as const,
    externalId: poi.ID,
    name: { en: title.slice(0, 160), ar: '' },
    operator: poi.OperatorInfo?.Title?.trim() || undefined,
    city: (address?.Town || address?.StateOrProvince)?.trim() || undefined,
    address: address?.AddressLine1?.trim() || undefined,
    lat,
    lng,
    connections,
    connectors: [...new Set(connections.map((connection) => connection.type))],
    pricePerKwh: pricePerKwh(priceNote),
    priceNote: priceNote?.slice(0, 300),
    hours: address?.AccessComments?.trim()?.slice(0, 300) || undefined,
    phone: address?.ContactTelephone1?.trim() || undefined,
    // Unknown status counts as working; only a stated fault hides the pin's "working" label.
    operational: poi.StatusType?.IsOperational !== false,
    access: poi.UsageType?.Title?.trim()?.slice(0, 120) || undefined,
    dataProvider: poi.DataProvider?.Title?.trim()
      ? {
          title: poi.DataProvider.Title.trim().slice(0, 160),
          license: poi.DataProvider.License?.trim()?.slice(0, 300) || undefined,
          url: /^https?:\/\//.test(poi.DataProvider.WebsiteURL ?? '') ? poi.DataProvider.WebsiteURL!.slice(0, 500) : undefined,
        }
      : undefined,
    syncedAt: now,
    checkedAt: now,
    updatedAt: now,
  })
}

async function fetchEgypt(): Promise<OcmPoi[]> {
  const key = process.env.OCM_API_KEY
  if (!key) throw new Error('OCM_API_KEY is not set.')

  const url = `${API_URL}?output=json&countrycode=EG&maxresults=2000&compact=false&verbose=false`
  const response = await fetch(url, { headers: { 'X-API-Key': key, 'User-Agent': 'icaur-v27-guide' }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Open Charge Map answered ${response.status}.`)
  const body = (await response.json()) as unknown
  if (!Array.isArray(body)) throw new Error('Open Charge Map sent something other than a list.')
  return body as OcmPoi[]
}

/** Fetches every station and upserts it, leaving staff edits alone. */
export async function syncStations(): Promise<SyncResult> {
  const now = new Date().toISOString()
  const pois = await fetchEgypt()

  const db = await getDb()
  const stations = db.collection<ChargingStationDoc>('chargingStations')
  const edited = new Set(
    (await stations.find({ source: 'ocm', adminEdited: true }, { projection: { externalId: 1 } }).toArray()).map((doc) => doc.externalId),
  )

  const result: SyncResult = { fetched: pois.length, added: 0, updated: 0, keptEdited: 0, skipped: 0 }
  const operations: AnyBulkWriteOperation<ChargingStationDoc>[] = []
  for (const poi of pois) {
    const station = toStation(poi, now)
    if (!station) {
      result.skipped += 1
      continue
    }
    if (edited.has(poi.ID)) {
      result.keptEdited += 1
      operations.push({ updateOne: { filter: { source: 'ocm', externalId: poi.ID }, update: { $set: { syncedAt: now } } } })
      continue
    }
    operations.push({
      updateOne: {
        filter: { source: 'ocm', externalId: poi.ID },
        update: { $set: station, $setOnInsert: { active: true, adminEdited: false, createdAt: now } },
        upsert: true,
      },
    })
  }

  if (operations.length > 0) {
    const written = await stations.bulkWrite(operations, { ordered: false })
    result.added = written.upsertedCount
    result.updated = written.matchedCount - result.keptEdited
  }
  return result
}

/**
 * Runs the import when the last attempt is over a day old. One request claims
 * the run; the others carry on with the stations already stored. A failure
 * waits for the next day rather than being retried on every visit.
 */
export async function syncStationsIfStale(): Promise<void> {
  if (!openChargeMapConfigured()) return

  const db = await getDb()
  const state = db.collection<SyncState>('syncState')
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const claimed = await state.findOneAndUpdate(
    {
      _id: STATE_ID,
      $and: [
        { $or: [{ attemptedAt: { $exists: false } }, { attemptedAt: { $lt: new Date(now - DAY_MS).toISOString() } }] },
        { $or: [{ runningSince: null }, { runningSince: { $exists: false } }, { runningSince: { $lt: new Date(now - STALE_LOCK_MS).toISOString() } }] },
      ],
    },
    { $set: { attemptedAt: nowIso, runningSince: nowIso } },
    { upsert: true, returnDocument: 'after' },
  ).catch((error: unknown) => {
    // A duplicate key here means another request holds a fresh claim.
    if ((error as { code?: number }).code === 11000) return null
    throw error
  })
  if (!claimed) return

  await runRecorded(state, nowIso)
}

/** Staff's "Sync now": runs whatever the schedule says, unless a run is under way. */
export async function syncStationsNow(): Promise<SyncResult> {
  const db = await getDb()
  const state = db.collection<SyncState>('syncState')
  const nowIso = new Date().toISOString()
  await state.updateOne({ _id: STATE_ID }, { $set: { attemptedAt: nowIso, runningSince: nowIso } }, { upsert: true })
  const result = await runRecorded(state, nowIso)
  if (!result) {
    const failed = await state.findOne({ _id: STATE_ID })
    throw new Error(failed?.lastError ?? 'The import failed.')
  }
  return result
}

async function runRecorded(state: Collection<SyncState>, startedAt: string): Promise<SyncResult | null> {
  try {
    const result = await syncStations()
    await state.updateOne({ _id: STATE_ID }, { $set: { syncedAt: startedAt, runningSince: null, lastError: null } })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Open Charge Map import failed:', message)
    await state.updateOne({ _id: STATE_ID }, { $set: { runningSince: null, lastError: message.slice(0, 300) } })
    return null
  }
}

/** When the stations were last refreshed, and why the last attempt failed, for the panel. */
export async function syncStatus(): Promise<{ configured: boolean; syncedAt?: string; attemptedAt?: string; lastError?: string }> {
  const db = await getDb()
  const doc = await db.collection<SyncState>('syncState').findOne({ _id: STATE_ID })
  return compact({
    configured: openChargeMapConfigured(),
    syncedAt: doc?.syncedAt,
    attemptedAt: doc?.attemptedAt,
    lastError: doc?.lastError ?? undefined,
  })
}
