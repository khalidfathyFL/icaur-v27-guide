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
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
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

/** Splits `/api/posts/123/review` into `['posts', '123', 'review']`. */
export function pathSegments(request: Request): string[] {
  const { pathname } = new URL(request.url)
  return pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
}

export function searchParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams
}
