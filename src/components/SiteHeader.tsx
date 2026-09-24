import { useMemo, useState } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { getCategory } from '../content'
import { searchFeatures } from '../features/search/searchFeatures'
import { useLanguage } from '../i18n/languageContext'
import { LANGUAGES, type Language } from '../i18n/translator'
import { guideHref } from '../lib/links'
import { useAuth } from '../auth/authContext'
import { apiConfigured } from '../lib/api'
import { useTheme, type Theme } from '../theme/themeContext'
import { TRIMS, useTrim } from '../vehicle/trimContext'
import { VerificationBadge } from './VerificationBadge'

const NAV_ITEMS = [
  { href: '/', en: 'Home', ar: 'البداية' },
  { href: '/guides', en: 'Guides', ar: 'الأدلة' },
  { href: '/guides/screen-map', en: 'Screen', ar: 'الشاشة' },
  { href: '/egypt', en: 'Egypt Prices', ar: 'أسعار مصر' },
  { href: '/specs', en: 'Specs', ar: 'المواصفات' },
  { href: '/compare/play-vs-wild', en: 'Play vs Wild', ar: 'Play vs Wild' },
  { href: '/reviews', en: 'Reviews', ar: 'المراجعات' },
  { href: '/videos', en: 'Videos', ar: 'الفيديوهات' },
  { href: '/sources', en: 'Sources', ar: 'المصادر' },
  { href: '/blog', en: 'Posts', ar: 'المقالات' },
  { href: '/glossary', en: 'Glossary', ar: 'القاموس' },
]

export function SiteHeader({
  route,
  mobileNavOpen,
  setMobileNavOpen,
}: {
  route: string
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}) {
  const { tx, pair, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { trim, setTrim } = useTrim()
  const { user, isAdmin, signOut } = useAuth()
  const [query, setQuery] = useState('')

  const results = useMemo(() => searchFeatures(query), [query])

  return (
    <header className="site-header">
      <div className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark">i</span>
          <span>
            <strong>iCAUR V27</strong>
            <small>{tx('Egypt Owner Guide', 'دليل المالك - مصر')}</small>
          </span>
        </a>

        <button
          className="icon-button nav-toggle"
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-expanded={mobileNavOpen}
          aria-label={tx('Menu', 'القائمة')}
        >
          {mobileNavOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav
          className={mobileNavOpen ? 'nav open' : 'nav'}
          aria-label={tx('Primary navigation', 'التنقل الرئيسي')}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              className={route === item.href ? 'active' : ''}
              href={`#${item.href}`}
              aria-current={route === item.href ? 'page' : undefined}
            >
              {tx(item.en, item.ar)}
            </a>
          ))}
        </nav>
      </div>

      <div className="utility-bar">
        <label className="search-box">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('Search: spare wheel, Lane Assist', 'ابحث: الاستبن، Lane Assist')}
            aria-label={tx('Search', 'بحث')}
          />
        </label>

        <div className="header-selects">
          <label className="select-control">
            <span>{tx('Language', 'اللغة')}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-control">
            <span>{tx('Mode', 'الوضع')}</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
              <option value="light">{tx('Light', 'فاتح')}</option>
              <option value="dark">{tx('Dark', 'داكن')}</option>
            </select>
          </label>
        </div>

        {apiConfigured && (
          <div className="account-controls">
            {user ? (
              <>
                {isAdmin && (
                  <a className="account-link" href="#/admin">
                    {tx('Review queue', 'قائمة المراجعة')}
                  </a>
                )}
                <a className="account-link" href="#/contribute">
                  {tx('Contribute', 'ساهم')}
                </a>
                <button className="account-link" type="button" onClick={signOut}>
                  {tx('Sign out', 'خروج')}
                </button>
              </>
            ) : (
              <a className="account-link" href="#/signin">
                {tx('Sign in', 'تسجيل الدخول')}
              </a>
            )}
          </div>
        )}

        <div className="trim-toggle" role="group" aria-label={tx('Trim selector', 'اختيار الفئة')}>
          {TRIMS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={trim === option.value ? 'selected' : ''}
              aria-pressed={trim === option.value}
              onClick={() => setTrim(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((feature) => {
            const category = getCategory(feature.categoryId)
            return (
              <a key={feature.id} href={guideHref(feature.slug)} onClick={() => setQuery('')}>
                <span>{pair(feature.name)}</span>
                <small>{category ? pair(category.name) : feature.name.en}</small>
                <VerificationBadge status={feature.availability[trim]} />
              </a>
            )
          })}
        </div>
      )}
    </header>
  )
}
