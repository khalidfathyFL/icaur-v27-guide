import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Car,
  CircleDot,
  Contrast,
  Gauge,
  Info,
  Lightbulb,
  Map,
  Mic,
  Music,
  Phone,
  Radar,
  Settings,
  Sparkles,
  Video,
  Volume2,
  Wifi,
  Wrench,
  Zap,
  PanelTop,
} from 'lucide-react'
import type { AppId, MenuIcon } from '../../content/infotainment'

export type Icon = typeof Car

export const MENU_ICONS: Record<MenuIcon, Icon> = {
  car: Car,
  wheel: CircleDot,
  radar: Radar,
  lightbulb: Lightbulb,
  energy: Zap,
  mic: Mic,
  display: Contrast,
  volume: Volume2,
  wifi: Wifi,
  service: Wrench,
  info: Info,
}

export const APP_ICONS: Record<AppId, Icon> = {
  settings: Settings,
  navigation: Map,
  camera: Camera,
  recorder: Video,
  scenes: Sparkles,
  media: Music,
  phone: Phone,
  windows: PanelTop,
  tpms: Gauge,
  energy: Zap,
}

/** Clock that ticks like the car's, so the screen never looks like a static mockup. */
export function useClock(hour12: boolean) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12 })
}

/**
 * Fires `onHold` after the pointer stays down for `ms`, the way the car's
 * long-press works. A quick tap fires `onTap` instead.
 */
export function useLongPress(onHold: () => void, onTap?: () => void, ms = 600) {
  const timer = useRef<number | null>(null)
  const held = useRef(false)

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => cancel, [])

  return {
    onPointerDown: () => {
      held.current = false
      cancel()
      timer.current = window.setTimeout(() => {
        held.current = true
        onHold()
      }, ms)
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onClick: () => {
      if (!held.current) onTap?.()
      held.current = false
    },
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
  }
}
