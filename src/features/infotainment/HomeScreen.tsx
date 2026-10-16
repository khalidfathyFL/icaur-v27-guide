import { useState } from 'react'
import {
  Bluetooth,
  FlipHorizontal2,
  Fuel,
  Gauge,
  Lightbulb,
  Lock,
  LockOpen,
  Moon,
  Music,
  PanelTop,
  Pause,
  PawPrint,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { homeHotspots, type HotspotId } from '../../content/infotainment'
import { imageUrls } from '../../content/images'
import { useLanguage } from '../../i18n/languageContext'
import { KEYS, type InfotainmentDispatch, type InfotainmentState } from './useInfotainment'
import type { Icon } from './screenKit'

const HOTSPOT_ICONS: Record<HotspotId, Icon> = {
  lock: Lock,
  headlight: Lightbulb,
  tpms: Gauge,
  window: PanelTop,
  fuel: Fuel,
  mirror: FlipHorizontal2,
}

/**
 * The home screen as the manual draws it: the car itself is the menu, with
 * buttons sitting on the parts they control, and two cards above the dock.
 */
export function HomeScreen({ state, dispatch }: { state: InfotainmentState; dispatch: InfotainmentDispatch }) {
  const { t } = useLanguage()
  const [photoFailed, setPhotoFailed] = useState(false)
  const locked = state.values[KEYS.doorLock] === true
  const fuelOpen = state.values[KEYS.fuelDoor] === true

  const press = (id: HotspotId) => {
    switch (id) {
      case 'lock':
        return dispatch({ type: 'toggle-lock' })
      case 'mirror':
        return dispatch({ type: 'toggle-mirrors' })
      case 'fuel':
        return dispatch({ type: 'toggle-fuel-door' })
      case 'window':
        return dispatch({ type: 'open-app', appId: 'windows' })
      case 'tpms':
        return dispatch({ type: 'open-app', appId: 'tpms' })
      case 'headlight':
        return dispatch({ type: 'open-settings', menuId: 'lighting', controlId: 'beam-distance' })
    }
  }

  const isActive = (id: HotspotId) =>
    (id === 'lock' && locked) || (id === 'mirror' && state.mirrorsFolded) || (id === 'fuel' && fuelOpen)

  return (
    <div className="ice-home">
      {!photoFailed && (
        <img
          className="ice-home-car"
          src={imageUrls.hero}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setPhotoFailed(true)}
        />
      )}

      {homeHotspots.map((spot) => {
        const Glyph = spot.id === 'lock' && !locked ? LockOpen : HOTSPOT_ICONS[spot.id]
        return (
          <button
            key={spot.id}
            type="button"
            className={isActive(spot.id) ? 'ice-hotspot active' : 'ice-hotspot'}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            onClick={() => press(spot.id)}
            aria-label={t(spot.label)}
            aria-pressed={spot.id === 'lock' || spot.id === 'mirror' || spot.id === 'fuel' ? isActive(spot.id) : undefined}
            title={spot.label.en}
          >
            <Glyph size={16} aria-hidden />
          </button>
        )
      })}

      <div className="ice-home-cards">
        <MediaCard state={state} dispatch={dispatch} />

        <div className="ice-card ice-scene-card">
          {(['nap', 'pet'] as const).map((id) => (
            <button key={id} type="button" onClick={() => dispatch({ type: 'open-scene', sceneId: id })}>
              {id === 'nap' ? <Moon size={20} aria-hidden /> : <PawPrint size={20} aria-hidden />}
              <small>{id === 'nap' ? 'Nap Mode' : 'Pet Mode'}</small>
            </button>
          ))}
          <button
            type="button"
            className="ice-card-corner"
            onClick={() => dispatch({ type: 'open-app', appId: 'scenes' })}
            aria-label="All scene modes"
            title="All scene modes"
          />
        </div>
      </div>
    </div>
  )
}

export function MediaCard({ state, dispatch }: { state: InfotainmentState; dispatch: InfotainmentDispatch }) {
  const playing = state.mediaPlaying

  return (
    <div className="ice-card ice-media-card">
      <button type="button" className="ice-media-title" onClick={() => dispatch({ type: 'open-app', appId: 'media' })}>
        <Music size={16} aria-hidden />
        <span>{playing ? 'Radio - 90.9 FM' : 'No Bluetooth devices found'}</span>
        <Bluetooth size={14} aria-hidden className="ice-media-bt" />
      </button>
      <div className="ice-media-controls">
        <button type="button" aria-label="Previous" onClick={() => dispatch({ type: 'run-action', toast: 'Previous' })}>
          <SkipBack size={15} aria-hidden />
        </button>
        <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => dispatch({ type: 'toggle-media' })}>
          {playing ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}
        </button>
        <button type="button" aria-label="Next" onClick={() => dispatch({ type: 'run-action', toast: 'Next' })}>
          <SkipForward size={15} aria-hidden />
        </button>
      </div>
    </div>
  )
}
