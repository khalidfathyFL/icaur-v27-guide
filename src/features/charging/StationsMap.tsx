import { useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useLanguage } from '../../i18n/languageContext'
import type { ApiStation } from '../../lib/api'
import { FAST_CONNECTORS, STATION_CONNECTOR_LABELS, directionsUrl, stationName } from './labels'

/**
 * The charging map. Loaded on its own (React.lazy) so Leaflet only downloads
 * for readers who open the charging page. Pins are circles drawn in SVG,
 * coloured by CSS, so they follow the site's theme and need no image files.
 */

/** Egypt's populated strip, Alexandria to Aswan, before the stations load. */
const EGYPT_CENTER: [number, number] = [28.2, 31.2]

function FitTo({ stations, focus }: { stations: ApiStation[]; focus: ApiStation | null }) {
  const map = useMap()

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
      return
    }
    if (stations.length === 0) return
    const lats = stations.map((station) => station.lat)
    const lngs = stations.map((station) => station.lng)
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [24, 24], maxZoom: 13 },
    )
  }, [map, stations, focus])

  return null
}

export default function StationsMap({
  stations,
  focus,
  onSelect,
}: {
  stations: ApiStation[]
  focus: ApiStation | null
  onSelect: (station: ApiStation) => void
}) {
  const { tx, t, language } = useLanguage()

  return (
    <MapContainer className="stations-map" center={EGYPT_CENTER} zoom={6} scrollWheelZoom={false}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Stations: <a href="https://openchargemap.org">Open Charge Map</a> contributors, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, and the providers named on each station'
        maxZoom={19}
      />
      <FitTo stations={stations} focus={focus} />
      {stations.map((station) => {
        const fast = station.connectors.some((type) => FAST_CONNECTORS.includes(type))
        const className = ['station-pin', fast ? 'fast' : 'ac', station.operational ? '' : 'down'].filter(Boolean).join(' ')
        return (
          <CircleMarker
            key={station.id}
            center={[station.lat, station.lng]}
            radius={fast ? 8 : 6}
            pathOptions={{ className }}
            eventHandlers={{ click: () => onSelect(station) }}
          >
            <Popup>
              <div className="station-popup" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <strong>{stationName(station, language)}</strong>
                {station.operator && <span>{station.operator}</span>}
                {!station.operational && <span className="station-down">{tx('Reported out of order', 'مبلغ أنها معطلة')}</span>}
                <ul>
                  {station.connections.map((connection, index) => (
                    <li key={index}>
                      {t(STATION_CONNECTOR_LABELS[connection.type])}
                      {connection.powerKw !== undefined && <span dir="ltr"> · {connection.powerKw} kW</span>}
                      {connection.count !== undefined && connection.count > 1 && <span dir="ltr"> × {connection.count}</span>}
                    </li>
                  ))}
                </ul>
                {station.pricePerKwh !== undefined ? (
                  <span>
                    <span dir="ltr">{station.pricePerKwh} EGP</span> {tx('per kWh', 'لكل كيلووات ساعة')}
                  </span>
                ) : (
                  station.priceNote && <span>{station.priceNote}</span>
                )}
                {station.access && <span>{station.access}</span>}
                {station.hours && <span>{station.hours}</span>}
                <a href={directionsUrl(station)} target="_blank" rel="noopener noreferrer">
                  {tx('Directions', 'الاتجاهات')}
                </a>
                {station.dataProvider && (
                  <small className="station-source">
                    {tx('Data:', 'البيانات:')}{' '}
                    {station.dataProvider.url ? (
                      <a href={station.dataProvider.url} target="_blank" rel="noopener noreferrer">
                        {station.dataProvider.title}
                      </a>
                    ) : (
                      station.dataProvider.title
                    )}
                    {station.dataProvider.license && ` · ${station.dataProvider.license}`}
                  </small>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
