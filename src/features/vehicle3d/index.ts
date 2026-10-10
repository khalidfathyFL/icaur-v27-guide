/**
 * Shared kit for the site's 3D surfaces.
 *
 * Everything that imports three.js lives under `src/features/`, so the boundary between the
 * main bundle and the lazily-loaded 3D chunk stays obvious to anyone adding an import. The
 * app shell - `src/app/routes.tsx`, `src/components/SiteHeader.tsx` - must never *value*
 * import from here: `import type` is erased and safe, but a value import silently pulls
 * three.js into the entry chunk and the build still succeeds.
 */

export { CameraRig, type Vec3 } from './CameraRig'
export { Box } from './primitives'
export { DAMP_EPSILON, dampScalar, dampVector3 } from './damping'
