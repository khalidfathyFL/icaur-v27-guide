import { useCallback, useState } from 'react'
import { resolveRoute } from './app/routes'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { LanguageProvider } from './i18n/LanguageProvider'
import { useLanguage } from './i18n/languageContext'
import { useHashRoute } from './lib/useHashRoute'
import { ThemeProvider } from './theme/ThemeProvider'
import { TrimProvider } from './vehicle/TrimProvider'
import './App.css'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TrimProvider>
          <Shell />
        </TrimProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

function Shell() {
  const { language } = useLanguage()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  const route = useHashRoute(closeMobileNav)

  return (
    <div className={`app-shell language-${language}`}>
      <SiteHeader route={route} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} />
      <main>{resolveRoute(route)}</main>
      <SiteFooter />
    </div>
  )
}
