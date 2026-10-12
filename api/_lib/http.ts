/** Request/response helpers shared by every route. */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * The site is served from GitHub Pages while the API runs on Vercel, so every
 * browser call is cross-origin. Only the origins we publish from are allowed;
 * `ALLOWED_ORIGINS` is a comma-separated list in the Vercel env.
 */
function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()) ?? []
  return [...configured, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean)
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }

  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  })
}

export function errorResponse(request: Request, error: unknown): Response {
  if (error instanceof HttpError) {
    return json(request, { error: error.message }, error.status)
  }

  // Never leak a driver message or connection string to the client.
  console.error('Unhandled API error:', error)
  return json(request, { error: 'Something went wrong. Please try again.' }, 500)
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'Expected a JSON body.')
  }
}

/** A base keeps this working even if the runtime hands us a path-only url. */
function requestUrl(request: Request): URL {
  const host = request.headers.get('host') ?? 'localhost'
  return new URL(request.url, `https://${host}`)
}

/**
 * The route, as segments: `/api/router?p=posts/123/review` becomes
 * `['posts', '123', 'review']`.
 *
 * Vercel's router on this project only delivers single-segment paths to a
 * function, so the real route travels in `p` rather than in the path. The
 * pathname is still read as a fallback, which keeps local `vercel dev` and
 * any future host with working catch-all routing working unchanged.
 */
export function pathSegments(request: Request): string[] {
  const url = requestUrl(request)
  const routed = url.searchParams.get('p')
  const source = routed ?? url.pathname.replace(/^\/api\/?/, '')
  return source.split('/').filter(Boolean)
}

export function searchParams(request: Request): URLSearchParams {
  return requestUrl(request).searchParams
}
