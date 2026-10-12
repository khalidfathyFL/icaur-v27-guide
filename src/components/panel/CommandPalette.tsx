import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react'
import { useShortText } from '../../i18n/languageContext'

export type PaletteItem = {
  id: string
  label: string
  /** Where it lives, shown muted on the right: a group name, an email. */
  hint?: string
  href: string
  icon?: LucideIcon
}

/**
 * Ctrl/⌘+K jump list: every section the person can open, plus whatever
 * records the page offers (accounts, posts), loaded the first time it opens.
 */
export function CommandPalette({
  open,
  onClose,
  items,
  loadMore,
}: {
  open: boolean
  onClose: () => void
  items: PaletteItem[]
  loadMore?: () => Promise<PaletteItem[]>
}) {
  const tx = useShortText()
  const ref = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [extra, setExtra] = useState<PaletteItem[] | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open || extra !== null || !loadMore) return
    let cancelled = false
    loadMore()
      .then((loaded) => {
        if (!cancelled) setExtra(loaded)
      })
      .catch(() => {
        if (!cancelled) setExtra([])
      })
    return () => {
      cancelled = true
    }
  }, [open, extra, loadMore])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const all = [...items, ...(extra ?? [])]
    if (!needle) return items.slice(0, 12)
    return all.filter((item) => `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(needle)).slice(0, 12)
  }, [items, extra, query])

  const selected = Math.min(cursor, Math.max(results.length - 1, 0))

  function go(item: PaletteItem | undefined) {
    if (!item) return
    window.location.hash = item.href
    setQuery('')
    onClose()
  }

  if (!open) return null

  return (
    <dialog
      ref={ref}
      className="panel-palette"
      aria-label={tx('Jump to', 'انتقل إلى')}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="panel-palette-inner">
        <label className="panel-palette-input">
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setCursor((selected + 1) % Math.max(results.length, 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setCursor((selected - 1 + results.length) % Math.max(results.length, 1))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                go(results[selected])
              }
            }}
            placeholder={tx('Search sections, accounts, posts…', 'ابحث في الأقسام والحسابات والمقالات…')}
            aria-label={tx('Search', 'بحث')}
          />
          <kbd>Esc</kbd>
        </label>

        <ul role="listbox">
          {results.map((item, index) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={index === selected}
                className={index === selected ? 'active' : undefined}
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(item)}
              >
                {Icon && <Icon size={16} aria-hidden="true" />}
                <span>{item.label}</span>
                {item.hint && <small>{item.hint}</small>}
                {index === selected && <CornerDownLeft size={14} aria-hidden="true" />}
              </li>
            )
          })}
          {results.length === 0 && <li className="panel-palette-empty">{tx('No matches', 'لا توجد نتائج')}</li>}
        </ul>
      </div>
    </dialog>
  )
}
