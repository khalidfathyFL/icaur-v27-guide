import { useEffect, useState } from 'react'
import { Sun } from 'lucide-react'
import { controlCenterToggles, infotainmentMenus, type QuickToggle } from '../../content/infotainment'
import { controlKey, KEYS, type InfotainmentDispatch, type InfotainmentState } from './useInfotainment'
import { useClock } from './screenKit'

type Props = { state: InfotainmentState; dispatch: InfotainmentDispatch }

const headlampOptions = (() => {
  const spec = infotainmentMenus
    .find((menu) => menu.id === 'lighting')
    ?.controls.find((control) => control.id === 'headlamp')?.control
  // The control center offers the same switch minus the rear fog lamp, which has its own tile.
  return spec?.kind === 'choice' ? spec.options.filter((option) => option !== 'Rear fog lamp') : []
})()

/** Quick tiles that mirror a setting stay in step with the settings page, both ways. */
function isOn(toggle: QuickToggle, state: InfotainmentState): boolean {
  if (toggle.setting) {
    const value = state.values[controlKey(toggle.setting.menuId, toggle.setting.controlId)]
    return toggle.setting.on ? value === toggle.setting.on : value === true
  }
  if (toggle.effect === 'mirror-fold') return state.mirrorsFolded
  if (toggle.effect === 'recording') return state.recorder.recording
  if (toggle.effect === 'car-wash') return state.activeScene === 'car-wash'
  return state.values[`cc.${toggle.id}`] === true
}

/** Pulled down from the top of the screen (manual "Control center"). */
export function ControlCenter({ state, dispatch }: Props) {
  const headlamp = state.values[KEYS.headlamp]
  const brightness = Number(state.values[KEYS.brightness] ?? 80)
  const autoBrightness = state.values[KEYS.autoBrightness] === true

  const press = (toggle: QuickToggle) => {
    const next = !isOn(toggle, state)
    const toast = `${toggle.label}: ${next ? 'ON' : 'OFF'}`

    if (toggle.setting) {
      const { menuId, controlId, on, off } = toggle.setting
      const value = on && off ? (next ? on : off) : next
      return dispatch({ type: 'set-value', key: controlKey(menuId, controlId), value, toast })
    }

    switch (toggle.effect) {
      case 'mirror-fold':
        return dispatch({ type: 'toggle-mirrors' })
      case 'recording':
        return dispatch({ type: 'toggle-recording' })
      case 'screensaver':
        return dispatch({ type: 'set-overlay', overlay: 'screensaver' })
      case 'screen-cleaning':
        return dispatch({ type: 'set-overlay', overlay: 'screen-cleaning' })
      case 'power-off':
        return dispatch({ type: 'set-overlay', overlay: 'power-off' })
      case 'car-wash':
        if (state.activeScene === 'car-wash') return dispatch({ type: 'exit-scene' })
        return dispatch({ type: 'open-scene', sceneId: 'car-wash' })
      default:
        return dispatch({ type: 'set-value', key: `cc.${toggle.id}`, value: next, toast })
    }
  }

  return (
    <>
      <button type="button" className="ice-scrim" aria-label="Close control center" onClick={() => dispatch({ type: 'toggle-control-center' })} />
      <div className="ice-cc" role="dialog" aria-label="Control center">
        <div className="ice-cc-row">
          <span className="ice-cc-label">Headlamp</span>
          <div className="ice-segment" role="radiogroup" aria-label="Headlamp">
            {headlampOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={headlamp === option}
                className={headlamp === option ? 'active' : ''}
                onClick={() => dispatch({ type: 'set-value', key: KEYS.headlamp, value: option, toast: `Headlamp: ${option}` })}
              >
                {option === 'Close' ? 'OFF' : option}
              </button>
            ))}
          </div>
        </div>

        <div className="ice-cc-row">
          <span className="ice-cc-label">
            <Sun size={15} aria-hidden /> Brightness
          </span>
          <input
            className="ice-cc-brightness"
            type="range"
            min={10}
            max={100}
            step={5}
            value={brightness}
            aria-label="Head unit screen brightness"
            onChange={(event) => dispatch({ type: 'set-value', key: KEYS.brightness, value: Number(event.target.value) })}
          />
          <button
            type="button"
            className={autoBrightness ? 'ice-chip active' : 'ice-chip'}
            aria-pressed={autoBrightness}
            onClick={() => dispatch({ type: 'set-value', key: KEYS.autoBrightness, value: !autoBrightness })}
          >
            Auto
          </button>
        </div>

        <div className="ice-cc-grid">
          {controlCenterToggles.map((toggle) => {
            const on = isOn(toggle, state)
            return (
              <button
                key={toggle.id}
                type="button"
                className={on ? 'ice-cc-tile on' : 'ice-cc-tile'}
                aria-pressed={toggle.effect && !['mirror-fold', 'recording', 'car-wash'].includes(toggle.effect) ? undefined : on}
                onClick={() => press(toggle)}
              >
                {toggle.label}
              </button>
            )
          })}
        </div>

        <button type="button" className="ice-cc-close" onClick={() => dispatch({ type: 'toggle-control-center' })} aria-label="Close">
          <span />
        </button>
      </div>
    </>
  )
}

/** Screen saver, screen cleaning and power-off take over the whole display. */
export function Overlay({ state, dispatch }: Props) {
  const clock = useClock(state.values[KEYS.timeFormat] === '12-hour time')
  const close = () => dispatch({ type: 'set-overlay', overlay: null })

  if (state.overlay === 'screensaver') {
    const style = state.values[KEYS.screensaver]
    return (
      <button type="button" className={`ice-overlay saver ${style === 'Black screen display' ? 'black' : ''}`} onClick={close}>
        {style === 'Hand clock' && <AnalogClock />}
        {style === 'Digital clock' && <span className="ice-saver-time">{clock}</span>}
        <small>Touch to wake</small>
      </button>
    )
  }

  if (state.overlay === 'screen-cleaning') return <CleaningOverlay onDone={close} />

  if (state.overlay === 'power-off') {
    return (
      <button type="button" className="ice-overlay black" onClick={close}>
        <small>Vehicle powered off. Touch to power on.</small>
      </button>
    )
  }

  return null
}

function AnalogClock() {
  const now = new Date()
  const minute = now.getMinutes()
  const hour = (now.getHours() % 12) + minute / 60
  return (
    <svg className="ice-analog" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" />
      <line x1="50" y1="50" x2="50" y2="26" transform={`rotate(${hour * 30} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="14" transform={`rotate(${minute * 6} 50 50)`} />
    </svg>
  )
}

/** Touches are ignored while cleaning; holding the exit button for 3 seconds ends it. */
function CleaningOverlay({ onDone }: { onDone: () => void }) {
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    if (!holding) return
    const timer = window.setTimeout(onDone, 3000)
    return () => window.clearTimeout(timer)
  }, [holding, onDone])

  return (
    <div className="ice-overlay cleaning" role="dialog" aria-label="Screen cleaning">
      <strong>Screen cleaning</strong>
      <small>Touch is disabled. Wipe gently with a dry microfibre cloth.</small>
      <button
        type="button"
        className={holding ? 'ice-hold holding' : 'ice-hold'}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onKeyDown={(event) => event.key === 'Enter' && onDone()}
      >
        Hold 3 s to exit
      </button>
    </div>
  )
}
