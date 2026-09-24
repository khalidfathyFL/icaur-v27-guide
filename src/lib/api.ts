import { readStored, writeStored } from './storage'
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
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type ApiUser = {
  id: string
  email: string
  name: string
  role: Role
  status?: 'active' | 'blocked'
  createdAt?: string
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

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const getToken = () => readStored(TOKEN_KEY)
export const setToken = (token: string) => writeStored(TOKEN_KEY, token)
export const clearToken = () => writeStored(TOKEN_KEY, '')

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
    response = await fetch(`${BASE_URL}/api/${path}`, {
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
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: ApiUser; token: string }>('auth/register', { method: 'POST', body: input }),

  login: (input: { email: string; password: string }) =>
    request<{ user: ApiUser; token: string }>('auth/login', { method: 'POST', body: input }),

  me: () => request<{ user: ApiUser }>('auth/me', { auth: true }),

  listUsers: () => request<{ users: ApiUser[] }>('auth/users', { auth: true }),

  updateUser: (id: string, input: { role?: Role; status?: 'active' | 'blocked' }) =>
    request<{ ok: true }>(`auth/users/${id}`, { method: 'PATCH', body: input, auth: true }),

  /* ---------- posts ---------- */

  listPosts: (params: { mine?: boolean; status?: ReviewStatus | 'all' } = {}) => {
    const query = new URLSearchParams()
    if (params.mine) query.set('mine', '1')
    if (params.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query}` : ''
    return request<{ posts: ApiPost[] }>(`posts${suffix}`, { auth: Boolean(params.mine || params.status) })
  },

  readPost: (idOrSlug: string) => request<{ post: ApiPost }>(`posts/${idOrSlug}`),

  createPost: (input: { title: Localized; body: Localized; excerpt?: Localized }) =>
    request<{ post: ApiPost }>('posts', { method: 'POST', body: input, auth: true }),

  updatePost: (id: string, input: { title?: Localized; body?: Localized; excerpt?: Localized }) =>
    request<{ post: ApiPost }>(`posts/${id}`, { method: 'PATCH', body: input, auth: true }),

  reviewPost: (id: string, input: { status: 'approved' | 'rejected'; note?: string }) =>
    request<{ ok: true }>(`posts/${id}/review`, { method: 'POST', body: input, auth: true }),

  deletePost: (id: string) => request<{ ok: true }>(`posts/${id}`, { method: 'DELETE', auth: true }),

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
}
