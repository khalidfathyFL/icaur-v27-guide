import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  DRIVE_MODES,
  infotainmentMenus,
  type DriveMode,
  type InfotainmentControl,
  type InfotainmentMenu,
} from '../../content/infotainment'

export const TEMP_MIN = 16
export const TEMP_MAX = 30
export const FAN_MIN = 0
export const FAN_MAX = 7

export type ControlValue = boolean | string

export type ClimateState = {
  driverTemp: number
  passengerTemp: number
  fan: number
  sync: boolean
  ac: boolean
  frontDefrost: boolean
  rearDefrost: boolean
}

/** Full-screen apps that are not part of the settings tree. */
export type AppId = 'navigation' | 'camera'

export type InfotainmentView =
  | { kind: 'home' }
  | { kind: 'menu'; menuId: string }
  | { kind: 'app'; appId: AppId }

export type InfotainmentState = {
  view: InfotainmentView
  /** Control whose explanation is shown in the side panel. */
  selectedControlId: string | null
  /** Control values keyed by `menuId.controlId`. */
  values: Record<string, ControlValue>
  climate: ClimateState
  driveMode: DriveMode
  /** Camera angle shown by the camera app. */
  cameraView: CameraView
  /** Transient confirmation line, mirroring the car's own on-screen toast. */
  toast: string | null
}

export const CAMERA_VIEWS = ['Rear', 'Front', '540', 'Kerb'] as const
export type CameraView = (typeof CAMERA_VIEWS)[number]

type Action =
  | { type: 'open-menu'; menuId: string }
  | { type: 'open-app'; appId: AppId }
  | { type: 'set-camera-view'; view: CameraView }
  | { type: 'go-home' }
  | { type: 'select-control'; controlId: string }
  | { type: 'set-value'; key: string; value: ControlValue; toast: string }
  | { type: 'run-action'; toast: string }
  | { type: 'adjust-temp'; side: 'driver' | 'passenger'; delta: number }
  | { type: 'adjust-fan'; delta: number }
  | { type: 'toggle-climate'; key: 'sync' | 'ac' | 'frontDefrost' | 'rearDefrost' }
  | { type: 'set-drive-mode'; mode: DriveMode }
  | { type: 'dismiss-toast' }

export const controlKey = (menuId: string, controlId: string) => `${menuId}.${controlId}`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Seeds every control from its documented default so the screen opens in a realistic state. */
function initialValues(): Record<string, ControlValue> {
  const values: Record<string, ControlValue> = {}

  for (const menu of infotainmentMenus) {
    for (const control of menu.controls) {
      const key = controlKey(menu.id, control.id)
      if (control.control.kind === 'toggle') {
        values[key] = control.control.defaultOn
      } else if (control.control.kind === 'choice') {
        values[key] = control.control.options[control.control.defaultIndex]
      }
    }
  }

  return values
}

const initialState: InfotainmentState = {
  view: { kind: 'home' },
  selectedControlId: null,
  values: initialValues(),
  climate: {
    driverTemp: 22,
    passengerTemp: 22,
    fan: 3,
    sync: true,
    ac: true,
    frontDefrost: false,
    rearDefrost: false,
  },
  driveMode: 'Comfort',
  cameraView: '540',
  toast: null,
}

function reducer(state: InfotainmentState, action: Action): InfotainmentState {
  switch (action.type) {
    case 'open-menu': {
      const menu = infotainmentMenus.find((item) => item.id === action.menuId)
      if (!menu) return state
      return {
        ...state,
        view: { kind: 'menu', menuId: menu.id },
        selectedControlId: menu.controls[0]?.id ?? null,
        toast: null,
      }
    }

    case 'open-app':
      return { ...state, view: { kind: 'app', appId: action.appId }, selectedControlId: null, toast: null }

    case 'set-camera-view':
      return { ...state, cameraView: action.view, toast: `Camera: ${action.view}` }

    case 'go-home':
      return { ...state, view: { kind: 'home' }, selectedControlId: null, toast: null }

    case 'select-control':
      return { ...state, selectedControlId: action.controlId }

    case 'set-value':
      return {
        ...state,
        values: { ...state.values, [action.key]: action.value },
        toast: action.toast,
      }

    case 'run-action':
      return { ...state, toast: action.toast }

    case 'adjust-temp': {
      const { climate } = state
      const next = clamp(
        (action.side === 'driver' ? climate.driverTemp : climate.passengerTemp) + action.delta,
        TEMP_MIN,
        TEMP_MAX,
      )
      // Sync mirrors the driver setting to the passenger zone, as in the car.
      if (climate.sync) {
        return { ...state, climate: { ...climate, driverTemp: next, passengerTemp: next } }
      }
      return {
        ...state,
        climate:
          action.side === 'driver'
            ? { ...climate, driverTemp: next }
            : { ...climate, passengerTemp: next },
      }
    }

    case 'adjust-fan':
      return {
        ...state,
        climate: { ...state.climate, fan: clamp(state.climate.fan + action.delta, FAN_MIN, FAN_MAX) },
      }

    case 'toggle-climate': {
      const climate = { ...state.climate, [action.key]: !state.climate[action.key] }
      // Turning sync on immediately matches the passenger zone to the driver's.
      if (action.key === 'sync' && climate.sync) climate.passengerTemp = climate.driverTemp
      return { ...state, climate }
    }

    case 'set-drive-mode':
      return { ...state, driveMode: action.mode, toast: `Drive mode: ${action.mode}` }

    case 'dismiss-toast':
      return { ...state, toast: null }

    default:
      return state
  }
}

const TOAST_MS = 2600

export function useInfotainment() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!state.toast) return
    const timer = window.setTimeout(() => dispatch({ type: 'dismiss-toast' }), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [state.toast])

  const activeMenu: InfotainmentMenu | null = useMemo(() => {
    if (state.view.kind !== 'menu') return null
    const { menuId } = state.view
    return infotainmentMenus.find((menu) => menu.id === menuId) ?? null
  }, [state.view])

  const activeControl: InfotainmentControl | null = useMemo(
    () => activeMenu?.controls.find((control) => control.id === state.selectedControlId) ?? null,
    [activeMenu, state.selectedControlId],
  )

  const valueOf = useCallback(
    (menuId: string, controlId: string) => state.values[controlKey(menuId, controlId)],
    [state.values],
  )

  return {
    state,
    dispatch,
    activeMenu,
    activeControl,
    valueOf,
    driveModes: DRIVE_MODES,
  }
}
