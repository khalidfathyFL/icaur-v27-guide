import type { CSSProperties } from 'react'
import { useLanguage } from '../../i18n/languageContext'
import { KEYS, useInfotainment, type InfotainmentState } from './useInfotainment'
import { DockPanel, Dock, StatusBar, StatusPanel } from './chrome'
import { HomeScreen } from './HomeScreen'
import { SettingsScreen } from './SettingsScreen'
import { ControlCenter, Overlay } from './ControlCenter'
import { RunningScene, SceneScreen, ScenesApp } from './SceneModes'
import { RecorderApp } from './RecorderApp'
import { AppCenter, CameraApp, EnergyApp, MediaApp, NavigationApp, PhoneApp, TpmsApp, WindowsApp } from './apps'
import './infotainment.css'

const STATUS_PANELS = new Set(['access', 'info', 'fault', 'connection', 'network'])

/** Display › Theme. Auto follows the time of day, as the car does. */
function screenTheme(state: InfotainmentState): 'light' | 'dark' {
  const theme = state.values[KEYS.theme]
  if (theme === 'Dark mode') return 'dark'
  if (theme === 'Light mode') return 'light'
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'light' : 'dark'
}

/**
 * The V27 centre screen, laid out after the owner's manual ("Head Unit Display
 * View"): status bar on top, the car as the home page, and a dock along the bottom.
 */
export function InfotainmentSimulator() {
  const { tx } = useLanguage()
  const { state, dispatch, activeMenu, activeControl } = useInfotainment()
  const { view } = state

  // Dim the picture with the brightness bar, but never so far that the page becomes unreadable.
  const brightness = 0.6 + (Number(state.values[KEYS.brightness] ?? 80) / 100) * 0.4

  let stage
  switch (view.kind) {
    case 'home':
      stage = <HomeScreen state={state} dispatch={dispatch} />
      break
    case 'settings':
      stage = activeMenu && <SettingsScreen state={state} dispatch={dispatch} menu={activeMenu} control={activeControl} />
      break
    case 'app-center':
      stage = <AppCenter state={state} dispatch={dispatch} />
      break
    case 'scene':
      stage = <SceneScreen state={state} dispatch={dispatch} sceneId={view.sceneId} />
      break
    case 'app': {
      const props = { state, dispatch }
      stage = {
        navigation: <NavigationApp {...props} />,
        camera: <CameraApp {...props} />,
        recorder: <RecorderApp {...props} />,
        scenes: <ScenesApp {...props} />,
        media: <MediaApp {...props} />,
        phone: <PhoneApp {...props} />,
        windows: <WindowsApp {...props} />,
        tpms: <TpmsApp {...props} />,
        energy: <EnergyApp {...props} />,
      }[view.appId]
      break
    }
  }

  return (
    <section className="ice" aria-label={tx('V27 centre screen simulator', 'محاكي شاشة V27')}>
      <header className="ice-intro">
        <div>
          <p className="eyebrow">{tx('Interactive centre screen', 'شاشة مركزية تفاعلية')}</p>
          <h2>{tx('Try the V27 screen before you touch the car', 'جرب شاشة V27 قبل ما تمسك السيارة')}</h2>
          <p className="ice-intro-note">
            {tx(
              'Laid out like the head unit display in the official V27 owner’s manual. Tap the icons on the car, pull down the bar at the top for the control center, and use the dock for climate, seats and apps. Labels are kept as the car shows them.',
              'مصممة مثل شاشة الوسائط في دليل مالك V27 الرسمي. اضغط الأيقونات على السيارة، واسحب الشريط العلوي لمركز التحكم، واستخدم الشريط السفلي للتكييف والمقاعد والتطبيقات. النصوص كما تظهر في السيارة.',
            )}
          </p>
        </div>
        <span className="ice-intro-flag">{tx('Export manual + Egypt guide', 'دليل التصدير + دليل مصر')}</span>
      </header>

      <div className="ice-device">
        <div
          className="ice-screen"
          role="application"
          aria-roledescription={tx('car screen', 'شاشة السيارة')}
          data-theme={screenTheme(state)}
          data-view={view.kind}
          style={{ '--ice-brightness': brightness } as CSSProperties}
        >
          <StatusBar state={state} dispatch={dispatch} />
          <main className="ice-stage">{stage}</main>
          <Dock state={state} dispatch={dispatch} />

          {state.panel && STATUS_PANELS.has(state.panel) && <StatusPanel state={state} dispatch={dispatch} />}
          {state.panel && !STATUS_PANELS.has(state.panel) && <DockPanel state={state} dispatch={dispatch} />}
          {state.controlCenter && <ControlCenter state={state} dispatch={dispatch} />}
          <RunningScene state={state} dispatch={dispatch} />
          <Overlay state={state} dispatch={dispatch} />

          <div className="ice-toast" role="status" aria-live="polite">
            {state.toast && <span>{state.toast}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
