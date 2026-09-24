import { handleAuth } from './_routes/auth'
import { handleDealers } from './_routes/dealers'
import { handlePosts } from './_routes/posts'
import { handlePricing } from './_routes/pricing'
import { handleSuggestions } from './_routes/suggestions'
import { HttpError, corsHeaders, errorResponse, pathSegments } from './_lib/http'

export const config = { runtime: 'nodejs' }

type RouteHandler = (request: Request, segments: string[]) => Promise<Response>

const ROUTES: Record<string, RouteHandler> = {
  auth: handleAuth,
  posts: handlePosts,
  suggestions: handleSuggestions,
  dealers: handleDealers,
  pricing: handlePricing,
}

/**
 * A single catch-all function rather than a file per endpoint: Vercel's Hobby
 * plan caps how many serverless functions a deployment may have, and one
 * function also means one warm Mongo pool instead of several.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  try {
    const segments = pathSegments(request)
    const route = ROUTES[segments[0] ?? '']

    if (!route) throw new HttpError(404, 'Unknown endpoint.')

    return await route(request, segments.slice(1))
  } catch (error) {
    return errorResponse(request, error)
  }
}
