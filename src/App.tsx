import { useCallback, useEffect, useState } from 'react'
import { resolvePanelRoute, resolveRoute } from './app/routes'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/authContext'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { SearchProvider } from './features/search/SearchProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import { useLanguage } from './i18n/languageContext'
import { splitRoute, useHashRoute } from './lib/useHashRoute'
import { ThemeProvider } from './theme/ThemeProvider'
import { TrimProvider } from './vehicle/TrimProvider'
import { useTrim } from './vehicle/trimContext'
import './App.css'
import './components/panel/panel.css'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TrimProvider>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </TrimProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

/** An owner's saved trim becomes the site's trim when they sign in or update their profile. */
function useProfileTrim() {
  const { user } = useAuth()
  const { setTrim } = useTrim()
  const profileTrim = user?.trim

  useEffect(() => {
    if (profileTrim === 'play' || profileTrim === 'wild') setTrim(profileTrim)
  }, [profileTrim, setTrim])
}

function Shell() {
  const { language } = useLanguage()
  useProfileTrim()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  const route = useHashRoute(closeMobileNav)
  const { path, params } = splitRoute(route)

  const panel = resolvePanelRoute(path, params, route)
  if (panel) return <div className={`app-shell language-${language}`}>{panel}</div>

  return (
    <div className={`app-shell language-${language}`}>
      <SearchProvider>
        <SiteHeader path={path} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} />
        {/* Keyed by route so each page starts fresh, e.g. a new guide's filters. */}
        <main id="main" tabIndex={-1} key={route}>
          {resolveRoute(path, params)}
        </main>
        <SiteFooter />
      </SearchProvider>
    </div>
  )
}
