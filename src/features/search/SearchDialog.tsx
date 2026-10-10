import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, CornerDownLeft, Search, SearchX, X } from 'lucide-react'
import { POPULAR_SLUGS, getCategory, getFeatures } from '../../content'
import { VerificationBadge } from '../../components/VerificationBadge'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { guideHref } from '../../lib/links'
import { useTrim } from '../../vehicle/trimContext'
import { searchFeatures } from './searchFeatures'

const SUGGESTIONS = ['spare', 'استبن', 'lane', 'charging', 'tyre']

export function SearchDialog({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const { t } = useLanguage()
  const tx = useShortText()
  const { trim } = useTrim()
  const [query, setQuery] = useState(initialQuery)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const trimmed = query.trim()
  const results = useMemo(
    () => (trimmed ? searchFeatures(trimmed) : getFeatures(POPULAR_SLUGS)),
    [trimmed],
  )

  // Lock page scroll behind the dialog and hand focus back when it closes.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [])

  const go = (index: number) => {
    const feature = results[index]
    if (feature) window.location.hash = guideHref(feature.slug)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(activeIndex)
    }
  }

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listId])

  return (
    <div className="search-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={tx('Search guides', 'ابحث في الأدلة')}
        onKeyDown={onKeyDown}
      >
        <div className="search-field">
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder={tx('What do you need help with?', 'ما الذي تحتاج المساعدة فيه؟')}
            aria-label={tx('Search guides', 'ابحث في الأدلة')}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            enterKeyHint="go"
          />
          <button type="button" className="search-close" onClick={onClose} aria-label={tx('Close search', 'أغلق البحث')}>
            <X size={18} />
          </button>
        </div>

        {!trimmed && (
          <div className="search-suggestions">
            <span>{tx('Try', 'جرّب')}:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion)
                  setActiveIndex(0)
                  inputRef.current?.focus()
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="search-body">
          {results.length > 0 ? (
            <>
              <p className="search-group-label">
                {trimmed
                  ? tx(`${results.length} matching guides`, `${results.length} دليل مطابق`)
                  : tx('Popular guides', 'الأدلة الأكثر استخداما')}
              </p>
              <ul className="search-results" id={listId} role="listbox">
                {results.map((feature, index) => {
                  const category = getCategory(feature.categoryId)
                  return (
                    <li key={feature.id} role="presentation">
                      <a
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={index === activeIndex ? 'active' : undefined}
                        href={guideHref(feature.slug)}
                        onPointerMove={() => setActiveIndex(index)}
                      >
                        <span className="search-result-text">
                          <strong>{t(feature.name)}</strong>
                          <small>{category ? t(category.name) : ''}</small>
                        </span>
                        <VerificationBadge status={feature.availability[trim]} compact />
                        <ChevronRight size={16} className="search-result-arrow" aria-hidden="true" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <div className="search-empty">
              <SearchX size={28} aria-hidden="true" />
              <strong>{tx(`No guides match “${trimmed}”`, `لا توجد أدلة تطابق “${trimmed}”`)}</strong>
              <span>
                {tx(
                  'Try a shorter word, or search in the other language.',
                  'جرّب كلمة أقصر، أو ابحث باللغة الأخرى.',
                )}
              </span>
              <a className="inline-link" href="#/guides">
                {tx('Browse all guides', 'تصفح كل الأدلة')} <ChevronRight size={16} />
              </a>
            </div>
          )}
        </div>

        <footer className="search-footer" aria-hidden="true">
          <span>
            <kbd><ArrowUp size={12} /></kbd>
            <kbd><ArrowDown size={12} /></kbd>
            {tx('move', 'تنقل')}
          </span>
          <span>
            <kbd><CornerDownLeft size={12} /></kbd>
            {tx('open', 'افتح')}
          </span>
          <span>
            <kbd>Esc</kbd>
            {tx('close', 'إغلاق')}
          </span>
        </footer>
      </div>
    </div>
  )
}
