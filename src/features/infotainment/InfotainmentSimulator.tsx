import { Suspense, lazy, useEffect, useState } from 'react'
import {
  BatteryCharging,
  Bluetooth,
  Camera,
  Car,
  ChevronLeft,
  CircleDot,
  Contrast,
  Fan,
  Home,
  Lightbulb,
  MapPin,
  Mic,
  Minus,
  Music,
  Phone,
  Plus,
  Radar,
  Signal,
  Snowflake,
  Volume2,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react'
import {
  DRIVE_MODES,
  homeTiles,
  infotainmentMenus,
  type DriveMode,
  type HomeTile,
  type InfotainmentControl,
  type MenuIcon,
} from '../../content/infotainment'
import { useLanguage } from '../../i18n/languageContext'
import { VerificationBadge } from '../../components/VerificationBadge'
import { AltBlock } from '../../components/layout'
import {
  CAMERA_VIEWS,
  FAN_MAX,
  controlKey,
  useInfotainment,
  type AppId,
  type CameraView,
} from './useInfotainment'
import './infotainment.css'

/** three.js is only pulled in when someone actually opens the camera view. */
const Vehicle540View = lazy(() =>
  import('./Vehicle540View').then((module) => ({ default: module.Vehicle540View })),
)

const ICONS: Record<MenuIcon | HomeTile['icon'], typeof Car> = {
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
  nav: MapPin,
  media: Music,
  phone: Phone,
  camera: Camera,
}

function MenuGlyph({ icon, size = 20 }: { icon: MenuIcon | HomeTile['icon']; size?: number }) {
  const Glyph = ICONS[icon]
  return <Glyph size={size} aria-hidden />
}

/** Clock that ticks like the car's, so the screen never looks like a static mockup. */
function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function InfotainmentSimulator() {
  const { tx, t } = useLanguage()
  const { state, dispatch, activeMenu, activeControl, valueOf } = useInfotainment()
  const clock = useClock()

  const openMenu = (menuId: string) => dispatch({ type: 'open-menu', menuId })

  return (
    <section className="ice" aria-label={tx('V27 centre screen simulator', 'محاكي شاشة V27')}>
      <header className="ice-intro">
        <div>
          <p className="eyebrow">{tx('Interactive centre screen', 'شاشة مركزية تفاعلية')}</p>
          <h2>{tx('Try the V27 screen before you touch the car', 'جرب شاشة V27 قبل ما تمسك السيارة')}</h2>
          <p className="ice-intro-note">
            {tx(
              'Every switch, list and climate control below reacts the way the vehicle does. Menu text is kept exactly as it appears on the car screen.',
              'كل مفتاح وقائمة وتحكم تكييف بالأسفل يتفاعل مثل السيارة. نصوص القوائم كما تظهر على شاشة السيارة.',
            )}
          </p>
        </div>
        <span className="ice-intro-flag">
          {tx('Research map - verify Egypt trims', 'خريطة بحثية - تحقق من فئات مصر')}
        </span>
      </header>

      <div className="ice-device" role="application">
        <div className="ice-statusbar">
          <div className="ice-status-left">
            <span className="ice-gear">P</span>
            <span className="ice-os">iCAUR OS</span>
          </div>
          <span className="ice-clock">{clock}</span>
          <div className="ice-status-right">
            <span className="ice-outside">24°C</span>
            <Bluetooth size={14} aria-hidden />
            <Wifi size={14} aria-hidden />
            <Signal size={14} aria-hidden />
            <span className="ice-soc">
              <BatteryCharging size={14} aria-hidden /> 74%
            </span>
          </div>
        </div>

        <div className="ice-body">
          <nav className="ice-rail" aria-label={tx('Screen menus', 'قوائم الشاشة')}>
            <button
              type="button"
              className={state.view.kind === 'home' ? 'active' : ''}
              onClick={() => dispatch({ type: 'go-home' })}
              title={tx('Home', 'الرئيسية')}
            >
              <Home size={20} aria-hidden />
              <small>{tx('Home', 'الرئيسية')}</small>
            </button>

            {infotainmentMenus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                className={activeMenu?.id === menu.id ? 'active' : ''}
                onClick={() => openMenu(menu.id)}
                title={t(menu.name)}
              >
                <MenuGlyph icon={menu.icon} />
                <small>{menu.name.en}</small>
              </button>
            ))}
          </nav>

          <div className="ice-stage">
            {state.view.kind === 'home' ? (
              <HomeScreen
                driveMode={state.driveMode}
                onOpenMenu={openMenu}
                onOpenApp={(appId) => dispatch({ type: 'open-app', appId })}
                onDriveMode={(mode) => dispatch({ type: 'set-drive-mode', mode })}
              />
            ) : state.view.kind === 'app' ? (
              <>
                <Breadcrumb
                  label={state.view.appId === 'camera' ? 'Camera' : 'Navigation'}
                  onHome={() => dispatch({ type: 'go-home' })}
                />
                {state.view.appId === 'camera' ? (
                  <CameraApp
                    view={state.cameraView}
                    onChange={(view) => dispatch({ type: 'set-camera-view', view })}
                  />
                ) : (
                  <NavigationApp />
                )}
              </>
            ) : activeMenu ? (
              <>
                <Breadcrumb
                  label={`${activeMenu.index}. ${activeMenu.name.en}`}
                  onHome={() => dispatch({ type: 'go-home' })}
                />

                <div className="ice-panel">
                  <div className="ice-controls" role="list">
                    {activeMenu.controls.map((control, index) => (
                      <ControlRow
                        key={control.id}
                        control={control}
                        // The car groups its settings under sub-headings; show each once.
                        showSection={
                          control.section !== undefined &&
                          control.section !== activeMenu.controls[index - 1]?.section
                        }
                        menuId={activeMenu.id}
                        value={valueOf(activeMenu.id, control.id)}
                        selected={activeControl?.id === control.id}
                        onSelect={() => dispatch({ type: 'select-control', controlId: control.id })}
                        onChange={(value, toast) =>
                          dispatch({
                            type: 'set-value',
                            key: controlKey(activeMenu.id, control.id),
                            value,
                            toast,
                          })
                        }
                        onAction={(toast) => dispatch({ type: 'run-action', toast })}
                      />
                    ))}
                  </div>

                  {activeControl && <ControlDetail control={activeControl} />}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <ClimateBar state={state} dispatch={dispatch} />

        <div className="ice-toast" role="status" aria-live="polite">
          {state.toast && <span>{state.toast}</span>}
        </div>
      </div>
    </section>
  )
}

function Breadcrumb({ label, onHome }: { label: string; onHome: () => void }) {
  const { tx } = useLanguage()

  return (
    <div className="ice-crumb">
      <button type="button" onClick={onHome}>
        <ChevronLeft size={16} aria-hidden />
        {tx('Home', 'الرئيسية')}
      </button>
      <span>{label}</span>
    </div>
  )
}

function HomeScreen({
  driveMode,
  onOpenMenu,
  onOpenApp,
  onDriveMode,
}: {
  driveMode: DriveMode
  onOpenMenu: (menuId: string) => void
  onOpenApp: (appId: AppId) => void
  onDriveMode: (mode: DriveMode) => void
}) {
  const { t, tx } = useLanguage()

  return (
    <div className="ice-home">
      <div className="ice-home-main">
        <div className="ice-tiles">
          {homeTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className="ice-tile"
              onClick={() => {
                if (tile.appId) onOpenApp(tile.appId)
                else if (tile.menuId) onOpenMenu(tile.menuId)
              }}
            >
              <MenuGlyph icon={tile.icon} size={22} />
              <strong>{t(tile.label)}</strong>
              {tile.detail && <small>{t(tile.detail)}</small>}
            </button>
          ))}
        </div>

        <div className="ice-drive-modes" role="radiogroup" aria-label={tx('Drive mode', 'وضع القيادة')}>
          <span>{tx('Drive mode', 'وضع القيادة')}</span>
          {DRIVE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={driveMode === mode}
              className={driveMode === mode ? 'active' : ''}
              onClick={() => onDriveMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <aside className="ice-energy">
        <p className="ice-energy-title">{tx('Energy flow', 'تدفق الطاقة')}</p>
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
            <strong>74%</strong>
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
      </aside>
    </div>
  )
}

/**
 * A drawn stand-in for the 540 surround view. Real camera frames are not
 * published here, so the app shows the layout, the angles and the guide lines.
 */
function CameraApp({ view, onChange }: { view: CameraView; onChange: (view: CameraView) => void }) {
  const { tx } = useLanguage()

  return (
    <div className="ice-camera">
      <div className="ice-camera-stage" data-view={view}>
        <div className="ice-camera-feed">
          <span className="ice-camera-tag">{view}</span>
          <Suspense fallback={<p className="ice-camera-loading">{tx('Loading 3D view…', 'جارٍ تحميل العرض ثلاثي الأبعاد…')}</p>}>
            <Vehicle540View view={view} />
          </Suspense>
        </div>
        <p className="ice-camera-hint">
          {tx('Drag to orbit, scroll to zoom.', 'اسحب للدوران، مرر للتقريب.')}
        </p>
        <p className="ice-camera-note">
          {tx(
            'Layout reference only. Cameras do not reveal every obstacle - confirm with direct vision and the mirrors.',
            'مرجع تخطيطي فقط. الكاميرات لا تكشف كل العوائق - تأكد بالنظر المباشر والمرايات.',
          )}
        </p>
      </div>

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
    </div>
  )
}

function NavigationApp() {
  const { tx } = useLanguage()

  return (
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
  )
}

function ControlRow({
  control,
  menuId,
  value,
  selected,
  showSection,
  onSelect,
  onChange,
  onAction,
}: {
  control: InfotainmentControl
  menuId: string
  value: boolean | string | undefined
  selected: boolean
  showSection: boolean
  onSelect: () => void
  onChange: (value: boolean | string, toast: string) => void
  onAction: (toast: string) => void
}) {
  const spec = control.control

  return (
    <>
      {showSection && <p className="ice-section">{control.section}</p>}
        <div className={selected ? 'ice-control selected' : 'ice-control'} role="listitem">
        <button type="button" className="ice-control-head" onClick={onSelect}>
          <span>{control.label}</span>
          <VerificationBadge status={control.status} compact />
        </button>

        {spec.kind === 'toggle' && (
          <button
            type="button"
            className="ice-switch"
            role="switch"
            aria-checked={value === true}
            aria-label={control.label}
            onClick={() => {
              const next = !(value === true)
              onSelect()
              onChange(next, `${control.label}: ${next ? 'On' : 'Off'}`)
            }}
          >
            <span className="ice-switch-track" data-on={value === true}>
              <span className="ice-switch-thumb" />
            </span>
            <small>{value === true ? 'On' : 'Off'}</small>
          </button>
        )}

        {spec.kind === 'choice' && (
          <div className="ice-segment" role="radiogroup" aria-label={control.label}>
            {spec.options.map((option) => (
              <button
                key={`${menuId}-${control.id}-${option}`}
                type="button"
                role="radio"
                aria-checked={value === option}
                className={value === option ? 'active' : ''}
                onClick={() => {
                  onSelect()
                  onChange(option, `${control.label}: ${option}`)
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {spec.kind === 'action' && (
          <div className="ice-actions">
            {spec.actions.map((label) => (
              <button
                key={`${menuId}-${control.id}-${label}`}
                type="button"
                onClick={() => {
                  onSelect()
                  onAction(`${control.label}: ${label}`)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ControlDetail({ control }: { control: InfotainmentControl }) {
  const { tx, t, alt } = useLanguage()
  const descriptionAlt = alt(control.description)
  const tipAlt = control.egyptTip && alt(control.egyptTip)
  const warningAlt = control.warning && alt(control.warning)

  return (
    <aside className="ice-detail">
      <p className="eyebrow">{tx('Selected setting', 'الإعداد المحدد')}</p>
      <h3>{control.label}</h3>
      {control.section && <p className="ice-detail-section">{control.section}</p>}

      <p>{t(control.description)}</p>
      {descriptionAlt && (
        <AltBlock>
          <p>{descriptionAlt}</p>
        </AltBlock>
      )}

      {control.warning && (
        <div className="ice-callout warning">
          <strong>{tx('Warning', 'تحذير')}</strong>
          <p>{t(control.warning)}</p>
          {warningAlt && (
            <AltBlock>
              <p>{warningAlt}</p>
            </AltBlock>
          )}
        </div>
      )}

      {control.egyptTip && (
        <div className="ice-callout egypt">
          <strong>{tx('For Egypt', 'لمصر')}</strong>
          <p>{t(control.egyptTip)}</p>
          {tipAlt && (
            <AltBlock>
              <p>{tipAlt}</p>
            </AltBlock>
          )}
        </div>
      )}

      <div className="ice-detail-status">
        <VerificationBadge status={control.status} />
        <small>
          {tx(
            'From the official V27 infotainment settings guide for Egypt.',
            'من دليل إعدادات شاشة V27 الرسمي لمصر.',
          )}
        </small>
      </div>
    </aside>
  )
}

function ClimateBar({
  state,
  dispatch,
}: {
  state: ReturnType<typeof useInfotainment>['state']
  dispatch: ReturnType<typeof useInfotainment>['dispatch']
}) {
  const { tx } = useLanguage()
  const { climate } = state

  return (
    <div className="ice-climate" aria-label={tx('Climate control', 'التحكم في التكييف')}>
      <TempStepper
        label={tx('Driver', 'السائق')}
        value={climate.driverTemp}
        onChange={(delta) => dispatch({ type: 'adjust-temp', side: 'driver', delta })}
      />

      <div className="ice-climate-center">
        <button
          type="button"
          className={climate.ac ? 'active' : ''}
          onClick={() => dispatch({ type: 'toggle-climate', key: 'ac' })}
        >
          <Snowflake size={16} aria-hidden /> A/C
        </button>
        <button
          type="button"
          className={climate.sync ? 'active' : ''}
          onClick={() => dispatch({ type: 'toggle-climate', key: 'sync' })}
        >
          SYNC
        </button>
        <button
          type="button"
          className={climate.frontDefrost ? 'active' : ''}
          onClick={() => dispatch({ type: 'toggle-climate', key: 'frontDefrost' })}
        >
          {tx('Front defog', 'إزالة شبورة أمامي')}
        </button>
        <button
          type="button"
          className={climate.rearDefrost ? 'active' : ''}
          onClick={() => dispatch({ type: 'toggle-climate', key: 'rearDefrost' })}
        >
          {tx('Rear defog', 'إزالة شبورة خلفي')}
        </button>

        <div className="ice-fan">
          <button
            type="button"
            onClick={() => dispatch({ type: 'adjust-fan', delta: -1 })}
            aria-label={tx('Fan down', 'تقليل المروحة')}
          >
            <Minus size={14} aria-hidden />
          </button>
          <span>
            <Fan size={15} aria-hidden />
            <em>{climate.fan}</em>
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'adjust-fan', delta: 1 })}
            aria-label={tx('Fan up', 'زيادة المروحة')}
          >
            <Plus size={14} aria-hidden />
          </button>
          <div className="ice-fan-bars" aria-hidden>
            {Array.from({ length: FAN_MAX }, (_, index) => (
              <i key={index} data-on={index < climate.fan} />
            ))}
          </div>
        </div>
      </div>

      <TempStepper
        label={tx('Passenger', 'الراكب')}
        value={climate.passengerTemp}
        onChange={(delta) => dispatch({ type: 'adjust-temp', side: 'passenger', delta })}
      />
    </div>
  )
}

function TempStepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (delta: number) => void
}) {
  return (
    <div className="ice-temp">
      <button type="button" onClick={() => onChange(-0.5)} aria-label={`${label} -`}>
        <Minus size={14} aria-hidden />
      </button>
      <span>
        <small>{label}</small>
        <strong>{value.toFixed(1)}°</strong>
      </span>
      <button type="button" onClick={() => onChange(0.5)} aria-label={`${label} +`}>
        <Plus size={14} aria-hidden />
      </button>
    </div>
  )
}
