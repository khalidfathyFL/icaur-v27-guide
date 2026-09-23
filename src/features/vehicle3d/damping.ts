import * as THREE from 'three'

/**
 * Frame-rate independent smoothing shared by every 3D surface on the site.
 *
 * The obvious way to ease a value toward a target is `current.lerp(target, delta * k)`,
 * and it is subtly wrong: the step is proportional to the frame time, so the same motion
 * settles faster on a 144 Hz display than on a 60 Hz one. `THREE.MathUtils.damp` is the
 * exponential form, `lerp(x, y, 1 - exp(-lambda * dt))`, which converges at the same rate
 * in wall-clock time whatever the frame rate.
 *
 * drei does not re-export `easing`/maath in the version pinned here, and `maath` is only a
 * transitive dependency, so importing it directly would rely on npm hoisting. `MathUtils`
 * ships with three and is the right primitive anyway.
 */

/** Below this distance a value counts as settled, so demand-mode rendering can stop. */
export const DAMP_EPSILON = 1e-4

/**
 * Eases `current` toward `target` in place.
 * Returns true while still moving, which is the signal to keep requesting frames.
 */
export function dampVector3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  delta: number,
): boolean {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta)
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta)
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta)

  return current.distanceToSquared(target) > DAMP_EPSILON * DAMP_EPSILON
}

/** Scalar form, for hinge angles and slide offsets. */
export function dampScalar(current: number, target: number, lambda: number, delta: number): number {
  return THREE.MathUtils.damp(current, target, lambda, delta)
}
