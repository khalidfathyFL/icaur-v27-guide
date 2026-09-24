import { requireAdmin } from '../_lib/auth'
import { HttpError, json, readJsonBody } from '../_lib/http'
import { getDb } from '../_lib/mongo'
import { optionalString, type PricingDoc } from '../_lib/models'

function toPublic(pricing: PricingDoc) {
  return {
    trim: pricing.trim,
    priceEgp: pricing.priceEgp,
    note: pricing.note,
    updatedAt: pricing.updatedAt,
  }
}

export async function handlePricing(request: Request): Promise<Response> {
  if (request.method === 'GET') return listPricing(request)
  if (request.method === 'PUT') return upsertPricing(request)

  throw new HttpError(405, 'Method not allowed.')
}

/**
 * Public. The site falls back to the prices committed in git when this is
 * empty or unreachable, so a cold database never blanks the page.
 */
async function listPricing(request: Request): Promise<Response> {
  const db = await getDb()
  const pricing = await db.collection<PricingDoc>('pricing').find({}).toArray()

  return json(request, { pricing: pricing.map(toPublic) })
}

async function upsertPricing(request: Request): Promise<Response> {
  const admin = await requireAdmin(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const trim = body.trim === 'play' || body.trim === 'wild' ? body.trim : null
  if (!trim) throw new HttpError(400, 'Trim must be play or wild.')

  const priceEgp = Number(body.priceEgp)
  if (!Number.isFinite(priceEgp) || priceEgp <= 0 || priceEgp > 100_000_000) {
    throw new HttpError(400, 'Enter a realistic price in Egyptian pounds.')
  }

  const db = await getDb()
  await db.collection<PricingDoc>('pricing').updateOne(
    { trim },
    {
      $set: {
        trim,
        priceEgp: Math.round(priceEgp),
        note: optionalString(body.note, 'Note', { max: 500 }),
        updatedAt: new Date().toISOString(),
        updatedBy: admin.name,
      },
    },
    { upsert: true },
  )

  return json(request, { ok: true })
}
