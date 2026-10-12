import { handleAuth } from './_routes/auth.js'
import { handleCenterReviews } from './_routes/centerReviews.js'
import { handleCenters } from './_routes/centers.js'
import { handleComments } from './_routes/comments.js'
import { handleDealers } from './_routes/dealers.js'
import { handlePartReviews } from './_routes/partReviews.js'
import { handleParts } from './_routes/parts.js'
import { handlePosts } from './_routes/posts.js'
import { handlePricing } from './_routes/pricing.js'
import { handleRoles } from './_routes/roles.js'
import { handleSuggestions } from './_routes/suggestions.js'
import { handleUploads } from './_routes/uploads.js'
import { HttpError, corsHeaders, errorResponse, json, pathSegments } from './_lib/http.js'

type RouteHandler = (request: Request, segments: string[]) => Promise<Response>

const ROUTES: Record<string, RouteHandler> = {
  auth: handleAuth,
  posts: handlePosts,
  comments: handleComments,
  suggestions: handleSuggestions,
  dealers: handleDealers,
  pricing: handlePricing,
  roles: handleRoles,
  parts: handleParts,
  'part-reviews': handlePartReviews,
  centers: handleCenters,
  'center-reviews': handleCenterReviews,
  uploads: handleUploads,
}

/**
 * A single catch-all function rather than a file per endpoint: Vercel's Hobby
 * plan caps how many serverless functions a deployment may have, and one
 * function also means one warm Mongo pool instead of several.
 *
 * Exported as an object with a `fetch` method, which is what tells Vercel to
 * use the Web handler signature. A bare default function is read as the
 * classic Node `(req, res)` handler, where `request.headers.get` does not
 * exist and `request.url` is only a path.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    try {
      const segments = pathSegments(request)

      // Reports whether the function is alive and which settings are present,
      // without ever echoing their values.
      if (segments[0] === 'health') {
        return json(request, {
          ok: true,
          env: {
            MONGODB_URI: Boolean(process.env.MONGODB_URI),
            MONGODB_DB: Boolean(process.env.MONGODB_DB),
            JWT_SECRET: Boolean(process.env.JWT_SECRET),
            ALLOWED_ORIGINS: Boolean(process.env.ALLOWED_ORIGINS),
            BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
          },
        })
      }

      const route = ROUTES[segments[0] ?? '']
      if (!route) throw new HttpError(404, 'Unknown endpoint.')

      return await route(request, segments.slice(1))
    } catch (error) {
      return errorResponse(request, error)
    }
  },
}
