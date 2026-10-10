import type { ReactNode } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  /** Accessible name when `label` is an icon or abbreviation. */
  title?: string
}

/** A row of mutually exclusive buttons, e.g. Play / Wild or Light / Dark. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={className ? `segmented ${className}` : 'segmented'} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.title}
          title={option.title}
          className={option.value === value ? 'selected' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
