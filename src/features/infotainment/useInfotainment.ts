import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  DEFAULT_DOCK_APPS,
  infotainmentMenus,
  recorderSettings,
  sceneModes,
  type AppId,
  type ControlSpec,
  type InfotainmentControl,
  type InfotainmentMenu,
  type RecorderTab,
  type SceneId,
  type SceneMode,
} from '../../content/infotainment'

export const TEMP_MIN = 16
export const TEMP_MAX = 30
export const FAN_MIN = 0
export const FAN_MAX = 7
export const SEAT_LEVEL_MAX = 3

export type ControlValue = boolean | string | number

export type ClimateState = {
  driverTemp: number
  passengerTemp: number
  fan: number
  sync: boolean
  ac: boolean
  frontDefrost: boolean
  rearDefrost: boolean
}

/** Seat heating and ventilation share one button per seat; only one runs at a time. */
export type SeatState = { mode: 'off' | 'heat' | 'vent'; level: number }

/** Apps that take over the stage. Settings has its own view because it carries a menu. */
export type StageApp = Exclude<AppId, 'settings'>

export type InfotainmentView =
  | { kind: 'home' }
  | { kind: 'settings'; menuId: string }
  | { kind: 'app'; appId: StageApp }
  | { kind: 'app-center' }
  | { kind: 'scene'; sceneId: SceneId }

/** Pop-ups that hang off the status bar or the dock. */
export type Panel =
  | 'access'
  | 'info'
  | 'fault'
  | 'connection'
  | 'network'
  | 'climate'
  | 'seat-driver'
  | 'seat-passenger'
  | 'volume'

/** Full-screen states that sit on top of everything else. */
export type Overlay = 'screensaver' | 'screen-cleaning' | 'power-off'

export type Gear = 'P' | 'R' | 'N' | 'D'

/** The parts of the car the screen depends on but cannot set itself. */
export type SimulatedCar = {
  battery: number
  gear: Gear
  chargingGun: boolean
  usbDrive: boolean
}

export type WindowId = 'fl' | 'fr' | 'rl' | 'rr'

export type InfotainmentState = {
  view: InfotainmentView
  /** Control whose explanation is shown in the side panel. */
  selectedControlId: string | null
  /** Settings, scene-mode and recorder values keyed by `group.id`. */
  values: Record<string, ControlValue>
  climate: ClimateState
  seats: { driver: SeatState; passenger: SeatState }
  /** Window openings, 0 closed to 100 fully open. */
  windows: Record<WindowId, number>
  mirrorsFolded: boolean
  cameraView: CameraView
  panel: Panel | null
  controlCenter: boolean
  overlay: Overlay | null
  /** The scene mode that is currently running, if any. */
  activeScene: SceneId | null
  car: SimulatedCar
  recorder: { consented: boolean; recording: boolean; photos: number; clips: number; tab: RecorderTab }
  mediaPlaying: boolean
  dockApps: AppId[]
  /** Dock slot waiting for a replacement app after a long press. */
  replacingSlot: number | null
  /** Transient confirmation line, mirroring the car's own on-screen toast. */
  toast: string | null
}

export const CAMERA_VIEWS = ['Rear', 'Front', '540', 'Kerb'] as const
export type CameraView = (typeof CAMERA_VIEWS)[number]

type Action =
  | { type: 'open-settings'; menuId?: string; controlId?: string }
  | { type: 'open-app'; appId: AppId }
  | { type: 'open-app-center' }
  | { type: 'open-scene'; sceneId: SceneId }
  | { type: 'go-home' }
  | { type: 'set-camera-view'; view: CameraView }
  | { type: 'select-control'; controlId: string }
  | { type: 'set-value'; key: string; value: ControlValue; toast?: string }
  | { type: 'run-action'; toast: string }
  | { type: 'toggle-panel'; panel: Panel }
  | { type: 'close-panel' }
  | { type: 'toggle-control-center' }
  | { type: 'set-overlay'; overlay: Overlay | null }
  | { type: 'adjust-temp'; side: 'driver' | 'passenger'; delta: number }
  | { type: 'adjust-fan'; delta: number }
  | { type: 'toggle-climate'; key: 'sync' | 'ac' | 'frontDefrost' | 'rearDefrost' }
  | { type: 'set-seat'; side: 'driver' | 'passenger'; seat: SeatState }
  | { type: 'set-window'; id: WindowId; value: number }
  | { type: 'all-windows'; value: number; toast: string }
  | { type: 'toggle-mirrors' }
  | { type: 'toggle-lock' }
  | { type: 'toggle-fuel-door' }
  | { type: 'toggle-airbag' }
  | { type: 'start-scene'; sceneId: SceneId }
  | { type: 'exit-scene'; toast?: string }
  | { type: 'set-car'; car: Partial<SimulatedCar> }
  | { type: 'recorder-consent' }
  | { type: 'recorder-tab'; tab: RecorderTab }
  | { type: 'toggle-recording' }
  | { type: 'take-photo' }
  | { type: 'toggle-media' }
  | { type: 'start-replace'; slot: number }
  | { type: 'replace-dock-app'; appId: AppId }
  | { type: 'dismiss-toast' }

export const controlKey = (menuId: string, controlId: string) => `${menuId}.${controlId}`
export const sceneKey = (sceneId: SceneId, optionId: string) => `scene-${sceneId}.${optionId}`
export const recorderKey = (id: string) => `recorder.${id}`

/** Keys for settings the screen reacts to in more than one place. */
export const KEYS = {
  doorLock: controlKey('body-control', 'door-lock'),
  passengerLock: controlKey('body-control', 'passenger-lock'),
  fuelDoor: controlKey('energy', 'fuel-cap'),
  airbag: controlKey('safety-service', 'passenger-airbag'),
  theme: controlKey('display', 'theme'),
  brightness: controlKey('display', 'brightness'),
  autoBrightness: controlKey('display', 'auto-brightness'),
  screensaver: controlKey('display', 'screensaver'),
  timeFormat: controlKey('display', 'time-display'),
  rangeUnit: controlKey('display', 'range-unit'),
  tpmsUnit: controlKey('safety-service', 'tpms-unit'),
  headlamp: controlKey('lighting', 'headlamp'),
  mediaVolume: controlKey('sound', 'vol-media'),
  wifi: controlKey('connections', 'wifi'),
  bluetooth: controlKey('connections', 'bluetooth'),
  hotspot: controlKey('connections', 'hotspot'),
  profile: controlKey('body-control', 'driving-habit'),
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function defaultValue(spec: ControlSpec): ControlValue | undefined {
  if (spec.kind === 'toggle') return spec.defaultOn
  if (spec.kind === 'choice') return spec.options[spec.defaultIndex]
  if (spec.kind === 'slider') return spec.defaultValue
  return undefined
}

/** Seeds every control from its documented default so the screen opens in a realistic state. */
function initialValues(): Record<string, ControlValue> {
  const values: Record<string, ControlValue> = {}
  const seed = (key: string, spec: ControlSpec) => {
    const value = defaultValue(spec)
    if (value !== undefined) values[key] = value
  }

  for (const menu of infotainmentMenus) {
    for (const control of menu.controls) seed(controlKey(menu.id, control.id), control.control)
  }
  for (const scene of sceneModes) {
    for (const option of scene.options) seed(sceneKey(scene.id, option.id), option.control)
  }
  for (const setting of recorderSettings) seed(recorderKey(setting.id), setting.control)

  return values
}

const CLOSED: Record<WindowId, number> = { fl: 0, fr: 0, rl: 0, rr: 0 }
const VENTED: Record<WindowId, number> = { fl: 10, fr: 10, rl: 10, rr: 10 }

const initialState: InfotainmentState = {
  view: { kind: 'home' },
  selectedControlId: null,
  values: initialValues(),
  climate: {
    driverTemp: 23,
    passengerTemp: 23.5,
    fan: 3,
    sync: false,
    ac: true,
    frontDefrost: false,
    rearDefrost: false,
  },
  seats: { driver: { mode: 'off', level: 0 }, passenger: { mode: 'off', level: 0 } },
  windows: CLOSED,
  mirrorsFolded: false,
  cameraView: '540',
  panel: null,
  controlCenter: false,
  overlay: null,
  activeScene: null,
  car: { battery: 74, gear: 'P', chargingGun: false, usbDrive: true },
  recorder: { consented: false, recording: false, photos: 0, clips: 6, tab: 'Real-time Screen' },
  mediaPlaying: false,
  dockApps: DEFAULT_DOCK_APPS,
  replacingSlot: null,
  toast: null,
}

export const sceneById = (id: SceneId): SceneMode => sceneModes.find((scene) => scene.id === id)!

/** Why the car would refuse to start a scene mode right now, in its own on-screen words. */
export function sceneBlocker(scene: SceneMode, car: SimulatedCar): string | null {
  const needs = scene.requires
  if (!needs) return null
  if (car.battery < needs.minBattery) return `Battery must be at least ${needs.minBattery}%`
  if (needs.gearP && car.gear !== 'P') return 'Shift into P first'
  if (needs.noChargingGun && car.chargingGun) return 'Remove the charging/discharging gun first'
  return null
}

/** Leaving a view also closes anything floating over it. */
const navigate = (state: InfotainmentState, view: InfotainmentView): InfotainmentState => ({
  ...state,
  view,
  selectedControlId: null,
  panel: null,
  controlCenter: false,
  replacingSlot: null,
  toast: null,
})

function exitScene(state: InfotainmentState, toast: string, vent = false): InfotainmentState {
  return {
    ...state,
    activeScene: null,
    windows: vent ? VENTED : state.windows,
    toast,
  }
}

function reducer(state: InfotainmentState, action: Action): InfotainmentState {
  switch (action.type) {
    case 'open-settings': {
      // With no menu named, reopen the one already showing, or the first.
      const currentId = state.view.kind === 'settings' ? state.view.menuId : undefined
      const menu =
        infotainmentMenus.find((item) => item.id === (action.menuId ?? currentId)) ?? infotainmentMenus[0]
      return {
        ...navigate(state, { kind: 'settings', menuId: menu.id }),
        selectedControlId: action.controlId ?? menu.controls[0]?.id ?? null,
      }
    }

    case 'open-app': {
      if (state.replacingSlot !== null) return reducer(state, { type: 'replace-dock-app', appId: action.appId })
      if (action.appId === 'settings') return reducer(state, { type: 'open-settings' })
      return navigate(state, { kind: 'app', appId: action.appId })
    }

    case 'open-app-center':
      return { ...navigate(state, { kind: 'app-center' }), replacingSlot: state.replacingSlot }

    case 'open-scene':
      return navigate(state, { kind: 'scene', sceneId: action.sceneId })

    case 'go-home':
      return navigate(state, { kind: 'home' })

    case 'set-camera-view':
      return { ...state, cameraView: action.view, toast: `Camera: ${action.view}` }

    case 'select-control':
      return { ...state, selectedControlId: action.controlId }

    case 'set-value': {
      const next = {
        ...state,
        values: { ...state.values, [action.key]: action.value },
        toast: action.toast ?? state.toast,
      }
      // Locking anywhere honours "Auto fold when lock", like the real car.
      const autoFold = state.values[controlKey('body-control', 'mirror-auto-fold')] === true
      if (action.key === KEYS.doorLock && autoFold) return { ...next, mirrorsFolded: action.value === true }
      return next
    }

    case 'run-action':
      return { ...state, toast: action.toast }

    case 'toggle-panel':
      return { ...state, panel: state.panel === action.panel ? null : action.panel, controlCenter: false }

    case 'close-panel':
      return { ...state, panel: null }

    case 'toggle-control-center':
      return { ...state, controlCenter: !state.controlCenter, panel: null }

    case 'set-overlay':
      return { ...state, overlay: action.overlay, controlCenter: false, panel: null }

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

    case 'set-seat':
      return { ...state, seats: { ...state.seats, [action.side]: action.seat } }

    case 'set-window':
      return { ...state, windows: { ...state.windows, [action.id]: clamp(action.value, 0, 100) } }

    case 'all-windows':
      return {
        ...state,
        windows: { fl: action.value, fr: action.value, rl: action.value, rr: action.value },
        toast: action.toast,
      }

    case 'toggle-mirrors':
      return {
        ...state,
        mirrorsFolded: !state.mirrorsFolded,
        toast: state.mirrorsFolded ? 'Mirrors unfolded' : 'Mirrors folded',
      }

    case 'toggle-lock': {
      const locked = !state.values[KEYS.doorLock]
      return reducer(state, {
        type: 'set-value',
        key: KEYS.doorLock,
        value: locked,
        toast: locked ? 'Vehicle locked' : 'Vehicle unlocked',
      })
    }

    case 'toggle-fuel-door': {
      const open = !state.values[KEYS.fuelDoor]
      return reducer(state, {
        type: 'set-value',
        key: KEYS.fuelDoor,
        value: open,
        toast: open ? 'Fuel filler door opened' : 'Fuel filler door closed',
      })
    }

    case 'toggle-airbag': {
      const on = !state.values[KEYS.airbag]
      return reducer(state, {
        type: 'set-value',
        key: KEYS.airbag,
        value: on,
        toast: on ? 'Passenger airbag ON' : 'Passenger airbag OFF',
      })
    }

    case 'start-scene': {
      const scene = sceneById(action.sceneId)
      const blocker = sceneBlocker(scene, state.car)
      if (blocker) return { ...state, toast: `${scene.name} unavailable: ${blocker}` }

      const values = { ...state.values }
      let { car, windows, mirrorsFolded } = state

      if (scene.id === 'nap' || scene.id === 'camping') values[KEYS.doorLock] = true
      if (scene.id === 'camping') windows = CLOSED
      if (scene.id === 'car-wash') {
        const movable = values[sceneKey('car-wash', 'type')] === 'Movable car wash'
        car = { ...car, gear: movable ? 'N' : 'P' }
        windows = CLOSED
        mirrorsFolded = true
        values[KEYS.fuelDoor] = false
      }

      return {
        ...state,
        values,
        car,
        windows,
        mirrorsFolded,
        activeScene: scene.id,
        controlCenter: false,
        panel: null,
        toast: `${scene.name} on`,
      }
    }

    case 'exit-scene':
      return state.activeScene
        ? exitScene(state, action.toast ?? `${sceneById(state.activeScene).name} exited`)
        : state

    case 'set-car': {
      const car = { ...state.car, ...action.car }
      // Pulling the USB drive out stops the recorder, which has nowhere to write.
      const recorder = car.usbDrive ? state.recorder : { ...state.recorder, recording: false }
      const next = { ...state, car, recorder }
      if (!state.activeScene) return next

      const scene = sceneById(state.activeScene)
      if (scene.exitBelow !== undefined && car.battery < scene.exitBelow) {
        const vent = scene.id === 'camping' || scene.id === 'pet'
        return exitScene(next, `Battery too low: ${scene.name} exited`, vent)
      }
      if (action.car.gear && action.car.gear !== state.car.gear) {
        if (scene.id === 'pet') return exitScene(next, 'Gear shifted: Pet mode exited')
        if (scene.id === 'car-wash' && action.car.gear === 'P') return exitScene(next, 'Shifted to P: Car wash mode exited')
      }
      return next
    }

    case 'recorder-consent':
      return { ...state, recorder: { ...state.recorder, consented: true } }

    case 'recorder-tab':
      return { ...state, recorder: { ...state.recorder, tab: action.tab } }

    case 'toggle-recording': {
      if (!state.car.usbDrive) return { ...state, toast: 'U disc is not inserted, driving recorder cannot operate' }
      const recording = !state.recorder.recording
      return {
        ...state,
        recorder: {
          ...state.recorder,
          recording,
          clips: recording ? state.recorder.clips : state.recorder.clips + 1,
        },
        toast: recording ? 'Recording' : 'Recording paused',
      }
    }

    case 'take-photo':
      if (!state.car.usbDrive) return { ...state, toast: 'U disc is not inserted, driving recorder cannot operate' }
      return {
        ...state,
        recorder: { ...state.recorder, photos: state.recorder.photos + 1 },
        toast: 'Photo saved to album',
      }

    case 'toggle-media':
      return { ...state, mediaPlaying: !state.mediaPlaying }

    case 'start-replace':
      return {
        ...navigate(state, { kind: 'app-center' }),
        replacingSlot: action.slot,
        toast: 'Pick an app for this shortcut',
      }

    case 'replace-dock-app': {
      if (state.replacingSlot === null) return state
      const dockApps = [...state.dockApps]
      dockApps[state.replacingSlot] = action.appId
      return { ...state, dockApps, replacingSlot: null, toast: 'Shortcut replaced' }
    }

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
    if (state.view.kind !== 'settings') return null
    const { menuId } = state.view
    return infotainmentMenus.find((menu) => menu.id === menuId) ?? null
  }, [state.view])

  const activeControl: InfotainmentControl | null = useMemo(
    () => activeMenu?.controls.find((control) => control.id === state.selectedControlId) ?? null,
    [activeMenu, state.selectedControlId],
  )

  const value = useCallback((key: string) => state.values[key], [state.values])

  return { state, dispatch, activeMenu, activeControl, value }
}

export type InfotainmentDispatch = ReturnType<typeof useInfotainment>['dispatch']
