import type { ThreeElements } from '@react-three/fiber'

/**
 * Shared mesh helpers for the primitive-built V27.
 *
 * The vehicle is assembled from boxes and cylinders rather than a downloaded model: the V27
 * is deliberately boxy, so the silhouette reads correctly, the page stays free of
 * third-party asset licensing, and nothing is added to the download budget.
 */

/** Keeps the vehicle body readable as a parts list rather than a wall of mesh JSX. */
export function Box({
  args,
  position,
  color,
  emissive,
  metalness = 0.1,
  roughness = 0.6,
}: {
  args: ThreeElements['boxGeometry']['args']
  position: [number, number, number]
  color: string
  emissive?: string
  metalness?: number
  roughness?: number
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 1.6 : 0}
      />
    </mesh>
  )
}
