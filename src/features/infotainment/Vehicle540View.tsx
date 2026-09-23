import { useMemo, useRef } from 'react'
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { CameraView } from './useInfotainment'

/**
 * A 3D stand-in for the V27's surround-view camera. Real camera frames are not
 * published here, so the scene shows the vehicle, the angle and the proximity
 * zones the system draws - which is what an owner actually reads off the screen.
 *
 * The vehicle is built from primitives rather than a downloaded model: the V27
 * is deliberately boxy, so the silhouette reads correctly and the page stays
 * free of third-party asset licensing.
 */

const BODY = '#2f3d4d'
const BODY_LIGHT = '#3d4e61'
const GLASS = '#101a24'
const ACCENT = '#4ea3ff'
const TIRE = '#14191f'

/** Camera placement per angle, in metres. */
const CAMERA_POSITIONS: Record<CameraView, [number, number, number]> = {
  Rear: [0, 2.2, -6.4],
  Front: [0, 2.2, 6.4],
  '540': [4.6, 5.2, 5.6],
  Kerb: [5.4, 1.5, 0.6],
}

export function Vehicle540View({ view }: { view: CameraView }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: CAMERA_POSITIONS['540'], fov: 42 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0c1218']} />
      <fog attach="fog" args={['#0c1218', 12, 26]} />

      <CameraRig view={view} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.15} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color={ACCENT} />

      <Vehicle />
      <ProximityZones view={view} />
      <GroundGrid />

      <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={14} blur={2.4} far={4} />

      <OrbitControls
        enablePan={false}
        minDistance={4.5}
        maxDistance={11}
        // Stay above the ground plane, like a real surround view.
        maxPolarAngle={Math.PI / 2.15}
      />
    </Canvas>
  )
}

/** Eases the camera toward the selected angle instead of snapping. */
function CameraRig({ view }: { view: CameraView }) {
  const target = useMemo(() => new THREE.Vector3(...CAMERA_POSITIONS[view]), [view])

  useFrame((state, delta) => {
    state.camera.position.lerp(target, Math.min(1, delta * 2.4))
    state.camera.lookAt(0, 0.55, 0)
  })

  return null
}

function Vehicle() {
  return (
    <group position={[0, 0, 0]}>
      {/* lower body */}
      <Box args={[1.95, 0.72, 4.6]} position={[0, 0.62, 0]} color={BODY} />
      {/* upper body / greenhouse */}
      <Box args={[1.86, 0.78, 3.5]} position={[0, 1.36, -0.12]} color={BODY_LIGHT} />
      {/* glass band */}
      <Box args={[1.88, 0.5, 3.2]} position={[0, 1.44, -0.12]} color={GLASS} metalness={0.2} roughness={0.15} />
      {/* roof */}
      <Box args={[1.9, 0.12, 3.5]} position={[0, 1.78, -0.12]} color={BODY} />
      {/* roof rails */}
      <Box args={[0.08, 0.08, 3.1]} position={[-0.8, 1.87, -0.12]} color="#1b232c" />
      <Box args={[0.08, 0.08, 3.1]} position={[0.8, 1.87, -0.12]} color="#1b232c" />

      {/* front light bar */}
      <Box args={[1.72, 0.1, 0.06]} position={[0, 0.92, 2.32]} color={ACCENT} emissive={ACCENT} />
      {/* rear light bar */}
      <Box args={[1.72, 0.1, 0.06]} position={[0, 0.98, -2.32]} color="#ff5f56" emissive="#ff5f56" />

      {/* tailgate-mounted spare wheel, the V27's signature */}
      <mesh position={[0.18, 1.05, -2.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.44, 0.44, 0.22, 28]} />
        <meshStandardMaterial color={TIRE} roughness={0.85} />
      </mesh>

      {[
        [-0.99, 1.45],
        [0.99, 1.45],
        [-0.99, -1.5],
        [0.99, -1.5],
      ].map(([x, z]) => (
        <Wheel key={`${x}-${z}`} position={[x, 0.42, z]} />
      ))}
    </group>
  )
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.28, 26]} />
        <meshStandardMaterial color={TIRE} roughness={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.25, 0.25, 0.3, 20]} />
        <meshStandardMaterial color="#8b98a6" metalness={0.65} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** The green/amber/red proximity bands the parking system overlays. */
function ProximityZones({ view }: { view: CameraView }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    // Gentle pulse so the overlay reads as live sensor data.
    const pulse = 0.72 + Math.sin(state.clock.elapsedTime * 2.2) * 0.16
    group.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = pulse * (material.userData.base as number)
    })
  })

  // Front angle shows the zones ahead of the car, every other angle behind it.
  const direction = view === 'Front' ? 1 : -1

  const bands: { z: number; width: number; color: string; base: number }[] = [
    { z: 2.9, width: 2.1, color: '#4ade80', base: 0.55 },
    { z: 3.5, width: 2.5, color: '#fbbf24', base: 0.42 },
    { z: 4.1, width: 2.9, color: '#f87171', base: 0.32 },
  ]

  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      {bands.map((band) => (
        <mesh key={band.color} position={[0, direction * band.z, 0]}>
          <planeGeometry args={[band.width, 0.42]} />
          <meshBasicMaterial
            color={band.color}
            transparent
            opacity={band.base}
            side={THREE.DoubleSide}
            depthWrite={false}
            onUpdate={(material) => {
              material.userData.base = band.base
            }}
          />
        </mesh>
      ))}
    </group>
  )
}

function GroundGrid() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#111922" roughness={1} />
      </mesh>
      <gridHelper args={[30, 30, '#1e2a36', '#161f28']} position={[0, 0, 0]} />
    </>
  )
}

/** Small helper so the vehicle body stays readable as a parts list. */
function Box({
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
