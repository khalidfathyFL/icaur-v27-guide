import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeftRight,
  CarFront,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../auth/authContext'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { LANGUAGES, type Language } from '../../i18n/translator'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useTheme } from '../../theme/themeContext'
import { visibleAdminSections } from '../../app/panelNav'
import { Avatar } from './blocks'
import { CommandPalette, type PaletteItem } from './CommandPalette'
import { FeedbackProvider } from './FeedbackProvider'

export type ShellItem = {
  key: string
  label: string
  description?: string
  icon: LucideIcon
  /** Work waiting, shown as a count pill. */
  badge?: number
}

export type ShellGroup = { key: string; label: string; icon: LucideIcon; items: ShellItem[] }

/**
 * The full-screen frame shared by the admin panel and the owner's own panel,
 * on the same pattern as the MicroBIM admin: a sidebar of grouped sections
 * with a user card at the foot, a topbar with the page title, search and
 * preferences, and the section's content below.
 */
export function PanelShell({
  kind,
  groups,
  active,
  accordion = false,
  actions,
  loadSearch,
  children,
}: {
  kind: 'admin' | 'account'
  groups: ShellGroup[]
  active: string
  /** Admin has enough sections to want one group open at a time; the owner panel does not. */
  accordion?: boolean
  actions?: ReactNode
  loadSearch?: () => Promise<PaletteItem[]>
  children: ReactNode
}) {
  const tx = useShortText()
  const { user, can, signOut } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const items = groups.flatMap((group) => group.items)
  const activeItem = items.find((item) => item.key === active)
  const hrefFor = (key: string) => `#/${kind}/${key}`

  useDocumentTitle(activeItem?.label ?? (kind === 'admin' ? tx('Admin', 'الإدارة') : tx('My account', 'حسابي')))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const paletteItems = useMemo<PaletteItem[]>(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          id: `section-${item.key}`,
          label: item.label,
          hint: group.label,
          href: `#/${kind}/${item.key}`,
          icon: item.icon,
        })),
      ),
    [groups, kind],
  )

  const closePalette = useCallback(() => setPaletteOpen(false), [])

  const otherPanel =
    kind === 'admin'
      ? { href: '#/account', label: tx('My account', 'حسابي') }
      : visibleAdminSections(can).length > 0
        ? { href: '#/admin', label: tx('Admin panel', 'لوحة الإدارة') }
        : null

  return (
    <FeedbackProvider>
      <div className={navOpen ? 'panel nav-open' : 'panel'}>
        <aside className="panel-sidebar" id="panel-sidebar">
          <div className="panel-brand">
            <a href="#/" aria-label={tx('Back to the site', 'العودة للموقع')}>
              <span className="panel-brand-mark">
                <CarFront size={18} aria-hidden="true" />
              </span>
              <strong>iCAUR V27</strong>
            </a>
            <span className="panel-brand-tag">{kind === 'admin' ? tx('Admin', 'إدارة') : tx('Owner', 'مالك')}</span>
            <button
              type="button"
              className="panel-icon-button panel-nav-close"
              onClick={() => setNavOpen(false)}
              aria-label={tx('Close menu', 'إغلاق القائمة')}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="panel-nav" aria-label={kind === 'admin' ? tx('Admin sections', 'أقسام الإدارة') : tx('Account sections', 'أقسام الحساب')}>
            {groups.map((group) => (
              <NavGroup
                key={group.key}
                group={group}
                active={active}
                accordion={accordion}
                hrefFor={hrefFor}
                onNavigate={() => setNavOpen(false)}
              />
            ))}
          </nav>

          {user && (
            <div className="panel-usercard">
              <Avatar name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <small>{user.role === 'admin' ? tx('Administrator', 'مشرف') : user.email}</small>
              </div>
              <button
                type="button"
                className="panel-icon-button"
                onClick={() => {
                  signOut()
                  window.location.hash = '#/'
                }}
                aria-label={tx('Sign out', 'خروج')}
                title={tx('Sign out', 'خروج')}
              >
                <LogOut size={17} className="flip-rtl" />
              </button>
            </div>
          )}
        </aside>

        <button
          type="button"
          className="panel-backdrop"
          aria-label={tx('Close menu', 'إغلاق القائمة')}
          tabIndex={-1}
          onClick={() => setNavOpen(false)}
        />

        <div className="panel-body">
          <header className="panel-topbar">
            <button
              type="button"
              className="panel-icon-button panel-nav-open"
              onClick={() => setNavOpen(true)}
              aria-expanded={navOpen}
              aria-controls="panel-sidebar"
              aria-label={tx('Open menu', 'فتح القائمة')}
            >
              <Menu size={20} />
            </button>

            <div className="panel-title">
              <h1>{activeItem?.label ?? tx('No access', 'غير مسموح')}</h1>
              {activeItem?.description && <p>{activeItem.description}</p>}
            </div>

            <div className="panel-topbar-actions">
              <button type="button" className="panel-search-trigger" onClick={() => setPaletteOpen(true)}>
                <Search size={16} aria-hidden="true" />
                <span>{tx('Search…', 'بحث…')}</span>
                <kbd>Ctrl K</kbd>
              </button>
              {actions}
              <ThemeToggle />
              <LanguageSelect />
              {otherPanel && (
                <a className="panel-button ghost panel-hide-sm" href={otherPanel.href}>
                  <ArrowLeftRight size={16} aria-hidden="true" />
                  {otherPanel.label}
                </a>
              )}
              <a className="panel-button primary panel-hide-sm" href="#/">
                {tx('View site', 'عرض الموقع')}
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </header>

          <main className="panel-main" id="main" tabIndex={-1}>
            {children}
          </main>
        </div>

        <CommandPalette
          open={paletteOpen}
          onClose={closePalette}
          items={[
            ...paletteItems,
            ...(otherPanel ? [{ id: 'other-panel', label: otherPanel.label, href: otherPanel.href, icon: ArrowLeftRight }] : []),
            { id: 'site', label: tx('View site', 'عرض الموقع'), href: '#/', icon: ExternalLink },
          ]}
          loadMore={loadSearch}
        />
      </div>
    </FeedbackProvider>
  )
}

function NavGroup({
  group,
  active,
  accordion,
  hrefFor,
  onNavigate,
}: {
  group: ShellGroup
  active: string
  accordion: boolean
  hrefFor: (key: string) => string
  onNavigate: () => void
}) {
  const containsActive = group.items.some((item) => item.key === active)
  // `null` means "follow the active section"; a click pins it open or shut.
  const [pinned, setPinned] = useState<boolean | null>(null)
  const expanded = !accordion || (pinned ?? containsActive)
  const pending = group.items.reduce((total, item) => total + (item.badge ?? 0), 0)
  const GroupIcon = group.icon

  return (
    <div className="panel-nav-group">
      {accordion ? (
        <button
          type="button"
          className={expanded ? 'panel-nav-group-head expanded' : 'panel-nav-group-head'}
          aria-expanded={expanded}
          onClick={() => setPinned(!expanded)}
        >
          <GroupIcon size={18} aria-hidden="true" />
          <span>{group.label}</span>
          {!expanded && pending > 0 && <i className="panel-dot" aria-hidden="true" />}
          <ChevronDown size={15} className="panel-chevron" aria-hidden="true" />
        </button>
      ) : (
        <p className="panel-nav-label">{group.label}</p>
      )}

      {expanded && (
        <div className={accordion ? 'panel-nav-items nested' : 'panel-nav-items'}>
          {group.items.map((item) => {
            const ItemIcon = item.icon
            const isActive = item.key === active
            return (
              <a
                key={item.key}
                href={hrefFor(item.key)}
                className={isActive ? 'panel-nav-item active' : 'panel-nav-item'}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
              >
                <ItemIcon size={17} aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge ? <em className="panel-count">{item.badge}</em> : null}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const tx = useShortText()
  const { theme, setTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="panel-icon-button"
      onClick={() => setTheme(next)}
      aria-label={next === 'dark' ? tx('Dark mode', 'الوضع الداكن') : tx('Light mode', 'الوضع الفاتح')}
      title={next === 'dark' ? tx('Dark mode', 'الوضع الداكن') : tx('Light mode', 'الوضع الفاتح')}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function LanguageSelect() {
  const tx = useShortText()
  const { language, setLanguage } = useLanguage()
  return (
    <label className="panel-language">
      <span className="visually-hidden">{tx('Language', 'اللغة')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        {LANGUAGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
