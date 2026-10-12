import { ApiError } from './api'

/** The server's own wording when it gave one, otherwise the caller's fallback. */
export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback
}
