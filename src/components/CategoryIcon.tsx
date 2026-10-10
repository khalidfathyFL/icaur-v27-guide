import {
  Armchair,
  BatteryCharging,
  CarFront,
  Gauge,
  LifeBuoy,
  MonitorSmartphone,
  Package,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from '../content/types'

const ICONS: Record<CategoryId, LucideIcon> = {
  screen: MonitorSmartphone,
  adas: ShieldCheck,
  energy: BatteryCharging,
  wheels: LifeBuoy,
  comfort: Armchair,
  exterior: CarFront,
  storage: Package,
  driving: Gauge,
  maintenance: Wrench,
  troubleshooting: TriangleAlert,
}

export function CategoryIcon({ id, size = 22 }: { id: CategoryId; size?: number }) {
  const Icon = ICONS[id] ?? Wrench
  return <Icon size={size} aria-hidden="true" />
}
