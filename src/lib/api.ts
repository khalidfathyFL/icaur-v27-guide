import { readSessionStored, readStored, writeSessionStored, writeStored } from './storage'
import type { Localized, Trim } from '../content/types'

/**
 * Client for the Vercel-hosted API. The site itself is static on GitHub Pages,
 * so `VITE_API_URL` points at the Vercel deployment. When it is not set the
 * client reports as unconfigured and callers fall back to the content in git.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'icaur-token'

export const apiConfigured = BASE_URL.length > 0

export type Role = 'user' | 'admin'
export type Ownership = 'owner' | 'interested'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type ApiUser = {
  id: string
  email: string
  name: string
  role: Role
  /** Missing on accounts created before sign-up asked. */
  ownership?: Ownership
  /** Optional details the owner fills in on their profile. */
  phone?: string
  country?: string
  city?: string
  trim?: Trim
  colour?: string
  /** Whether they get an email when a new post is published. */
  emailNewPosts?: boolean
  /**
   * For the signed-in person (`me`), everything they hold including their
   * roles. In the admin account list, only what was granted individually.
   */
  permissions?: string[]
  /** Roles assigned to the account; each contributes its permissions. */
  roleIds?: string[]
  status?: 'active' | 'blocked'
  createdAt?: string
}

/** One permission as the server describes it; the matrix renders from these. */
export type ApiComment = {
  id: string
  postId: string
  postTitle?: string
  body: string
  authorName: string
  status: ReviewStatus
  reviewNote?: string
  createdAt: string
}

export type ApiPermissionDefinition = {
  key: string
  label: string
  description: string
  group: string
}

/** A named bundle of permissions that can be assigned to accounts. */
export type ApiRole = {
  id: string
  name: string
  description?: string
  permissions: string[]
  /** How many accounts hold it; present when listed. */
  members?: number
}

export type RoleInput = { name: string; description?: string; permissions: string[] }

export type ApiStats = {
  total: number
  recent: number
  byOwnership: { value: string | null; count: number }[]
  byTrim: { value: string | null; count: number }[]
  byCountry: { value: string | null; count: number }[]
  byCity: { value: string | null; count: number }[]
  byColour: { value: string | null; count: number }[]
  approvedPosts: number
  pendingSuggestions: number
}

export type ApiAuditEntry = {
  id: string
  action: string
  actorName: string
  actorRole: 'user' | 'admin'
  target?: { kind: string; id: string; label?: string }
  changes?: Record<string, unknown>
  note?: string
  at: string
}

export type ProfileInput = {
  name?: string
  ownership?: Ownership
  phone?: string
  country?: string
  city?: string
  trim?: Trim
  colour?: string
  emailNewPosts?: boolean
}

export type ApiPost = {
  id: string
  slug: string
  title: Localized
  excerpt: Localized
  body: Localized
  authorName: string
  status: ReviewStatus
  reviewNote?: string
  pinned?: boolean
  createdAt: string
  updatedAt: string
}

export type SuggestionTarget = {
  kind: 'feature' | 'spec' | 'equipment' | 'dealer' | 'other'
  id: string
  field?: string
}

export type ApiSuggestion = {
  id: string
  target: SuggestionTarget
  current: string
  proposed: string
  reason: string
  authorName: string
  status: ReviewStatus
  reviewNote?: string
  createdAt: string
}

export type ApiDealer = {
  id: string
  name: string
  area: string
  phone?: string
  sellsAtListPrice: boolean
  notes?: string
  verifiedAt: string
}

export type ApiPricing = {
  trim: Trim
  priceEgp: number
  note?: string
  updatedAt: string
}

export type PartCategory =
  | 'protection'
  | 'exterior'
  | 'interior'
  | 'electronics'
  | 'lighting'
  | 'cargo-roof'
  | 'offroad'
  | 'maintenance'
export type PartSource = 'local' | 'china'
export type PartAvailability = 'in_stock' | 'on_order' | 'unavailable'
export type ImportCurrency = 'CNY' | 'USD'

export type PartPrice = {
  /** Missing means "price on request". */
  amountEgp?: number
  installEgp?: number
  originalAmount?: number
  originalCurrency?: ImportCurrency
  shippingEgp?: number
  customsEgp?: number
}

export type PartSupplier = {
  name: string
  kind: 'shop' | 'online'
  city?: string
  phone?: string
  whatsapp?: string
  url?: string
}

export type PartSpecs = {
  material?: string
  color?: string
  dimensions?: string
  weightKg?: number
  warrantyMonths?: number
  /** Empty means it fits both trims. */
  fitsTrims: Trim[]
  importNotes?: Localized
}

export type PartImage = { url: string; pathname: string; alt?: string }

export type ApiPart = {
  id: string
  slug: string
  name: Localized
  description: Localized
  category: PartCategory
  subcategory?: string
  source: PartSource
  price: PartPrice
  /** Item, shipping, customs and fitting added up by the server; null with no price. */
  landedEgp: number | null
  availability: PartAvailability
  leadTimeDays?: { min: number; max: number }
  suppliers: PartSupplier[]
  specs: PartSpecs
  images: PartImage[]
  ratingAvg: number
  ratingCount: number
  active: boolean
  priceCheckedAt: string
  updatedAt: string
}

/** Everything the admin form sends; the server derives the rest. */
export type PartInput = Omit<
  ApiPart,
  'id' | 'slug' | 'landedEgp' | 'ratingAvg' | 'ratingCount' | 'active' | 'priceCheckedAt' | 'updatedAt'
>

/** Owner reviews: accessories and protection centers share one shape and one set of rules. */
export type ReviewTarget = 'part' | 'center' | 'insurer'

export type ApiOwnerReview = {
  id: string
  targetId: string
  targetName: string
  targetSlug: string
  rating: number
  body: string
  authorName: string
  status: ReviewStatus
  reviewNote?: string
  createdAt: string
}

/** Each kind stores its target under its own field names; the client reads them as one. */
const REVIEW_ROUTES: Record<ReviewTarget, { route: string; id: string; name: string; slug: string }> = {
  part: { route: 'part-reviews', id: 'partId', name: 'partName', slug: 'partSlug' },
  center: { route: 'center-reviews', id: 'centerId', name: 'centerName', slug: 'centerSlug' },
  insurer: { route: 'insurer-reviews', id: 'insurerId', name: 'insurerName', slug: 'insurerSlug' },
}

function toOwnerReview(kind: ReviewTarget, raw: Record<string, unknown>): ApiOwnerReview {
  const fields = REVIEW_ROUTES[kind]
  return {
    ...(raw as Omit<ApiOwnerReview, 'targetId' | 'targetName' | 'targetSlug'>),
    targetId: String(raw[fields.id] ?? ''),
    targetName: String(raw[fields.name] ?? ''),
    targetSlug: String(raw[fields.slug] ?? ''),
  }
}

export type ProtectionService =
  | 'ppf'
  | 'ceramic'
  | 'tint'
  | 'windshield'
  | 'interior'
  | 'underbody'
  | 'paint-correction'
  | 'wrap'

export type CoverageArea =
  | 'full-body'
  | 'full-front'
  | 'front-bumper'
  | 'hood'
  | 'fenders'
  | 'mirrors'
  | 'headlights'
  | 'a-pillars'
  | 'roof'
  | 'doors'
  | 'door-edges'
  | 'door-cups'
  | 'rocker-panels'
  | 'rear-bumper'
  | 'trunk-ledge'
  | 'windows'
  | 'windshield'
  | 'sunroof'
  | 'interior-screens'
  | 'interior-trim'
  | 'wheels'
  | 'underbody'

export type CenterPackage = {
  /** Assigned by the server; send it back on edit to keep the package's link. */
  id?: string
  name: Localized
  service: ProtectionService
  coverage: CoverageArea[]
  /** Missing means "price on request". */
  priceEgp?: number
  /** Only when the Wild is charged differently. */
  wildPriceEgp?: number
  durationDays?: { min: number; max: number }
  brand?: string
  product?: string
  materialType?: string
  thicknessMil?: number
  selfHealing?: boolean
  warrantyYears?: number
  inclusions: string[]
  notes?: Localized
}

export type ApiCenter = {
  id: string
  slug: string
  name: Localized
  description: Localized
  city?: string
  area?: string
  address?: string
  mapUrl?: string
  phone?: string
  whatsapp?: string
  website?: string
  instagram?: string
  hours?: string
  services: ProtectionService[]
  packages: (CenterPackage & { id: string })[]
  /** The cheapest package, for "from X EGP"; null with no packages. */
  fromPriceEgp: number | null
  images: PartImage[]
  ratingAvg: number
  ratingCount: number
  active: boolean
  checkedAt: string
  updatedAt: string
}

export type CenterInput = Omit<
  ApiCenter,
  'id' | 'slug' | 'services' | 'packages' | 'fromPriceEgp' | 'ratingAvg' | 'ratingCount' | 'active' | 'checkedAt' | 'updatedAt'
> & { packages: CenterPackage[] }

/** One line of the request list, as the user edits it. */
export type CartItemInput = { partId: string; quantity: number; note?: string; fitting: boolean }

/** A line with its accessory as listed now; `part` is null once the accessory is removed. */
export type ApiCartLine = CartItemInput & {
  addedAt: string
  part: {
    id: string
    slug: string
    name: Localized
    source: PartSource
    availability: PartAvailability
    unitPriceEgp: number | null
    installEgp?: number
    leadTimeDays?: { min: number; max: number }
    image?: PartImage
  } | null
}

export type ApiCart = { items: ApiCartLine[]; updatedAt: string | null }

export type OrderStatus = 'new' | 'confirmed' | 'ordered' | 'arrived' | 'delivered' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'deposit' | 'paid'

export type OrderContact = { name: string; phone: string; whatsapp?: string; city?: string; address?: string }

export type ApiOrder = {
  id: string
  number: string
  contact: OrderContact
  note?: string
  items: {
    partId: string
    slug: string
    name: Localized
    source: PartSource
    quantity: number
    note?: string
    fitting: boolean
    /** Missing when the accessory had no price. */
    unitPriceEgp?: number
    installEgp?: number
  }[]
  estimatedTotalEgp: number
  finalTotalEgp?: number
  status: OrderStatus
  history: { status: OrderStatus; at: string; by: string; note?: string }[]
  payment: { status: PaymentStatus; amountEgp?: number; note?: string }
  createdAt: string
  updatedAt: string
  /** Only for order handlers. */
  userEmail?: string
  staffNote?: string
}

export type OrderUpdate = {
  status?: OrderStatus
  /** Shown to the customer with the status. */
  statusNote?: string
  payment?: { status: PaymentStatus; amountEgp?: number; note?: string }
  /** `null` clears it. */
  finalTotalEgp?: number | null
  staffNote?: string
}

export type InsuranceCover =
  | 'own-damage'
  | 'total-loss'
  | 'theft'
  | 'fire'
  | 'third-party'
  | 'natural-disasters'
  | 'riots'
  | 'glass'
  | 'battery'
  | 'personal-accident'
  | 'roadside'
  | 'towing'
  | 'replacement-car'
  | 'abroad'

/** One insurance plan. Everything but the name is optional. */
export type InsurancePlan = {
  /** Assigned by the server; send it back on edit to keep the plan's link. */
  id?: string
  name: Localized
  /** Yearly premium as a percentage of the car's value. */
  ratePct?: number
  minPremiumEgp?: number
  covers: InsuranceCover[]
  /** Agency repair for the car's first N years; 0 means never. */
  agencyRepairYears?: number
  cashbackPct?: number
  cashbackCondition?: Localized
  noClaimsDiscountPct?: number
  deductiblePct?: number
  deductibleEgp?: number
  maxCarAgeYears?: number
  installments?: Localized
  notes?: Localized
}

export type ApiInsurer = {
  id: string
  slug: string
  name: Localized
  description: Localized
  hotline?: string
  phone?: string
  whatsapp?: string
  website?: string
  email?: string
  branches?: string
  plans: (InsurancePlan & { id: string })[]
  /** The lowest yearly rate across the plans; null when none has one. */
  lowestRatePct: number | null
  bestCashbackPct: number | null
  images: PartImage[]
  ratingAvg: number
  ratingCount: number
  active: boolean
  checkedAt: string
  updatedAt: string
}

export type InsurerInput = Omit<
  ApiInsurer,
  'id' | 'slug' | 'plans' | 'lowestRatePct' | 'bestCashbackPct' | 'ratingAvg' | 'ratingCount' | 'active' | 'checkedAt' | 'updatedAt'
> & { plans: InsurancePlan[] }

/**
 * Where uploaded photos go. Listing folders are open only to that listing's
 * editors; `posts` to any signed-in account.
 */
export type UploadFolder = 'parts' | 'centers' | 'posts' | 'insurers'

export type PartFilters = {
  category?: PartCategory
  source?: PartSource
  trim?: Trim
  q?: string
  /** Include removed parts; admin only. */
  all?: boolean
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * A remembered token lives in localStorage and survives closing the browser;
 * otherwise it lives in sessionStorage and goes when the browser does.
 */
export const getToken = () => readSessionStored(TOKEN_KEY) || readStored(TOKEN_KEY)
export const setToken = (token: string, remember = true) => {
  clearToken()
  if (remember) writeStored(TOKEN_KEY, token)
  else writeSessionStored(TOKEN_KEY, token)
}
export const clearToken = () => {
  writeStored(TOKEN_KEY, '')
  writeSessionStored(TOKEN_KEY, '')
}

async function request<T>(
  path: string,
  { method = 'GET', body, auth = false }: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  if (!apiConfigured) {
    throw new ApiError(503, 'The contributions service is not configured for this build.')
  }

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = getToken()
    if (!token) throw new ApiError(401, 'Sign in to continue.')
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    // The route travels as a query parameter: Vercel only delivers
    // single-segment paths to the function behind this API.
    const [route, query] = path.split('?')
    const url = `${BASE_URL}/api/router?p=${encodeURIComponent(route ?? '')}${query ? `&${query}` : ''}`

    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // Network failure, DNS, CORS rejection, or the function being cold.
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (!response.ok) {
    throw new ApiError(response.status, payload.error ?? 'Request failed.')
  }

  return payload
}

/* ---------- auth ---------- */

export const api = {
  register: (input: { name: string; email: string; password: string } & ProfileInput) =>
    request<{ user: ApiUser; token: string }>('auth/register', { method: 'POST', body: input }),

  login: (input: { email: string; password: string; remember: boolean }) =>
    request<{ user: ApiUser; token: string }>('auth/login', { method: 'POST', body: input }),

  me: () => request<{ user: ApiUser }>('auth/me', { auth: true }),

  updateProfile: (input: ProfileInput) =>
    request<{ user: ApiUser }>('auth/me', { method: 'PATCH', body: input, auth: true }),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>('auth/password', { method: 'POST', body: input, auth: true }),

  listUsers: () => request<{ users: ApiUser[] }>('auth/users', { auth: true }),

  stats: () => request<{ stats: ApiStats }>('auth/stats', { auth: true }),

  audit: () => request<{ entries: ApiAuditEntry[] }>('auth/audit', { auth: true }),

  permissionDefinitions: () =>
    request<{ permissions: ApiPermissionDefinition[] }>('auth/permissions', { auth: true }),

  updateUser: (
    id: string,
    input: { role?: Role; status?: 'active' | 'blocked'; permissions?: string[]; roleIds?: string[] },
  ) =>
    request<{ ok: true }>(`auth/users/${id}`, { method: 'PATCH', body: input, auth: true }),

  /* ---------- roles ---------- */

  listRoles: () => request<{ roles: ApiRole[] }>('roles', { auth: true }),

  createRole: (input: RoleInput) =>
    request<{ role: ApiRole }>('roles', { method: 'POST', body: input, auth: true }),

  updateRole: (id: string, input: Partial<RoleInput>) =>
    request<{ role: ApiRole }>(`roles/${id}`, { method: 'PATCH', body: input, auth: true }),

  deleteRole: (id: string) => request<{ ok: true }>(`roles/${id}`, { method: 'DELETE', auth: true }),

  /* ---------- posts ---------- */

  listPosts: (params: { mine?: boolean; status?: ReviewStatus | 'all' } = {}) => {
    const query = new URLSearchParams()
    if (params.mine) query.set('mine', '1')
    if (params.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query}` : ''
    return request<{ posts: ApiPost[] }>(`posts${suffix}`, { auth: Boolean(params.mine || params.status) })
  },

  readPost: (idOrSlug: string) => request<{ post: ApiPost }>(`posts/${idOrSlug}`),

  /** The excerpt is derived server-side from the sanitized body. */
  createPost: (input: { title: Localized; body: Localized }) =>
    request<{ post: ApiPost }>('posts', { method: 'POST', body: input, auth: true }),

  updatePost: (id: string, input: { title?: Localized; body?: Localized; excerpt?: Localized }) =>
    request<{ post: ApiPost }>(`posts/${id}`, { method: 'PATCH', body: input, auth: true }),

  reviewPost: (id: string, input: { status: 'approved' | 'rejected'; note?: string }) =>
    request<{ ok: true }>(`posts/${id}/review`, { method: 'POST', body: input, auth: true }),

  /** Pinned posts head the public list. Needs the same permission as approving. */
  pinPost: (id: string, pinned: boolean) =>
    request<{ ok: true; pinned: boolean }>(`posts/${id}/pin`, { method: 'POST', body: { pinned }, auth: true }),

  deletePost: (id: string) => request<{ ok: true }>(`posts/${id}`, { method: 'DELETE', auth: true }),

  /* ---------- comments ---------- */

  listComments: (postId: string) =>
    request<{ comments: ApiComment[] }>(`comments?postId=${encodeURIComponent(postId)}`),

  commentQueue: (status: ReviewStatus | 'all' = 'pending') =>
    request<{ comments: ApiComment[] }>(`comments?queue=1&status=${status}`, { auth: true }),

  createComment: (input: { postId: string; body: string }) =>
    request<{ comment: ApiComment }>('comments', { method: 'POST', body: input, auth: true }),

  reviewComment: (id: string, input: { status: 'approved' | 'rejected'; note?: string }) =>
    request<{ ok: true }>(`comments/${id}/review`, { method: 'POST', body: input, auth: true }),

  deleteComment: (id: string) =>
    request<{ ok: true }>(`comments/${id}`, { method: 'DELETE', auth: true }),

  /* ---------- suggested edits ---------- */

  listSuggestions: (params: { queue?: boolean; status?: ReviewStatus | 'all' } = {}) => {
    const query = new URLSearchParams()
    if (params.queue) query.set('queue', '1')
    if (params.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query}` : ''
    return request<{ suggestions: ApiSuggestion[] }>(`suggestions${suffix}`, { auth: true })
  },

  createSuggestion: (input: {
    target: SuggestionTarget
    current: string
    proposed: string
    reason: string
  }) => request<{ suggestion: ApiSuggestion }>('suggestions', { method: 'POST', body: input, auth: true }),

  reviewSuggestion: (id: string, input: { status: 'approved' | 'rejected'; note?: string }) =>
    request<{ ok: true }>(`suggestions/${id}/review`, { method: 'POST', body: input, auth: true }),

  /* ---------- dealers and pricing ---------- */

  listDealers: () => request<{ dealers: ApiDealer[] }>('dealers'),

  createDealer: (input: Omit<ApiDealer, 'id' | 'verifiedAt'>) =>
    request<{ dealer: ApiDealer }>('dealers', { method: 'POST', body: input, auth: true }),

  updateDealer: (id: string, input: Partial<ApiDealer> & { active?: boolean }) =>
    request<{ ok: true }>(`dealers/${id}`, { method: 'PATCH', body: input, auth: true }),

  removeDealer: (id: string) => request<{ ok: true }>(`dealers/${id}`, { method: 'DELETE', auth: true }),

  listPricing: () => request<{ pricing: ApiPricing[] }>('pricing'),

  savePricing: (input: { trim: Trim; priceEgp: number; note?: string }) =>
    request<{ ok: true }>('pricing', { method: 'PUT', body: input, auth: true }),

  /* ---------- accessories ---------- */

  listParts: (filters: PartFilters = {}) => {
    const query = new URLSearchParams()
    if (filters.category) query.set('category', filters.category)
    if (filters.source) query.set('source', filters.source)
    if (filters.trim) query.set('trim', filters.trim)
    if (filters.q) query.set('q', filters.q)
    if (filters.all) query.set('all', '1')
    const suffix = query.toString() ? `?${query}` : ''
    return request<{ parts: ApiPart[] }>(`parts${suffix}`, { auth: Boolean(filters.all) })
  },

  // Not encoded here: `request` encodes the whole route, and slugs never hold / or ?.
  readPart: (idOrSlug: string) => request<{ part: ApiPart }>(`parts/${idOrSlug}`),

  createPart: (input: PartInput) =>
    request<{ part: ApiPart }>('parts', { method: 'POST', body: input, auth: true }),

  updatePart: (id: string, input: Partial<PartInput> & { active?: boolean; priceChecked?: boolean }) =>
    request<{ part: ApiPart }>(`parts/${id}`, { method: 'PATCH', body: input, auth: true }),

  removePart: (id: string) => request<{ ok: true }>(`parts/${id}`, { method: 'DELETE', auth: true }),

  /**
   * Sends one photo straight to Vercel Blob. The API only hands out a token,
   * after checking the caller may edit that kind of listing; the file itself
   * never passes through the function.
   */
  uploadImage: async (folder: UploadFolder, file: Blob, fileName: string): Promise<PartImage> => {
    if (!apiConfigured) throw new ApiError(503, 'The contributions service is not configured for this build.')
    const token = getToken()
    if (!token) throw new ApiError(401, 'Sign in to continue.')

    try {
      // Loaded on first upload: only editors need it, and every page loads this file.
      const { upload } = await import('@vercel/blob/client')
      const blob = await upload(`${folder}/${fileName}`, file, {
        access: 'public',
        handleUploadUrl: `${BASE_URL}/api/router?p=uploads`,
        headers: { Authorization: `Bearer ${token}` },
        contentType: file.type,
      })
      return { url: blob.url, pathname: blob.pathname }
    } catch (caught) {
      // The SDK surfaces the route's error text in its message.
      const message = caught instanceof Error ? caught.message : ''
      throw new ApiError(0, message || 'Could not upload the photo.')
    }
  },

  /* ---------- protection centers ---------- */

  listCenters: (params: { all?: boolean } = {}) =>
    request<{ centers: ApiCenter[] }>(`centers${params.all ? '?all=1' : ''}`, { auth: Boolean(params.all) }),

  readCenter: (idOrSlug: string) => request<{ center: ApiCenter }>(`centers/${idOrSlug}`),

  createCenter: (input: CenterInput) =>
    request<{ center: ApiCenter }>('centers', { method: 'POST', body: input, auth: true }),

  updateCenter: (id: string, input: Partial<CenterInput> & { active?: boolean; checked?: boolean }) =>
    request<{ center: ApiCenter }>(`centers/${id}`, { method: 'PATCH', body: input, auth: true }),

  removeCenter: (id: string) => request<{ ok: true }>(`centers/${id}`, { method: 'DELETE', auth: true }),

  /* ---------- insurance ---------- */

  listInsurers: (params: { all?: boolean } = {}) =>
    request<{ insurers: ApiInsurer[] }>(`insurers${params.all ? '?all=1' : ''}`, { auth: Boolean(params.all) }),

  readInsurer: (idOrSlug: string) => request<{ insurer: ApiInsurer }>(`insurers/${idOrSlug}`),

  createInsurer: (input: InsurerInput) =>
    request<{ insurer: ApiInsurer }>('insurers', { method: 'POST', body: input, auth: true }),

  updateInsurer: (id: string, input: Partial<InsurerInput> & { active?: boolean; checked?: boolean }) =>
    request<{ insurer: ApiInsurer }>(`insurers/${id}`, { method: 'PATCH', body: input, auth: true }),

  removeInsurer: (id: string) => request<{ ok: true }>(`insurers/${id}`, { method: 'DELETE', auth: true }),

  /* ---------- owner reviews ---------- */

  listReviews: async (kind: ReviewTarget, targetId: string) => {
    const { route, id } = REVIEW_ROUTES[kind]
    const { reviews } = await request<{ reviews: Record<string, unknown>[] }>(`${route}?${id}=${encodeURIComponent(targetId)}`)
    return reviews.map((raw) => toOwnerReview(kind, raw))
  },

  /** The signed-in person's own review, whatever its status, or null. */
  myReview: async (kind: ReviewTarget, targetId: string) => {
    const { route, id } = REVIEW_ROUTES[kind]
    const { reviews } = await request<{ reviews: Record<string, unknown>[] }>(
      `${route}?${id}=${encodeURIComponent(targetId)}&mine=1`,
      { auth: true },
    )
    return reviews[0] ? toOwnerReview(kind, reviews[0]) : null
  },

  reviewQueue: async (kind: ReviewTarget, status: ReviewStatus | 'all' = 'pending') => {
    const { reviews } = await request<{ reviews: Record<string, unknown>[] }>(
      `${REVIEW_ROUTES[kind].route}?queue=1&status=${status}`,
      { auth: true },
    )
    return reviews.map((raw) => toOwnerReview(kind, raw))
  },

  createReview: async (kind: ReviewTarget, input: { targetId: string; rating: number; body: string }) => {
    const { route, id } = REVIEW_ROUTES[kind]
    const { review } = await request<{ review: Record<string, unknown> }>(route, {
      method: 'POST',
      body: { [id]: input.targetId, rating: input.rating, body: input.body },
      auth: true,
    })
    return toOwnerReview(kind, review)
  },

  decideReview: (kind: ReviewTarget, reviewId: string, input: { status: 'approved' | 'rejected'; note?: string }) =>
    request<{ ok: true }>(`${REVIEW_ROUTES[kind].route}/${reviewId}/review`, { method: 'POST', body: input, auth: true }),

  deleteReview: (kind: ReviewTarget, reviewId: string) =>
    request<{ ok: true }>(`${REVIEW_ROUTES[kind].route}/${reviewId}`, { method: 'DELETE', auth: true }),

  /* ---------- request list and orders ---------- */

  getCart: () => request<{ cart: ApiCart }>('cart', { auth: true }),

  /** Replaces the whole list and returns it with each accessory as listed now. */
  saveCart: (items: CartItemInput[]) =>
    request<{ cart: ApiCart }>('cart', { method: 'PUT', body: { items }, auth: true }),

  /** Sends the saved list as a request and empties it. */
  createOrder: (input: { contact: OrderContact; note?: string }) =>
    request<{ order: ApiOrder }>('orders', { method: 'POST', body: input, auth: true }),

  myOrders: () => request<{ orders: ApiOrder[] }>('orders?mine=1', { auth: true }),

  orderQueue: (status: OrderStatus | 'open' | 'all' = 'open') =>
    request<{ orders: ApiOrder[] }>(`orders?status=${status}`, { auth: true }),

  updateOrder: (id: string, input: OrderUpdate) =>
    request<{ order: ApiOrder }>(`orders/${id}`, { method: 'PATCH', body: input, auth: true }),

  cancelOrder: (id: string) => request<{ ok: true }>(`orders/${id}/cancel`, { method: 'POST', auth: true }),

}
