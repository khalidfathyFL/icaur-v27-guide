import { Suspense, lazy, type CSSProperties } from 'react'
import { Bluetooth, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { apps } from '../../content/infotainment'
import { useLanguage } from '../../i18n/languageContext'
import {
  CAMERA_VIEWS,
  KEYS,
  type CameraView,
  type InfotainmentDispatch,
  type InfotainmentState,
  type WindowId,
} from './useInfotainment'
import { AppHeader, Switch } from './shared'
import { APP_ICONS } from './screenKit'

/** three.js is only pulled in when someone actually opens the camera view. */
const Vehicle540View = lazy(() =>
  import('./Vehicle540View').then((module) => ({ default: module.Vehicle540View })),
)

type Props = { state: InfotainmentState; dispatch: InfotainmentDispatch }

const home = (dispatch: InfotainmentDispatch) => () => dispatch({ type: 'go-home' })

/** Manual item 22: every installed app. Also where a long-pressed dock shortcut picks its replacement. */
export function AppCenter({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const replacing = state.replacingSlot !== null

  return (
    <div className="ice-app">
      <AppHeader title={replacing ? 'Choose a shortcut' : 'App center'} onBack={home(dispatch)} />
      {replacing && (
        <p className="ice-app-note">
          {tx('Tap an app to put it in the dock.', 'اضغط على تطبيق لوضعه في الشريط السفلي.')}
        </p>
      )}
      <div className="ice-app-grid">
        {apps.map((app) => {
          const Glyph = APP_ICONS[app.id]
          return (
            <button
              key={app.id}
              type="button"
              className={`ice-app-icon app-${app.id}`}
              onClick={() => dispatch({ type: 'open-app', appId: app.id })}
            >
              <span>
                <Glyph size={22} aria-hidden />
              </span>
              <small>{app.label}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MediaApp({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const playing = state.mediaPlaying
  const btOn = state.values[KEYS.bluetooth] === true

  return (
    <div className="ice-app">
      <AppHeader title="Music" onBack={home(dispatch)} />
      <div className="ice-media-app">
        <div className="ice-media-art" aria-hidden>
          <Bluetooth size={36} />
        </div>
        <strong>{playing ? 'Radio - 90.9 FM' : 'No Bluetooth devices found'}</strong>
        <small>
          {btOn
            ? tx('Pair a phone from Connections to play its music.', 'اقرن هاتفا من الاتصالات لتشغيل موسيقاه.')
            : tx('Bluetooth is off.', 'البلوتوث متوقف.')}
        </small>
        <div className="ice-media-controls big">
          <button type="button" aria-label="Previous" onClick={() => dispatch({ type: 'run-action', toast: 'Previous' })}>
            <SkipBack size={20} aria-hidden />
          </button>
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => dispatch({ type: 'toggle-media' })}>
            {playing ? <Pause size={24} aria-hidden /> : <Play size={24} aria-hidden />}
          </button>
          <button type="button" aria-label="Next" onClick={() => dispatch({ type: 'run-action', toast: 'Next' })}>
            <SkipForward size={20} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

const WINDOW_LABELS: Record<WindowId, string> = {
  fl: 'Front left',
  fr: 'Front right',
  rl: 'Rear left',
  rr: 'Rear right',
}

/** Manual item 14: the window control screen, reached from the glass on the home picture. */
export function WindowsApp({ state, dispatch }: Props) {
  const passengerLock = state.values[KEYS.passengerLock] === true

  return (
    <div className="ice-app">
      <AppHeader title="Window control" onBack={home(dispatch)}>
        <span className="ice-app-head-label">Passenger window lock</span>
        <Switch
          on={passengerLock}
          label="Passenger window lock"
          onChange={(next) =>
            dispatch({ type: 'set-value', key: KEYS.passengerLock, value: next, toast: `Passenger window lock: ${next ? 'ON' : 'OFF'}` })
          }
        />
      </AppHeader>
      <div className="ice-windows">
        <div className="ice-windows-car" aria-hidden>
          {(Object.keys(WINDOW_LABELS) as WindowId[]).map((id) => (
            <span key={id} className={`pane ${id}`} style={{ '--open': `${state.windows[id]}%` } as CSSProperties} />
          ))}
        </div>
        <div className="ice-windows-sliders">
          {(Object.keys(WINDOW_LABELS) as WindowId[]).map((id) => (
            <label key={id} className="ice-slider">
              <span>{WINDOW_LABELS[id]}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={state.windows[id]}
                aria-label={`${WINDOW_LABELS[id]} window`}
                onChange={(event) => dispatch({ type: 'set-window', id, value: Number(event.target.value) })}
              />
              <output>{state.windows[id]}%</output>
            </label>
          ))}
          <div className="ice-actions">
            <button type="button" onClick={() => dispatch({ type: 'all-windows', value: 100, toast: 'All open' })}>
              All open
            </button>
            <button type="button" onClick={() => dispatch({ type: 'all-windows', value: 15, toast: 'Ventilate' })}>
              Ventilate
            </button>
            <button type="button" onClick={() => dispatch({ type: 'all-windows', value: 0, toast: 'All close' })}>
              All close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Simulated readings, in bar, converted to whatever unit Safety & services is set to. */
const TYRES = [
  { id: 'FL', bar: 2.5, temp: 31 },
  { id: 'FR', bar: 2.5, temp: 32 },
  { id: 'RL', bar: 2.6, temp: 30 },
  { id: 'RR', bar: 2.6, temp: 30 },
]

function formatPressure(bar: number, unit: string) {
  if (unit === 'kPa') return `${Math.round(bar * 100)} kPa`
  if (unit === 'psi') return `${Math.round(bar * 14.5038)} psi`
  return `${bar.toFixed(1)} bar`
}

/** Manual item 12: tyre pressure monitoring, reached from under the car on the home picture. */
export function TpmsApp({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const unit = String(state.values[KEYS.tpmsUnit] ?? 'bar')

  return (
    <div className="ice-app">
      <AppHeader title="Tire pressure monitoring" onBack={home(dispatch)} />
      <div className="ice-tpms">
        {TYRES.map((tyre) => (
          <div key={tyre.id} className={`ice-tyre t-${tyre.id.toLowerCase()}`}>
            <small>{tyre.id}</small>
            <strong>{formatPressure(tyre.bar, unit)}</strong>
            <span>{tyre.temp} °C</span>
          </div>
        ))}
        <div className="ice-tpms-car" aria-hidden />
      </div>
      <p className="ice-app-note">
        {tx(
          'Readings are illustrative. Change the unit in Safety & services. Check pressures cold, against the label on the driver door pillar.',
          'القراءات توضيحية. غير الوحدة من السلامة والخدمات. افحص الضغط والإطارات باردة وقارنه بالملصق على عمود باب السائق.',
        )}
      </p>
    </div>
  )
}

/** The previous home screen's energy-flow panel, kept as an app. */
export function EnergyApp({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const percent = state.values[KEYS.rangeUnit] === 'Percentage'

  return (
    <div className="ice-app">
      <AppHeader title="Energy flow" onBack={home(dispatch)} />
      <div className="ice-energy">
        <div className="ice-flow">
          <span className="ice-flow-node">
            {tx('Fuel', 'وقود')}
            <strong>60 L</strong>
          </span>
          <span className="ice-flow-arrow" aria-hidden />
          <span className="ice-flow-node">
            {tx('Generator', 'مولد')}
            <strong>1.5 T-GDI</strong>
          </span>
          <span className="ice-flow-arrow" aria-hidden />
          <span className="ice-flow-node">
            {tx('Battery', 'بطارية')}
            <strong>{percent ? `${state.car.battery}%` : `${Math.round(state.car.battery * 1.5)} km`}</strong>
          </span>
          <span className="ice-flow-arrow" aria-hidden />
          <span className="ice-flow-node">
            {tx('Motors', 'مواتير')}
            <strong>AWD</strong>
          </span>
        </div>
        <p className="ice-energy-note">
          {tx(
            'The wheels are always driven electrically. The petrol engine only generates electricity.',
            'العجلات تتحرك بالكهرباء دائما، ومحرك البنزين يولد الكهرباء فقط.',
          )}
        </p>
        <button
          type="button"
          className="ice-link"
          onClick={() => dispatch({ type: 'open-settings', menuId: 'energy', controlId: 'energy-mode' })}
        >
          Energy mode: {String(state.values['energy.energy-mode'])} ›
        </button>
      </div>
    </div>
  )
}

export function PhoneApp({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  return (
    <div className="ice-app">
      <AppHeader title="Phone" onBack={home(dispatch)} />
      <div className="ice-media-app">
        <div className="ice-media-art" aria-hidden>
          <Bluetooth size={36} />
        </div>
        <strong>No phone connected</strong>
        <small>
          {tx(
            'Turn on Bluetooth on your phone and the car, then pair them. For CarPlay, accept the prompt that appears on the screen.',
            'شغل البلوتوث في الهاتف والسيارة ثم اقرنهما. لكاربلاي، وافق على الرسالة التي تظهر على الشاشة.',
          )}
        </small>
        <button
          type="button"
          className="ice-link"
          onClick={() => dispatch({ type: 'open-settings', menuId: 'connections', controlId: 'carplay-aa' })}
        >
          Connections ›
        </button>
        {state.values[KEYS.bluetooth] !== true && <small className="ice-warn">Bluetooth is off</small>}
      </div>
    </div>
  )
}

export function NavigationApp({ dispatch }: Props) {
  const { tx } = useLanguage()

  return (
    <div className="ice-app">
      <AppHeader title="Navigation" onBack={home(dispatch)} />
      <div className="ice-nav">
        <div className="ice-nav-map" aria-hidden>
          <span className="ice-nav-route" />
          <span className="ice-nav-pin" />
        </div>
        <div className="ice-nav-card">
          <p className="eyebrow">{tx('Active route', 'المسار الحالي')}</p>
          <h3>Cairo Ring Road</h3>
          <dl className="ice-nav-stats">
            <div>
              <dt>{tx('Distance', 'المسافة')}</dt>
              <dd>38 km</dd>
            </div>
            <div>
              <dt>{tx('Arrival', 'الوصول')}</dt>
              <dd>11:04</dd>
            </div>
            <div>
              <dt>{tx('EV range left', 'المدى الكهربائي')}</dt>
              <dd>112 km</dd>
            </div>
          </dl>
          <p className="ice-nav-note">
            {tx(
              'Navigation content depends on the market software version and should be confirmed on an Egypt vehicle.',
              'محتوى الملاحة يعتمد على إصدار السوفتوير في السوق ويحتاج تأكيد من سيارة مصر.',
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * A drawn stand-in for the 540 surround view. Real camera frames are not
 * published here, so the app shows the layout, the angles and the guide lines.
 */
export function CameraApp({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const view = state.cameraView
  const onChange = (next: CameraView) => dispatch({ type: 'set-camera-view', view: next })

  return (
    <div className="ice-app">
      <AppHeader title="360 Camera" onBack={home(dispatch)}>
        <div className="ice-camera-angles" role="radiogroup" aria-label={tx('Camera view', 'زاوية الكاميرا')}>
          {CAMERA_VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={view === option}
              className={view === option ? 'active' : ''}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </AppHeader>
      <div className="ice-camera-stage" data-view={view}>
        <div className="ice-camera-feed">
          <span className="ice-camera-tag">{view}</span>
          <Suspense fallback={<p className="ice-camera-loading">{tx('Loading 3D view…', 'جارٍ تحميل العرض ثلاثي الأبعاد…')}</p>}>
            <Vehicle540View view={view} />
          </Suspense>
        </div>
        <p className="ice-camera-note">
          {tx(
            'Drag to orbit, scroll to zoom. Layout reference only: cameras do not reveal every obstacle.',
            'اسحب للدوران، مرر للتقريب. مرجع تخطيطي فقط: الكاميرات لا تكشف كل العوائق.',
          )}
        </p>
      </div>
    </div>
  )
}
