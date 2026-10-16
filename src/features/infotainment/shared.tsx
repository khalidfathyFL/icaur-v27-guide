import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import type { ControlSpec } from '../../content/infotainment'
import type { ControlValue } from './useInfotainment'

/** The car's on/off switch. */
export function Switch({
  on,
  label,
  onChange,
}: {
  on: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      className="ice-switch"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className="ice-switch-track" data-on={on}>
        <span className="ice-switch-thumb" />
      </span>
    </button>
  )
}

/**
 * Renders one control spec as the car draws it. Settings, scene modes and the
 * recorder all share this, so every switch and list on the screen behaves alike.
 */
export function SpecControl({
  spec,
  label,
  value,
  onChange,
  onAction,
}: {
  spec: ControlSpec
  label: string
  value: ControlValue | undefined
  onChange: (value: ControlValue, toast: string) => void
  onAction?: (action: string) => void
}) {
  if (spec.kind === 'toggle') {
    return <Switch on={value === true} label={label} onChange={(next) => onChange(next, `${label}: ${next ? 'ON' : 'OFF'}`)} />
  }

  if (spec.kind === 'choice') {
    return (
      <div className="ice-segment" role="radiogroup" aria-label={label}>
        {spec.options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? 'active' : ''}
            onClick={() => onChange(option, `${label}: ${option}`)}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  if (spec.kind === 'slider') {
    const current = typeof value === 'number' ? value : spec.defaultValue
    const fill = ((current - spec.min) / (spec.max - spec.min)) * 100
    return (
      <label className="ice-slider">
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={current}
          aria-label={label}
          style={{ '--fill': `${fill}%` } as CSSProperties}
          onChange={(event) => {
            const next = Number(event.target.value)
            onChange(next, `${label}: ${next}${spec.unit ?? ''}`)
          }}
        />
        <output>
          {current}
          {spec.unit}
        </output>
      </label>
    )
  }

  return (
    <div className="ice-actions">
      {spec.actions.map((name) => (
        <button key={name} type="button" onClick={() => onAction?.(name)}>
          {name}
        </button>
      ))}
    </div>
  )
}

/** A small floating card anchored inside the screen, closed by its X or by tapping outside. */
export function Popover({
  title,
  className,
  onClose,
  children,
}: {
  title: string
  className?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <button type="button" className="ice-scrim" aria-label="Close" onClick={onClose} />
      <div className={`ice-popover ${className ?? ''}`} role="dialog" aria-label={title}>
        <header>
          <strong>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </>
  )
}

/** Header strip used by every full-screen app: a back button and the app's name. */
export function AppHeader({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  return (
    <div className="ice-app-head">
      <button type="button" onClick={onBack} aria-label="Back">
        ‹
      </button>
      <strong>{title}</strong>
      {children && <div className="ice-app-head-extra">{children}</div>}
    </div>
  )
}
