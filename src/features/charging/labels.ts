import type { Localized } from '../../content/types'
import type { Language } from '../../i18n/translator'
import type { ApiStation, StationConnector } from '../../lib/api'

/** Wording shared by the charging map and the admin stations screen. */

export const STATION_CONNECTOR_LABELS: Record<StationConnector, Localized> = {
  'gbt-dc': { en: 'GB/T DC (fast)', ar: 'GB/T DC (سريع)' },
  ccs2: { en: 'CCS2 (fast)', ar: 'CCS2 (سريع)' },
  chademo: { en: 'CHAdeMO (fast)', ar: 'CHAdeMO (سريع)' },
  'gbt-ac': { en: 'GB/T AC', ar: 'GB/T AC' },
  type2: { en: 'Type 2 AC', ar: 'Type 2 AC' },
  other: { en: 'Other', ar: 'أخرى' },
}

export const STATION_CONNECTORS = Object.keys(STATION_CONNECTOR_LABELS) as StationConnector[]

/** DC plugs: the ones that charge in under an hour. */
export const FAST_CONNECTORS: StationConnector[] = ['gbt-dc', 'ccs2', 'chademo']

export function stationName(station: Pick<ApiStation, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return station.name[preferred] || station.name.en || station.name.ar
}

/** The station's most powerful plug, for the list and the pin. */
export function stationMaxKw(station: Pick<ApiStation, 'connections'>): number | null {
  const powers = station.connections.map((connection) => connection.powerKw).filter((kw): kw is number => kw !== undefined)
  return powers.length === 0 ? null : Math.max(...powers)
}

/** Directions from wherever the reader is, in Google Maps. */
export function directionsUrl(station: Pick<ApiStation, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
}

/** Straight-line distance in km, for "nearest first". */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
