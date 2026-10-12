import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Globe, Menu, Moon, Search, Sun, UserRound, X } from 'lucide-react'
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from '../app/navigation'
import { visibleAdminSections } from '../app/panelNav'
import { useAuth } from '../auth/authContext'
import { useSearch } from '../features/search/searchContext'
import { useLanguage, useShortText } from '../i18n/languageContext'
import { LANGUAGES, type Language } from '../i18n/translator'
import { apiConfigured } from '../lib/api'
import { useDismiss } from '../lib/useDismiss'
import { useTheme, type Theme } from '../theme/themeContext'
import { TRIMS, useTrim } from '../vehicle/trimContext'
import type { Trim } from '../content/types'
import { Segmented } from './Segmented'

const LANGUAGE_SHORT: Record<Language, string> = { en: 'EN', ar: 'ع', both: 'EN+ع' }

export function SiteHeader({
  path,
  mobileNavOpen,
  setMobileNavOpen,
}: {
  path: string
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}) {
  const tx = useShortText()
  const { openSearch } = useSearch()

  // The drawer covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!mobileNavOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMobileNavOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileNavOpen, setMobileNavOpen])

  return (
    <header className="site-header">
      <a className="skip-link" href="#main" onClick={(event) => {
        event.preventDefault()
        document.getElementById('main')?.focus()
      }}>
        {tx('Skip to content', 'انتقل إلى المحتوى')}
      </a>

      <div className="header-inner">
        <a className="brand" href="#/" aria-label={tx('iCAUR V27 guide home', 'الصفحة الرئيسية لدليل iCAUR V27')}>
          <span className="brand-mark" aria-hidden="true">i</span>
          <span className="brand-text">
            <strong>iCAUR V27</strong>
            <small>{tx('Egypt Owner Guide', 'دليل المالك - مصر')}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label={tx('Primary navigation', 'التنقل الرئيسي')}>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} path={path} />
          ))}
          <MoreMenu path={path} />
        </nav>

        <div className="header-actions">
          <button
            className="search-trigger"
            type="button"
            onClick={() => openSearch()}
            aria-label={tx('Search guides', 'ابحث في الأدلة')}
            aria-keyshortcuts="/ Control+K"
          >
            <Search size={17} aria-hidden="true" />
            <span className="search-trigger-label" aria-hidden="true">{tx('Search guides', 'ابحث في الأدلة')}</span>
            <kbd aria-hidden="true">/</kbd>
          </button>

          <TrimSwitch className="desktop-only" />
          <PreferencesMenu />
          {apiConfigured && <AccountMenu />}

          <button
            className="icon-button nav-toggle"
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-drawer"
            aria-label={mobileNavOpen ? tx('Close menu', 'أغلق القائمة') : tx('Open menu', 'افتح القائمة')}
          >
            {mobileNavOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {mobileNavOpen && <MobileDrawer path={path} onClose={() => setMobileNavOpen(false)} />}
    </header>
  )
}

function NavLink({ item, path, onClick }: { item: NavItem; path: string; onClick?: () => void }) {
  const tx = useShortText()
  const active = isActive(path, item.href)
  return (
    <a
      className={active ? 'active' : undefined}
      href={`#${item.href}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {tx(item.en, item.ar)}
    </a>
  )
}

function MoreMenu({ path }: { path: string }) {
  const tx = useShortText()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const hasActive = SECONDARY_NAV.some((item) => isActive(path, item.href))

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className={hasActive ? 'more-button active' : 'more-button'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {tx('More', 'المزيد')}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="popover menu-popover">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} path={path} onClick={close} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TrimSwitch({ className }: { className?: string }) {
  const tx = useShortText()
  const { trim, setTrim } = useTrim()
  return (
    <Segmented<Trim>
      className={className ? `trim-switch ${className}` : 'trim-switch'}
      label={tx('Your trim', 'فئة سيارتك')}
      value={trim}
      onChange={setTrim}
      options={TRIMS.map((option) => ({ value: option.value, label: option.label }))}
    />
  )
}

function LanguageSwitch() {
  const tx = useShortText()
  const { language, setLanguage } = useLanguage()
  return (
    <Segmented<Language>
      label={tx('Language', 'اللغة')}
      value={language}
      onChange={setLanguage}
      options={LANGUAGES.map((option) => ({ value: option.value, label: option.label }))}
    />
  )
}

function ThemeSwitch() {
  const tx = useShortText()
  const { theme, setTheme } = useTheme()
  return (
    <Segmented<Theme>
      label={tx('Appearance', 'المظهر')}
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'light', label: <><Sun size={15} aria-hidden="true" /> {tx('Light', 'فاتح')}</> },
        { value: 'dark', label: <><Moon size={15} aria-hidden="true" /> {tx('Dark', 'داكن')}</> },
      ]}
    />
  )
}

function PreferencesMenu() {
  const tx = useShortText()
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)

  return (
    <div className="popover-anchor desktop-only" ref={ref}>
      <button
        type="button"
        className="pill-button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={tx('Language and appearance', 'اللغة والمظهر')}
        onClick={() => setOpen(!open)}
      >
        <Globe size={17} aria-hidden="true" />
        <span>{LANGUAGE_SHORT[language]}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="popover settings-popover">
          <p className="popover-label">{tx('Language', 'اللغة')}</p>
          <LanguageSwitch />
          <p className="popover-label">{tx('Appearance', 'المظهر')}</p>
          <ThemeSwitch />
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const tx = useShortText()
  const { user, can, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)

  if (!user) {
    return (
      <a className="pill-button desktop-only" href="#/signin">
        <UserRound size={17} aria-hidden="true" />
        {tx('Sign in', 'دخول')}
      </a>
    )
  }

  return (
    <div className="popover-anchor desktop-only" ref={ref}>
      <button
        type="button"
        className="avatar-button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={tx(`Account: ${user.name}`, `الحساب: ${user.name}`)}
        onClick={() => setOpen(!open)}
      >
        {user.name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="popover menu-popover">
          <p className="popover-label">{user.name}</p>
          <a href="#/account" onClick={close}>{tx('My panel', 'لوحتي')}</a>
          <a href="#/account/new-post" onClick={close}>{tx('Write a post', 'اكتب مقالا')}</a>
          {visibleAdminSections(can).length > 0 && (
            <a href="#/admin" onClick={close}>{tx('Admin panel', 'لوحة الإدارة')}</a>
          )}
          <button type="button" onClick={() => { close(); signOut() }}>
            {tx('Sign out', 'خروج')}
          </button>
        </div>
      )}
    </div>
  )
}

function MobileDrawer({ path, onClose }: { path: string; onClose: () => void }) {
  const tx = useShortText()
  const { user, can, signOut } = useAuth()

  return (
    <div
      className="mobile-drawer"
      id="mobile-drawer"
      // Tapping the link for the current page fires no hashchange, so close here too.
      onClick={(event) => (event.target as HTMLElement).closest('a') && onClose()}
    >
      <section>
        <p className="popover-label">{tx('Your trim', 'فئة سيارتك')}</p>
        <TrimSwitch />
      </section>

      <nav aria-label={tx('Primary navigation', 'التنقل الرئيسي')}>
        <a href="#/" className={path === '/' ? 'active' : undefined}>{tx('Home', 'البداية')}</a>
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} path={path} />
        ))}
      </nav>

      <nav aria-label={tx('More pages', 'صفحات أخرى')}>
        <p className="popover-label">{tx('Research & community', 'البحث والمجتمع')}</p>
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} path={path} />
        ))}
      </nav>

      <section>
        <p className="popover-label">{tx('Language', 'اللغة')}</p>
        <LanguageSwitch />
        <p className="popover-label">{tx('Appearance', 'المظهر')}</p>
        <ThemeSwitch />
      </section>

      {apiConfigured && (
        <nav aria-label={tx('Account', 'الحساب')}>
          <p className="popover-label">{user ? user.name : tx('Account', 'الحساب')}</p>
          {user ? (
            <>
              <a href="#/account">{tx('My panel', 'لوحتي')}</a>
              <a href="#/account/new-post">{tx('Write a post', 'اكتب مقالا')}</a>
              {visibleAdminSections(can).length > 0 && (
                <a href="#/admin" className="account-admin">
                  {tx('Admin panel', 'لوحة الإدارة')}
                </a>
              )}
              <button type="button" onClick={signOut}>{tx('Sign out', 'خروج')}</button>
            </>
          ) : (
            <a href="#/signin">{tx('Sign in', 'تسجيل الدخول')}</a>
          )}
        </nav>
      )}
    </div>
  )
}
