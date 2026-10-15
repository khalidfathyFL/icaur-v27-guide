import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, LocateFixed, MapPin, Navigation, PlugZap, Zap } from 'lucide-react'
import { PageFrame } from '../components/layout'
import { Segmented } from '../components/Segmented'
import { trimPricing } from '../content/egypt'
import { FAST_CONNECTORS, STATION_CONNECTORS, STATION_CONNECTOR_LABELS, directionsUrl, distanceKm, stationMaxKw, stationName } from '../features/charging/labels'
import { installerName } from '../features/installers/labels'
import { egp } from '../features/parts/labels'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured, type ApiInstaller, type ApiStation, type StationConnector } from '../lib/api'
import { TRIMS, useTrim } from '../vehicle/trimContext'
import { ServiceUnavailable } from './AccountPage'

const StationsMap = lazy(() => import('../features/charging/StationsMap'))

/** How many stations the list under the map shows before "Show more". */
const LIST_STEP = 20
/** Charging from the wall loses roughly this share as heat in the charger and battery. */
const AC_LOSSES = 0.1

type Position = { lat: number; lng: number }

export function ChargingPage() {
  const { tx } = useLanguage()
  const [stations, setStations] = useState<ApiStation[] | null>(null)
  const [installers, setInstallers] = useState<ApiInstaller[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiConfigured) return
    let cancelled = false
    api
      .listStations()
      .then(({ stations: list }) => {
        if (!cancelled) setStations(list)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Could not load the charging stations.', 'تعذر تحميل محطات الشحن.'))
      })
    // The teaser is a bonus; without it the page still works.
    api
      .listInstallers()
      .then(({ installers: list }) => {
        if (!cancelled) setInstallers(list)
      })
      .catch(() => {
        if (!cancelled) setInstallers([])
      })
    return () => {
      cancelled = true
    }
  }, [tx])

  if (!apiConfigured) return <ServiceUnavailable />

  return (
    <PageFrame
      eyebrow={tx('Charging', 'الشحن')}
      title={tx('Charging in Egypt', 'الشحن في مصر')}
      intro={tx(
        'Where to charge the V27 away from home, what a full charge costs at home and at a station, and who installs a charger in your garage.',
        'أين تشحن V27 خارج المنزل، وكم تكلف الشحنة الكاملة في المنزل وفي المحطة، ومن يركب لك شاحنا في الجراج.',
      )}
    >
      <StationsSection stations={stations} error={error} />
      <CostSection stations={stations} />
      <HomeChargingSection installers={installers} />
      <p className="muted-note">
        <a className="inline-link" href="#/guides/charging">
          {tx('How to charge the V27, step by step', 'طريقة شحن V27 خطوة بخطوة')}
        </a>
      </p>
    </PageFrame>
  )
}

/* ---------- stations ---------- */

function StationsSection({ stations, error }: { stations: ApiStation[] | null; error: string | null }) {
  const { tx, t, language } = useLanguage()
  const [fastOnly, setFastOnly] = useState(false)
  const [plugs, setPlugs] = useState<StationConnector[]>([])
  const [query, setQuery] = useState('')
  const [here, setHere] = useState<Position | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [focus, setFocus] = useState<ApiStation | null>(null)
  const [shown, setShown] = useState(LIST_STEP)

  // Only the plugs some station actually has are worth offering as filters.
  const available = useMemo(
    () => STATION_CONNECTORS.filter((type) => type !== 'other' && stations?.some((station) => station.connectors.includes(type))),
    [stations],
  )

  const matching = useMemo(() => {
    if (!stations) return null
    const needle = query.trim().toLowerCase()
    const list = stations.filter(
      (station) =>
        (!fastOnly || station.connectors.some((type) => FAST_CONNECTORS.includes(type))) &&
        (plugs.length === 0 || plugs.some((type) => station.connectors.includes(type))) &&
        (!needle ||
          [station.name.en, station.name.ar, station.operator, station.city, station.address].some((field) => field?.toLowerCase().includes(needle))),
    )
    if (here) return [...list].sort((a, b) => distanceKm(here, a) - distanceKm(here, b))
    return list
  }, [stations, fastOnly, plugs, query, here])

  function locate() {
    if (!navigator.geolocation) {
      setLocateError(tx('Your browser cannot share your location.', 'متصفحك لا يستطيع مشاركة موقعك.'))
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHere({ lat: position.coords.latitude, lng: position.coords.longitude })
        setFocus(null)
        setLocating(false)
      },
      () => {
        setLocateError(tx('Could not get your location. Allow it in the browser, or search by city.', 'تعذر تحديد موقعك. اسمح به في المتصفح أو ابحث بالمدينة.'))
        setLocating(false)
      },
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }

  function select(station: ApiStation) {
    setFocus(station)
  }

  return (
    <section className="part-section">
      <h2>{tx('Public charging stations', 'محطات الشحن العامة')}</h2>
      <p className="muted-note">
        {tx(
          'The V27 fast-charges on DC at up to 40 kW (Play) or 60 kW (Wild), so a fast station takes it from 20 to 80% in about half an hour. Large pins are fast DC stations.',
          'تشحن V27 سريعا بالتيار المستمر حتى 40 كيلووات (Play) أو 60 كيلووات (Wild)، فتأخذها المحطة السريعة من 20 إلى 80% في نحو نصف ساعة. الدوائر الكبيرة محطات سريعة DC.',
        )}
      </p>

      <div className="part-filters">
        <div className="part-chip-row" role="group" aria-label={tx('Plugs', 'الفيش')}>
          <button type="button" className={fastOnly ? 'part-chip selected' : 'part-chip'} aria-pressed={fastOnly} onClick={() => setFastOnly((on) => !on)}>
            <Zap size={14} aria-hidden="true" /> {tx('Fast DC only', 'السريعة DC فقط')}
          </button>
          {available.map((type) => {
            const on = plugs.includes(type)
            return (
              <button
                key={type}
                type="button"
                className={on ? 'part-chip selected' : 'part-chip'}
                aria-pressed={on}
                onClick={() => setPlugs((current) => (on ? current.filter((item) => item !== type) : [...current, type]))}
              >
                {t(STATION_CONNECTOR_LABELS[type])}
              </button>
            )
          })}
        </div>
        <div className="part-filter-row">
          <label className="part-sort stations-search">
            <span>{tx('Search', 'ابحث')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tx('City, operator or place', 'المدينة أو المشغل أو المكان')}
            />
          </label>
          <button type="button" className="part-action" onClick={locate} disabled={locating}>
            <LocateFixed size={14} aria-hidden="true" /> {locating ? tx('Locating…', 'جارٍ تحديد الموقع…') : here ? tx('Nearest first', 'الأقرب أولا') : tx('Near me', 'بالقرب مني')}
          </button>
        </div>
        {locateError && <p className="form-error">{locateError}</p>}
      </div>

      {error && <p className="form-error">{error}</p>}
      {matching === null && !error && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>}

      {matching !== null && (
        <>
          <Suspense fallback={<div className="stations-map stations-map-loading">{tx('Loading the map…', 'جارٍ تحميل الخريطة…')}</div>}>
            <StationsMap stations={matching} focus={focus} onSelect={select} />
          </Suspense>

          <p className="muted-note">
            {stations?.length === 0
              ? tx('No stations listed yet.', 'لا توجد محطات مدرجة بعد.')
              : tx(`${matching.length} of ${stations?.length ?? 0} stations`, `${matching.length} من ${stations?.length ?? 0} محطة`)}
          </p>

          <ul className="stations-list">
            {matching.slice(0, shown).map((station) => {
              const max = stationMaxKw(station)
              const fast = station.connectors.some((type) => FAST_CONNECTORS.includes(type))
              return (
                <li key={station.id} className={focus?.id === station.id ? 'selected' : undefined}>
                  <button type="button" className="stations-list-main" onClick={() => select(station)}>
                    <strong>
                      {fast ? <Zap size={14} aria-hidden="true" /> : <PlugZap size={14} aria-hidden="true" />} {stationName(station, language)}
                    </strong>
                    <small>
                      {[
                        station.operator,
                        station.city,
                        max !== null ? `${max} kW` : null,
                        station.pricePerKwh !== undefined ? tx(`${station.pricePerKwh} EGP/kWh`, `${station.pricePerKwh} جنيه/ك.و.س`) : null,
                        here ? tx(`${distanceKm(here, station).toFixed(1)} km`, `${distanceKm(here, station).toFixed(1)} كم`) : null,
                        station.access,
                        station.operational ? null : tx('out of order', 'معطلة'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </button>
                  <a className="part-action" href={directionsUrl(station)} target="_blank" rel="noopener noreferrer">
                    <Navigation size={14} aria-hidden="true" /> {tx('Directions', 'الاتجاهات')}
                  </a>
                </li>
              )
            })}
          </ul>
          {matching.length > shown && (
            <button type="button" className="part-action" onClick={() => setShown((count) => count + LIST_STEP)}>
              {tx('Show more', 'اعرض المزيد')}
            </button>
          )}

          <p className="muted-note">
            {tx(
              'Stations come from Open Charge Map, a public registry anyone can add to, refreshed daily and corrected by our team. A station may be missing, busy or out of order: check the operator’s app before a long trip. Community data is shared under CC BY 4.0; each station names its source.',
              'المحطات من Open Charge Map، وهو سجل عام يضيف إليه أي أحد، يتحدث يوميا ويصححه فريقنا. قد تكون محطة غير مدرجة أو مشغولة أو معطلة: راجع تطبيق المشغل قبل الرحلات الطويلة. بيانات المجتمع منشورة بترخيص CC BY 4.0، وكل محطة تذكر مصدرها.',
            )}{' '}
            <a href="https://openchargemap.org/site/develop#terms" target="_blank" rel="noopener noreferrer">
              {tx('Terms', 'الشروط')}
            </a>
          </p>
        </>
      )}
    </section>
  )
}

/* ---------- cost of a charge ---------- */

/** The middle station price, so one odd tariff does not skew the default. */
function medianPrice(stations: ApiStation[] | null): number | null {
  const prices = (stations ?? []).map((station) => station.pricePerKwh).filter((price): price is number => price !== undefined).sort((a, b) => a - b)
  if (prices.length === 0) return null
  const middle = Math.floor(prices.length / 2)
  return prices.length % 2 ? prices[middle]! : (prices[middle - 1]! + prices[middle]!) / 2
}

function CostSection({ stations }: { stations: ApiStation[] | null }) {
  const { tx } = useLanguage()
  const { trim, setTrim } = useTrim()
  const pricing = trimPricing.find((item) => item.trim === trim) ?? trimPricing[0]!
  const batteryKwh = Number.parseFloat(pricing.battery)
  const typical = medianPrice(stations)

  const [homeRate, setHomeRate] = useState('')
  const [stationRate, setStationRate] = useState('')
  const stationValue = stationRate.trim() ? Number(stationRate) : typical

  const home = homeRate.trim() && Number(homeRate) > 0 ? Math.round(batteryKwh * (1 + AC_LOSSES) * Number(homeRate)) : null
  const station = stationValue !== null && stationValue > 0 ? Math.round(batteryKwh * stationValue) : null

  return (
    <section className="part-section">
      <h2>{tx('What a full charge costs', 'تكلفة الشحنة الكاملة')}</h2>
      <Segmented
        label={tx('Trim', 'الفئة')}
        value={trim}
        onChange={setTrim}
        options={TRIMS.map((item) => ({ value: item.value, label: item.label }))}
      />
      <div className="charging-calc">
        <label>
          <span>{tx('Your home price per kWh (EGP)', 'سعر الكيلووات ساعة في منزلك (جنيه)')}</span>
          <input type="number" min={0} step="any" inputMode="decimal" dir="ltr" value={homeRate} onChange={(event) => setHomeRate(event.target.value)} />
          <small>{tx('From your electricity bill: the price of the tier you usually reach.', 'من فاتورة الكهرباء: سعر الشريحة التي تصل إليها عادة.')}</small>
        </label>
        <label>
          <span>{tx('Station price per kWh (EGP)', 'سعر الكيلووات ساعة في المحطة (جنيه)')}</span>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            dir="ltr"
            value={stationRate}
            placeholder={typical !== null ? String(typical) : ''}
            onChange={(event) => setStationRate(event.target.value)}
          />
          <small>
            {typical !== null
              ? tx('Filled with the middle price of the stations that list one.', 'القيمة المبدئية هي السعر الأوسط للمحطات التي تذكر سعرها.')
              : tx('From the operator’s app or the station screen.', 'من تطبيق المشغل أو شاشة المحطة.')}
          </small>
        </label>
      </div>

      <dl className="center-package-specs charging-results">
        <div>
          <dt>{tx('Battery', 'البطارية')}</dt>
          <dd dir="ltr">{pricing.battery}</dd>
        </div>
        <div>
          <dt>{tx('Full charge at home', 'شحنة كاملة في المنزل')}</dt>
          <dd>{home !== null ? <span dir="ltr">≈ {egp.format(home)}</span> : tx('Enter your price', 'أدخل سعرك')}</dd>
        </div>
        <div>
          <dt>{tx('Full charge at a station', 'شحنة كاملة في المحطة')}</dt>
          <dd>{station !== null ? <span dir="ltr">≈ {egp.format(station)}</span> : tx('Enter the price', 'أدخل السعر')}</dd>
        </div>
        <div>
          <dt>{tx('Time on a home charger, 0–100%', 'الوقت على شاحن منزلي من 0 إلى 100%')}</dt>
          <dd dir="ltr">≈ {pricing.chargeTime}</dd>
        </div>
      </dl>
      <p className="muted-note">
        {tx(
          'Home cost adds about 10% for what is lost as heat while charging. Stations bill what reaches the car. A station may also charge for time or parking.',
          'تكلفة المنزل تضيف نحو 10% لما يضيع حرارة أثناء الشحن. المحطات تحاسب على ما يصل إلى السيارة. وقد تحاسب المحطة أيضا على الوقت أو الانتظار.',
        )}
      </p>
    </section>
  )
}

/* ---------- home charging ---------- */

function HomeChargingSection({ installers }: { installers: ApiInstaller[] | null }) {
  const { tx, language } = useLanguage()
  const cheapest = useMemo(
    () =>
      (installers ?? [])
        .filter((installer) => installer.lowestPriceEgp !== null)
        .sort((a, b) => (a.lowestPriceEgp ?? 0) - (b.lowestPriceEgp ?? 0))
        .slice(0, 3),
    [installers],
  )

  return (
    <section className="part-section">
      <h2>{tx('A charger at home', 'شاحن في المنزل')}</h2>
      <ul className="charging-tips">
        <li>
          {tx(
            'The V27 takes at most 6.6 kW on AC. A 7 kW wall box on an ordinary single-phase supply charges it as fast as it can go; a three-phase 11 or 22 kW box costs more and is no faster for this car.',
            'تستقبل V27 بحد أقصى 6.6 كيلووات بالتيار المتردد. الشاحن الجداري 7 كيلووات على كهرباء 1 فاز العادية يشحنها بأقصى سرعتها؛ أما شاحن 11 أو 22 كيلووات على 3 فاز فأغلى ولن يكون أسرع لهذه السيارة.',
          )}
        </li>
        <li>
          {tx(
            'A wall box needs its own line from the meter with a suitable breaker and cable. Ask for a site survey first: the cable run decides most of the price.',
            'الشاحن الجداري يحتاج خطا مستقلا من العداد بقاطع وكابل مناسبين. اطلب معاينة أولا: طول الكابل يحدد معظم السعر.',
          )}
        </li>
        <li>
          {tx(
            'Prefer a company on the Electricity Regulatory Agency’s list of licensed charging companies.',
            'فضّل شركة مدرجة في قائمة جهاز تنظيم مرفق الكهرباء للشركات المرخصة لشحن السيارات.',
          )}{' '}
          <a href="https://egyptera.org/ar/EVComp.aspx" target="_blank" rel="noopener noreferrer">
            {tx('See the list', 'اطلع على القائمة')}
          </a>
        </li>
      </ul>

      {cheapest.length > 0 && (
        <div className="part-grid">
          {cheapest.map((installer) => (
            <a className="part-card" key={installer.id} href={`#/charging/installers/${installer.slug}`}>
              <div className="part-card-body">
                <h3>{installerName(installer, language)}</h3>
                <div className="part-card-foot">
                  <strong>
                    {tx('From', 'من')} <span dir="ltr">{egp.format(installer.lowestPriceEgp ?? 0)}</span>
                  </strong>
                  {installer.licensed && (
                    <span className="badge ok">
                      <BadgeCheck size={13} aria-hidden="true" /> {tx('Licensed', 'مرخصة')}
                    </span>
                  )}
                </div>
                {installer.governorates.length > 0 && (
                  <small>
                    <MapPin size={12} aria-hidden="true" /> {tx(`${installer.governorates.length} governorate(s)`, `${installer.governorates.length} محافظة`)}
                  </small>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <a className="primary-action" href="#/charging/installers">
        <PlugZap size={16} aria-hidden="true" /> {tx('Compare charger installers', 'قارن شركات تركيب الشواحن')}
      </a>
    </section>
  )
}
