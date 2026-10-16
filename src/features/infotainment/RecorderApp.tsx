import { useState } from 'react'
import { Camera, Circle, Square } from 'lucide-react'
import { recorderSettings, recorderTabs } from '../../content/infotainment'
import { useLanguage } from '../../i18n/languageContext'
import { recorderKey, type InfotainmentDispatch, type InfotainmentState } from './useInfotainment'
import { AppHeader, SpecControl, Switch } from './shared'

type Props = { state: InfotainmentState; dispatch: InfotainmentDispatch }

const VIDEO_FILTERS = ['All recording', 'Loop recording', 'Emergency recording'] as const

/** Storage bar order, as the manual lists it: loop, emergency, low risk, high risk, photo. */
const STORAGE = [
  { label: 'Loop recording', share: 38 },
  { label: 'Emergency recording', share: 6 },
  { label: 'Low risk event', share: 4 },
  { label: 'High risk event', share: 2 },
  { label: 'Photo', share: 3 },
]

/** The driving recorder (DVR) app, which records to a USB drive in the dedicated port. */
export function RecorderApp({ state, dispatch }: Props) {
  const { tx } = useLanguage()
  const { recorder, car } = state
  const [filter, setFilter] = useState<(typeof VIDEO_FILTERS)[number]>('All recording')

  if (!recorder.consented) {
    return (
      <div className="ice-app">
        <AppHeader title="Driving recorder" onBack={() => dispatch({ type: 'go-home' })} />
        <div className="ice-consent" role="dialog" aria-label="Privacy agreement">
          <strong>Privacy agreement</strong>
          <p>
            {tx(
              'Recordings can show number plates and faces, which the law protects as personal information. Check the rules where you drive before recording or sharing clips. Videos stay on your USB drive; the car does not upload them.',
              'التسجيلات قد تظهر لوحات السيارات ووجوه الناس، وهي بيانات شخصية يحميها القانون. راجع القواعد في مكان قيادتك قبل التسجيل أو المشاركة. الفيديوهات تبقى على الفلاشة ولا ترفعها السيارة.',
            )}
          </p>
          <button type="button" className="ice-primary" onClick={() => dispatch({ type: 'recorder-consent' })}>
            OK
          </button>
        </div>
      </div>
    )
  }

  const clipCount = filter === 'Emergency recording' ? 1 : recorder.clips
  const loop = String(state.values[recorderKey('loop')])

  return (
    <div className="ice-app">
      <AppHeader title="Driving recorder" onBack={() => dispatch({ type: 'go-home' })}>
        <span className="ice-app-head-label">{tx('USB drive inserted', 'الفلاشة موصلة')}</span>
        <Switch on={car.usbDrive} label="USB drive inserted" onChange={(usbDrive) => dispatch({ type: 'set-car', car: { usbDrive } })} />
      </AppHeader>

      <div className="ice-recorder">
        <nav className="ice-recorder-tabs" aria-label="Recorder">
          {recorderTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={recorder.tab === tab ? 'active' : ''}
              aria-current={recorder.tab === tab ? 'page' : undefined}
              onClick={() => dispatch({ type: 'recorder-tab', tab })}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="ice-recorder-body">
          {recorder.tab === 'Real-time Screen' && (
            <div className="ice-recorder-live">
              <div className="ice-recorder-feed">
                <span className="ice-recorder-stamp">
                  LXXXXXXXXXXXXXXXX · {new Date().toLocaleString('en-GB')}
                  {recorder.recording && <b> ● REC</b>}
                </span>
                {!car.usbDrive && <span className="ice-recorder-warn">U disc is not inserted, driving recorder cannot operate</span>}
              </div>
              <div className="ice-recorder-buttons">
                <button type="button" onClick={() => dispatch({ type: 'take-photo' })} aria-label="Take photo">
                  <Camera size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  className={recorder.recording ? 'rec on' : 'rec'}
                  onClick={() => dispatch({ type: 'toggle-recording' })}
                  aria-label={recorder.recording ? 'Pause recording' : 'Start recording'}
                >
                  {recorder.recording ? <Square size={16} aria-hidden /> : <Circle size={18} aria-hidden />}
                </button>
              </div>
            </div>
          )}

          {recorder.tab === 'Driving Video' && (
            <div className="ice-recorder-list">
              <div className="ice-segment" role="radiogroup" aria-label="Video filtering">
                {VIDEO_FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={filter === item}
                    className={filter === item ? 'active' : ''}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="ice-thumbs">
                {Array.from({ length: clipCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className="ice-thumb"
                    onClick={() => dispatch({ type: 'run-action', toast: `Playing clip ${index + 1}` })}
                  >
                    <small>{loop}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recorder.tab === 'Album' && (
            <div className="ice-recorder-list">
              {recorder.photos === 0 ? (
                <p className="ice-app-note">{tx('No photos yet. Use the camera button on the live view.', 'لا توجد صور بعد. استخدم زر الكاميرا في العرض المباشر.')}</p>
              ) : (
                <div className="ice-thumbs">
                  {Array.from({ length: recorder.photos }, (_, index) => (
                    <span key={index} className="ice-thumb photo" />
                  ))}
                </div>
              )}
            </div>
          )}

          {recorder.tab === 'Settings' && (
            <div className="ice-recorder-settings">
              {recorderSettings.map((setting) => {
                const key = recorderKey(setting.id)
                return (
                  <div key={setting.id} className={`ice-control kind-${setting.control.kind}`}>
                    <div className="ice-control-head">
                      <span>{setting.label}</span>
                    </div>
                    <SpecControl
                      spec={setting.control}
                      label={setting.label}
                      value={state.values[key]}
                      onChange={(value, toast) => dispatch({ type: 'set-value', key, value, toast })}
                    />
                  </div>
                )
              })}
              <div className="ice-control">
                <div className="ice-control-head">
                  <span>External storage space</span>
                  <small>{car.usbDrive ? '17.0 / 32 GB' : '--'}</small>
                </div>
                <div className="ice-storage" aria-hidden>
                  {car.usbDrive && STORAGE.map((part) => <i key={part.label} style={{ width: `${part.share}%` }} title={part.label} />)}
                </div>
                <div className="ice-actions">
                  <button type="button" onClick={() => dispatch({ type: 'run-action', toast: 'Format U disc' })}>
                    Format U disc
                  </button>
                  <button type="button" onClick={() => dispatch({ type: 'set-car', car: { usbDrive: false } })}>
                    Remove U disc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
