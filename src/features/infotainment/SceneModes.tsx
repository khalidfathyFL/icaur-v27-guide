import { useEffect, useRef, useState } from 'react'
import { Droplets, Moon, PawPrint, Sparkles, Tent } from 'lucide-react'
import { sceneModes, type SceneId } from '../../content/infotainment'
import { useLanguage } from '../../i18n/languageContext'
import {
  KEYS,
  sceneBlocker,
  sceneById,
  sceneKey,
  type Gear,
  type InfotainmentDispatch,
  type InfotainmentState,
} from './useInfotainment'
import { AppHeader, SpecControl, Switch } from './shared'
import type { Icon } from './screenKit'

type Props = { state: InfotainmentState; dispatch: InfotainmentDispatch }

const SCENE_ICONS: Record<SceneId, Icon> = {
  nap: Moon,
  camping: Tent,
  pet: PawPrint,
  'car-wash': Droplets,
  welcome: Sparkles,
}

/** The scene mode app: one card per mode. */
export function ScenesApp({ state, dispatch }: Props) {
  const { t } = useLanguage()

  return (
    <div className="ice-app">
      <AppHeader title="Scene mode" onBack={() => dispatch({ type: 'go-home' })} />
      <div className="ice-scene-grid">
        {sceneModes.map((scene) => {
          const Glyph = SCENE_ICONS[scene.id]
          return (
            <button
              key={scene.id}
              type="button"
              className={state.activeScene === scene.id ? 'ice-scene-tile on' : 'ice-scene-tile'}
              onClick={() => dispatch({ type: 'open-scene', sceneId: scene.id })}
            >
              <Glyph size={22} aria-hidden />
              <strong>{scene.name}</strong>
              <small>{t(scene.summary)}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** One mode's own screen: its settings, the start button and what the car will do. */
export function SceneScreen({ state, dispatch, sceneId }: Props & { sceneId: SceneId }) {
  const { t, tx } = useLanguage()
  const scene = sceneById(sceneId)
  const Glyph = SCENE_ICONS[scene.id]
  const blocker = sceneBlocker(scene, state.car)

  return (
    <div className="ice-app">
      <AppHeader title={scene.name} onBack={() => dispatch({ type: 'open-app', appId: 'scenes' })} />
      <div className="ice-scene-page">
        <div className="ice-scene-main">
          <div className="ice-scene-hero">
            <Glyph size={28} aria-hidden />
            <p>{t(scene.summary)}</p>
          </div>

          {scene.options.map((option) => {
            const key = sceneKey(scene.id, option.id)
            return (
              <div key={option.id} className={`ice-control kind-${option.control.kind}`}>
                <div className="ice-control-head">
                  <span>{option.label}</span>
                </div>
                <SpecControl
                  spec={option.control}
                  label={option.label}
                  value={state.values[key]}
                  onChange={(value, toast) => dispatch({ type: 'set-value', key, value, toast })}
                />
              </div>
            )
          })}

          {scene.requires && (
            <div className="ice-scene-start">
              <button
                type="button"
                className={blocker ? 'ice-primary blocked' : 'ice-primary'}
                onClick={() => dispatch({ type: 'start-scene', sceneId: scene.id })}
              >
                Turn on {scene.name}
              </button>
              <small>
                {blocker
                  ? blocker
                  : `Needs ${scene.requires.minBattery}% battery${scene.requires.gearP ? ', gear in P' : ''}${
                      scene.requires.noChargingGun ? ', no charging gun' : ''
                    }`}
              </small>
            </div>
          )}

          {scene.requires && <CarSimulator state={state} dispatch={dispatch} />}
        </div>

        <aside className="ice-detail">
          <p className="eyebrow">{scene.requires ? tx('While it is on', 'أثناء التشغيل') : tx('What it does', 'ماذا يفعل')}</p>
          <ul className="ice-scene-list">
            {scene.whileOn.map((line) => (
              <li key={line.en}>{t(line)}</li>
            ))}
          </ul>
          {scene.exits.length > 0 && (
            <>
              <p className="eyebrow">{tx('How it ends', 'كيف ينتهي')}</p>
              <ul className="ice-scene-list">
                {scene.exits.map((line) => (
                  <li key={line.en}>{t(line)}</li>
                ))}
              </ul>
            </>
          )}
          {scene.warning && (
            <div className="ice-callout warning">
              <strong>{tx('Warning', 'تحذير')}</strong>
              <p>{t(scene.warning)}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

/**
 * The battery, gear and charging gun belong to the car, not the screen, so the
 * simulator lets you set them to see a mode refuse to start or switch itself off.
 */
export function CarSimulator({ state, dispatch, compact = false }: Props & { compact?: boolean }) {
  const { tx } = useLanguage()
  const { car } = state

  return (
    <div className={compact ? 'ice-carsim compact' : 'ice-carsim'}>
      <p className="eyebrow">
        {compact
          ? tx('Simulator only', 'للمحاكاة فقط')
          : tx('Simulated car (not on the real screen)', 'سيارة افتراضية (غير موجودة في الشاشة الحقيقية)')}
      </p>
      <label className="ice-slider">
        <span>{tx('Battery', 'البطارية')}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={car.battery}
          onChange={(event) => dispatch({ type: 'set-car', car: { battery: Number(event.target.value) } })}
          aria-label={tx('Simulated battery level', 'مستوى البطارية الافتراضي')}
        />
        <output>{car.battery}%</output>
      </label>
      {!compact && (
        <>
          <div className="ice-carsim-row">
            <span>{tx('Gear', 'ناقل الحركة')}</span>
            <div className="ice-segment" role="radiogroup" aria-label="Gear">
              {(['P', 'R', 'N', 'D'] as Gear[]).map((gear) => (
                <button
                  key={gear}
                  type="button"
                  role="radio"
                  aria-checked={car.gear === gear}
                  className={car.gear === gear ? 'active' : ''}
                  onClick={() => dispatch({ type: 'set-car', car: { gear } })}
                >
                  {gear}
                </button>
              ))}
            </div>
          </div>
          <div className="ice-carsim-row">
            <span>{tx('Charging gun inserted', 'مسدس الشحن موصل')}</span>
            <Switch
              on={car.chargingGun}
              label="Charging gun"
              onChange={(chargingGun) => dispatch({ type: 'set-car', car: { chargingGun } })}
            />
          </div>
        </>
      )}
    </div>
  )
}

/** The full-screen page a running mode leaves on the display. */
export function RunningScene({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const sceneId = state.activeScene
  if (!sceneId || sceneId === 'welcome') return null

  const exit = () => dispatch({ type: 'exit-scene' })
  const option = (id: string) => state.values[sceneKey(sceneId, id)]

  let body
  if (sceneId === 'nap') {
    body = <NapPage minutes={parseInt(String(option('duration')), 10) || 30} sound={String(option('sound'))} onEnd={exit} />
  } else if (sceneId === 'camping') {
    body = (
      <div className="ice-running-body">
        <Tent size={34} aria-hidden />
        <strong>Interior camping</strong>
        <span>A/C 24 °C · Reserved battery {String(option('reserve'))}</span>
        {option('discharge') === true && <span>External discharging on</span>}
        <button type="button" className="ice-primary" onClick={exit}>
          Exit camping mode
        </button>
      </div>
    )
  } else if (sceneId === 'pet') {
    body = (
      <PetPage
        temp={option('keep-ac') === true ? 'Current A/C' : String(option('temp'))}
        locked={state.values[KEYS.doorLock] === true}
        onUnlock={() => dispatch({ type: 'toggle-lock' })}
        onEnd={exit}
      />
    )
  } else {
    const movable = option('type') === 'Movable car wash'
    body = (
      <div className="ice-running-body">
        <Droplets size={34} aria-hidden />
        <strong>{movable ? 'Movable car wash' : 'Fixed car wash'}</strong>
        <span>
          Gear {state.car.gear} · Windows closed · Mirrors folded · Flaps locked
        </span>
        <button type="button" className="ice-primary" onClick={exit}>
          Exit car wash mode
        </button>
      </div>
    )
  }

  return (
    <div className={`ice-overlay running scene-${sceneId}`} role="dialog" aria-label={sceneById(sceneId).name}>
      {body}
      <div className="ice-running-sim" aria-label={tx('Simulator controls', 'أدوات المحاكي')}>
        <CarSimulator state={state} dispatch={dispatch} compact />
        {sceneId !== 'nap' && sceneId !== 'camping' && (
          <div className="ice-segment" role="radiogroup" aria-label="Gear">
            {(['P', 'R', 'N', 'D'] as Gear[]).map((gear) => (
              <button
                key={gear}
                type="button"
                className={state.car.gear === gear ? 'active' : ''}
                onClick={() => dispatch({ type: 'set-car', car: { gear } })}
              >
                {gear}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Counts down the rest, dims after 10 s untouched and blanks after 30 s, as the manual describes. */
function NapPage({ minutes, sound, onEnd }: { minutes: number; sound: string; onEnd: () => void }) {
  const [left, setLeft] = useState(minutes * 60)
  const [idle, setIdle] = useState(0)
  const lastTouch = useRef(0)

  useEffect(() => {
    lastTouch.current = Date.now()
    const timer = window.setInterval(() => {
      setLeft((value) => Math.max(0, value - 1))
      setIdle(Math.floor((Date.now() - lastTouch.current) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (left === 0) onEnd()
  }, [left, onEnd])

  const wake = () => {
    lastTouch.current = Date.now()
    setIdle(0)
  }

  const phase = idle >= 30 ? 'off' : idle >= 10 ? 'dim' : 'on'
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className={`ice-running-body nap ${phase}`} onPointerDown={wake}>
      <Moon size={34} aria-hidden />
      <strong className="ice-saver-time">
        {mm}:{ss}
      </strong>
      <span>Background sound: {sound}</span>
      <button type="button" className="ice-primary" onClick={onEnd}>
        End Now
      </button>
    </div>
  )
}

/** Long-press exit, which only works while the car is unlocked. */
function PetPage({
  temp,
  locked,
  onUnlock,
  onEnd,
}: {
  temp: string
  locked: boolean
  onUnlock: () => void
  onEnd: () => void
}) {
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    if (!holding || locked) return
    const timer = window.setTimeout(onEnd, 3000)
    return () => window.clearTimeout(timer)
  }, [holding, locked, onEnd])

  return (
    <div className="ice-running-body pet">
      <PawPrint size={34} aria-hidden />
      <strong>My owner will be back soon. Don't worry, I'm comfortable.</strong>
      <span>A/C {temp}</span>
      {locked ? (
        <>
          <small>The screen ignores touches while the car is locked.</small>
          <button type="button" className="ice-chip" onClick={onUnlock}>
            Simulate: unlock the car
          </button>
        </>
      ) : (
        <button
          type="button"
          className={holding ? 'ice-hold holding' : 'ice-hold'}
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onKeyDown={(event) => event.key === 'Enter' && onEnd()}
        >
          Hold 3 s to exit
        </button>
      )}
    </div>
  )
}
