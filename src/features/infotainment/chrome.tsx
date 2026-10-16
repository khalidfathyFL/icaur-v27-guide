import {
  Armchair,
  Bell,
  Bluetooth,
  ChevronLeft,
  ChevronRight,
  Flame,
  Home,
  LayoutGrid,
  Minus,
  Plus,
  Router,
  ShieldCheck,
  ShieldOff,
  Snowflake,
  TriangleAlert,
  UserRound,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  Wind,
  Fan,
} from 'lucide-react'
import { apps } from '../../content/infotainment'
import { useLanguage } from '../../i18n/languageContext'
import {
  FAN_MAX,
  KEYS,
  SEAT_LEVEL_MAX,
  type InfotainmentDispatch,
  type InfotainmentState,
  type SeatState,
} from './useInfotainment'
import { Popover, Switch } from './shared'
import { APP_ICONS, useClock, useLongPress } from './screenKit'

type ChromeProps = { state: InfotainmentState; dispatch: InfotainmentDispatch }

/**
 * Status bar along the top edge (manual items 1-10). Dragging or tapping the
 * grab handle in the middle pulls down the control center.
 */
export function StatusBar({ state, dispatch }: ChromeProps) {
  const { tx } = useLanguage()
  const clock = useClock(state.values[KEYS.timeFormat] === '12-hour time')
  const airbagOn = state.values[KEYS.airbag] === true
  const wifiOn = state.values[KEYS.wifi] === true
  const btOn = state.values[KEYS.bluetooth] === true

  return (
    <div className="ice-statusbar">
      <div className="ice-status-group">
        <button type="button" onClick={() => dispatch({ type: 'toggle-panel', panel: 'access' })} title="My access center">
          <UserRound size={16} aria-hidden />
        </button>
        <button type="button" onClick={() => dispatch({ type: 'toggle-panel', panel: 'info' })} title="Information center">
          <Bell size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="ice-fault"
          onClick={() => dispatch({ type: 'toggle-panel', panel: 'fault' })}
          title="Fault information"
        >
          <TriangleAlert size={16} aria-hidden />
        </button>
      </div>

      <button
        type="button"
        className="ice-grabber"
        aria-expanded={state.controlCenter}
        onClick={() => dispatch({ type: 'toggle-control-center' })}
        aria-label={tx('Control center', 'مركز التحكم')}
        title={tx('Pull down for the control center', 'اسحب لأسفل لمركز التحكم')}
      >
        <span />
      </button>

      <div className="ice-status-group">
        <button type="button" onClick={() => dispatch({ type: 'open-app', appId: 'recorder' })} title="Driving recorder">
          <Video size={15} aria-hidden />
          {state.recorder.recording && <i className="ice-rec-dot" aria-label="Recording" />}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'toggle-panel', panel: 'connection' })} title="Connection">
          {wifiOn ? <Wifi size={15} aria-hidden /> : btOn ? <Bluetooth size={15} aria-hidden /> : <Router size={15} aria-hidden />}
        </button>
        <button
          type="button"
          className="ice-network"
          onClick={() => dispatch({ type: 'toggle-panel', panel: 'network' })}
          title="Data network"
        >
          <small>4G</small>
          <span className="ice-bars" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>
        <span className="ice-outside" title="Temperature">
          32°C
        </span>
        <span className="ice-clock">{clock}</span>
        <button
          type="button"
          className={airbagOn ? 'ice-airbag' : 'ice-airbag off'}
          onClick={() => dispatch({ type: 'toggle-airbag' })}
          title="Front passenger airbag OFF switch"
        >
          {airbagOn ? <ShieldCheck size={15} aria-hidden /> : <ShieldOff size={15} aria-hidden />}
          <small>
            PASSENGER
            <br />
            AIRBAG <b>{airbagOn ? 'ON' : 'OFF'}</b>
          </small>
        </button>
      </div>
    </div>
  )
}

/** The pop-ups behind status bar icons 1, 2, 3, 6 and 7. */
export function StatusPanel({ state, dispatch }: ChromeProps) {
  const close = () => dispatch({ type: 'close-panel' })
  const setting = (key: string, label: string) => (
    <div className="ice-popover-row">
      <span>{label}</span>
      <Switch
        on={state.values[key] === true}
        label={label}
        onChange={(next) => dispatch({ type: 'set-value', key, value: next, toast: `${label}: ${next ? 'ON' : 'OFF'}` })}
      />
    </div>
  )

  switch (state.panel) {
    case 'access':
      return (
        <Popover title="My access center" className="left" onClose={close}>
          <div className="ice-popover-row">
            <span>Driving profile</span>
            <strong>{String(state.values[KEYS.profile])}</strong>
          </div>
          <p className="ice-popover-note">Sign in with the iCAUR app to sync profiles and remote control.</p>
        </Popover>
      )
    case 'info':
      return (
        <Popover title="Information center" className="left" onClose={close}>
          <p className="ice-popover-note">No new messages.</p>
        </Popover>
      )
    case 'fault':
      return (
        <Popover title="Fault information" className="left" onClose={close}>
          <div className="ice-popover-row">
            <span>Tire pressure</span>
            <strong className="ok">Normal</strong>
          </div>
          <div className="ice-popover-row">
            <span>Vehicle systems</span>
            <strong className="ok">No faults</strong>
          </div>
          <p className="ice-popover-note">A red triangle here means the car has logged a fault. Check the instrument cluster warning lights too.</p>
        </Popover>
      )
    case 'connection':
      return (
        <Popover title="Connection" className="right" onClose={close}>
          {setting(KEYS.wifi, 'Wi-Fi')}
          {setting(KEYS.bluetooth, 'Bluetooth')}
          {setting(KEYS.hotspot, 'Car Hotspot')}
        </Popover>
      )
    case 'network':
      return (
        <Popover title="Data network" className="right" onClose={close}>
          <div className="ice-popover-row">
            <span>Mobile data</span>
            <strong>4G</strong>
          </div>
          <p className="ice-popover-note">The car's own connection, used for online services and updates.</p>
        </Popover>
      )
    default:
      return null
  }
}

/** Bottom dock (manual items 18-23). The middle four icons are replaceable shortcuts. */
export function Dock({ state, dispatch }: ChromeProps) {
  const { climate } = state
  const muted = state.values[KEYS.mediaVolume] === 0

  return (
    <nav className="ice-dock" aria-label="Dock">
      <button
        type="button"
        className={state.view.kind === 'home' ? 'ice-dock-btn active' : 'ice-dock-btn'}
        onClick={() => dispatch({ type: 'go-home' })}
        aria-label="Home"
      >
        <Home size={20} aria-hidden />
      </button>

      <DockTemp side="driver" value={climate.driverTemp} on={climate.ac} dispatch={dispatch} />
      <SeatButton side="driver" seat={state.seats.driver} dispatch={dispatch} />

      <div className="ice-dock-apps">
        {state.dockApps.map((appId, slot) => (
          <DockApp key={`${slot}-${appId}`} appId={appId} slot={slot} dispatch={dispatch} />
        ))}
        <button
          type="button"
          className={state.view.kind === 'app-center' ? 'ice-dock-app center active' : 'ice-dock-app center'}
          onClick={() => dispatch({ type: 'open-app-center' })}
          aria-label="App center"
          title="App center"
        >
          <LayoutGrid size={18} aria-hidden />
        </button>
      </div>

      <SeatButton side="passenger" seat={state.seats.passenger} dispatch={dispatch} />
      <DockTemp side="passenger" value={climate.passengerTemp} on={climate.ac} dispatch={dispatch} />

      <button
        type="button"
        className="ice-dock-btn"
        onClick={() => dispatch({ type: 'toggle-panel', panel: 'volume' })}
        aria-label="Media volume"
      >
        {muted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
      </button>
    </nav>
  )
}

function DockApp({ appId, slot, dispatch }: { appId: (typeof apps)[number]['id']; slot: number; dispatch: InfotainmentDispatch }) {
  const app = apps.find((item) => item.id === appId)!
  const Glyph = APP_ICONS[appId]
  const press = useLongPress(
    () => dispatch({ type: 'start-replace', slot }),
    () => dispatch({ type: 'open-app', appId }),
  )

  return (
    <button
      type="button"
      className={`ice-dock-app app-${appId}`}
      aria-label={`${app.label} (long press to replace)`}
      title={`${app.label} - long press to replace`}
      {...press}
    >
      <Glyph size={18} aria-hidden />
    </button>
  )
}

function DockTemp({
  side,
  value,
  on,
  dispatch,
}: {
  side: 'driver' | 'passenger'
  value: number
  on: boolean
  dispatch: InfotainmentDispatch
}) {
  const label = side === 'driver' ? 'Driver' : 'Front passenger'
  return (
    <div className={on ? 'ice-dock-temp' : 'ice-dock-temp off'}>
      <button type="button" onClick={() => dispatch({ type: 'adjust-temp', side, delta: -0.5 })} aria-label={`${label} temperature down`}>
        <ChevronLeft size={16} aria-hidden />
      </button>
      <button
        type="button"
        className="ice-dock-temp-value"
        onClick={() => dispatch({ type: 'toggle-panel', panel: 'climate' })}
        aria-label={`${label} A/C`}
      >
        {value.toFixed(1)}°
      </button>
      <button type="button" onClick={() => dispatch({ type: 'adjust-temp', side, delta: 0.5 })} aria-label={`${label} temperature up`}>
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  )
}

function SeatButton({ side, seat, dispatch }: { side: 'driver' | 'passenger'; seat: SeatState; dispatch: InfotainmentDispatch }) {
  const panel = side === 'driver' ? 'seat-driver' : 'seat-passenger'
  return (
    <button
      type="button"
      className={`ice-dock-btn seat seat-${seat.mode}`}
      onClick={() => dispatch({ type: 'toggle-panel', panel })}
      aria-label={`${side === 'driver' ? 'Driver' : 'Front passenger'} seat ventilation/heating`}
    >
      <Armchair size={19} aria-hidden />
      {seat.mode !== 'off' && <small>{seat.level}</small>}
    </button>
  )
}

/** The pop-ups behind the dock's A/C, seat and volume buttons. */
export function DockPanel({ state, dispatch }: ChromeProps) {
  const close = () => dispatch({ type: 'close-panel' })
  const { climate } = state

  if (state.panel === 'climate') {
    return (
      <Popover title="Air conditioning" className="bottom wide" onClose={close}>
        <div className="ice-ac">
          <div className="ice-ac-temps">
            <span>
              <small>Driver</small>
              {climate.driverTemp.toFixed(1)}°
            </span>
            <span>
              <small>Passenger</small>
              {climate.passengerTemp.toFixed(1)}°
            </span>
          </div>
          <div className="ice-ac-buttons">
            <button type="button" className={climate.ac ? 'active' : ''} onClick={() => dispatch({ type: 'toggle-climate', key: 'ac' })}>
              <Snowflake size={15} aria-hidden /> A/C
            </button>
            <button type="button" className={climate.sync ? 'active' : ''} onClick={() => dispatch({ type: 'toggle-climate', key: 'sync' })}>
              SYNC
            </button>
            <button
              type="button"
              className={climate.frontDefrost ? 'active' : ''}
              onClick={() => dispatch({ type: 'toggle-climate', key: 'frontDefrost' })}
            >
              Front defog
            </button>
            <button
              type="button"
              className={climate.rearDefrost ? 'active' : ''}
              onClick={() => dispatch({ type: 'toggle-climate', key: 'rearDefrost' })}
            >
              Rear defog
            </button>
          </div>
          <div className="ice-fan">
            <button type="button" onClick={() => dispatch({ type: 'adjust-fan', delta: -1 })} aria-label="Fan down">
              <Minus size={14} aria-hidden />
            </button>
            <span>
              <Fan size={15} aria-hidden />
              <em>{climate.fan}</em>
            </span>
            <button type="button" onClick={() => dispatch({ type: 'adjust-fan', delta: 1 })} aria-label="Fan up">
              <Plus size={14} aria-hidden />
            </button>
            <div className="ice-fan-bars" aria-hidden>
              {Array.from({ length: FAN_MAX }, (_, index) => (
                <i key={index} data-on={index < climate.fan} />
              ))}
            </div>
          </div>
        </div>
      </Popover>
    )
  }

  if (state.panel === 'seat-driver' || state.panel === 'seat-passenger') {
    const side = state.panel === 'seat-driver' ? 'driver' : 'passenger'
    const seat = state.seats[side]
    const set = (mode: SeatState['mode'], level: number) =>
      dispatch({ type: 'set-seat', side, seat: level === 0 ? { mode: 'off', level: 0 } : { mode, level } })

    return (
      <Popover
        title={side === 'driver' ? 'Driver seat' : 'Front passenger seat'}
        className={side === 'driver' ? 'bottom left' : 'bottom right'}
        onClose={close}
      >
        {(['heat', 'vent'] as const).map((mode) => (
          <div key={mode} className="ice-popover-row">
            <span className="ice-seat-label">
              {mode === 'heat' ? <Flame size={15} aria-hidden /> : <Wind size={15} aria-hidden />}
              {mode === 'heat' ? 'Heating' : 'Ventilation'}
            </span>
            <div className="ice-segment" role="radiogroup" aria-label={mode}>
              {Array.from({ length: SEAT_LEVEL_MAX + 1 }, (_, level) => {
                const active = level === 0 ? seat.mode !== mode : seat.mode === mode && seat.level === level
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={active ? `active ${mode}` : ''}
                    onClick={() => set(mode, level)}
                  >
                    {level === 0 ? 'Off' : level}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </Popover>
    )
  }

  if (state.panel === 'volume') {
    const volume = Number(state.values[KEYS.mediaVolume] ?? 0)
    return (
      <Popover title="Media volume" className="bottom right" onClose={close}>
        <div className="ice-volume">
          <button
            type="button"
            onClick={() => dispatch({ type: 'set-value', key: KEYS.mediaVolume, value: volume === 0 ? 14 : 0 })}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
          </button>
          <input
            type="range"
            min={0}
            max={39}
            value={volume}
            aria-label="Media volume"
            onChange={(event) => dispatch({ type: 'set-value', key: KEYS.mediaVolume, value: Number(event.target.value) })}
          />
          <output>{volume}</output>
        </div>
        <button
          type="button"
          className="ice-link"
          onClick={() => dispatch({ type: 'open-settings', menuId: 'sound', controlId: 'vol-media' })}
        >
          All volume settings ›
        </button>
      </Popover>
    )
  }

  return null
}
