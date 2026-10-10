import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { dampVector3 } from './damping'

export type Vec3 = readonly [number, number, number]

/** Where the camera looks when a caller does not say otherwise: the vehicle's waistline. */
const DEFAULT_TARGET: Vec3 = [0, 0.55, 0]

/**
 * Eases the camera toward a named viewpoint instead of snapping to it.
 *
 * Both 3D surfaces move the camera between preset angles, so the rig lives here rather than
 * being copied into each one - a duplicated easing constant is exactly the thing that gets
 * tuned in one place and left stale in the other.
 *
 * `instant` exists for `prefers-reduced-motion`: a gliding camera on a full-bleed 3D scene
 * is the most reliable motion trigger on the web, and the information the move carries is
 * "you are now looking at the rear", not the journey.
 */
export function CameraRig({
  position,
  target = DEFAULT_TARGET,
  lambda = 2.4,
  instant = false,
}: {
  position: Vec3
  target?: Vec3
  /** Higher converges faster. Roughly matches the old `delta * 2.4` lerp at 60 Hz. */
  lambda?: number
  instant?: boolean
}) {
  // Held in refs and rewritten each frame so a caller passing a fresh array literal
  // does not allocate a Vector3 per render.
  const goal = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    goal.current.set(position[0], position[1], position[2])
    look.current.set(target[0], target[1], target[2])

    if (instant) {
      state.camera.position.copy(goal.current)
    } else {
      dampVector3(state.camera.position, goal.current, lambda, delta)
    }

    state.camera.lookAt(look.current)
  })

  return null
}
