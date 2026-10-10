import { handleAuth } from './_routes/auth'
import { handleDealers } from './_routes/dealers'
import { handlePosts } from './_routes/posts'
import { handlePricing } from './_routes/pricing'
import { handleSuggestions } from './_routes/suggestions'
import { HttpError, corsHeaders, errorResponse, json, pathSegments } from './_lib/http'

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

    // Reports whether the function itself is healthy and which settings are
    // present, without ever echoing their values.
    if (segments[0] === 'health') {
      return json(request, {
        ok: true,
        env: {
          MONGODB_URI: Boolean(process.env.MONGODB_URI),
          MONGODB_DB: Boolean(process.env.MONGODB_DB),
          JWT_SECRET: Boolean(process.env.JWT_SECRET),
          ALLOWED_ORIGINS: Boolean(process.env.ALLOWED_ORIGINS),
        },
      })
    }

    const route = ROUTES[segments[0] ?? '']

    if (!route) throw new HttpError(404, 'Unknown endpoint.')

    return await route(request, segments.slice(1))
  } catch (error) {
    return errorResponse(request, error)
  }
}
