import { BadgeCheck, Building2, Palette, Phone, ShieldCheck, Store } from 'lucide-react'
import { getSources } from '../content'
import {
  EGYPT_SOURCE_IDS,
  EQUIPMENT_GROUPS,
  colours,
  distributor,
  equipment,
  equipmentVerification,
  priceFormatter,
  trimPricing,
  warranty,
} from '../content/egypt'
import { AltBlock, InfoBlock, PageFrame, SectionHeading } from '../components/layout'
import { VerificationBadge } from '../components/VerificationBadge'
import { useLanguage } from '../i18n/languageContext'
import { sourceHref } from '../lib/links'
import { useTrim } from '../vehicle/trimContext'
import { useMarketData } from '../features/market/useMarketData'

export function EgyptPage() {
  const { t, alt, pair, tx } = useLanguage()
  const { trim, setTrim } = useTrim()
  const egyptSources = getSources(EGYPT_SOURCE_IDS)
  const market = useMarketData()
  const distributorAlt = alt(distributor.role)

  return (
    <PageFrame
      eyebrow={tx('Egypt market', 'السوق المصري')}
      title={tx('Official Egypt Prices, Warranty and Equipment', 'الأسعار الرسمية والضمان والتجهيزات في مصر')}
      intro={tx(
        'Launch data for the Egyptian market: official list prices, warranty terms, and what each trim actually comes with. This is the page that decides what the rest of the site can call confirmed for Egypt.',
        'بيانات إطلاق السوق المصري: الأسعار الرسمية وشروط الضمان وتجهيزات كل فئة. هذه الصفحة هي مرجع ما يمكن اعتباره مؤكدا لمصر في باقي الموقع.',
      )}
    >
      <section className="price-grid">
        {trimPricing.map((option) => (
          <button
            key={option.trim}
            type="button"
            className={option.trim === trim ? 'price-card selected' : 'price-card'}
            onClick={() => setTrim(option.trim)}
            aria-pressed={option.trim === trim}
          >
            <span className="price-card-trim">{option.label}</span>
            <strong className="price-card-value">
              {priceFormatter.format(market.priceFor(option.trim).priceEgp)}
            </strong>
            {market.priceFor(option.trim).live && (
              <span className="price-live">{tx('Updated price', 'سعر محدث')}</span>
            )}
            <small>{t(option.drive)}</small>
            <dl className="price-card-specs">
              <div>
                <dt>{tx('Power', 'القوة')}</dt>
                <dd>{option.power}</dd>
              </div>
              <div>
                <dt>{tx('Torque', 'العزم')}</dt>
                <dd>{option.torque}</dd>
              </div>
              <div>
                <dt>{tx('Battery', 'البطارية')}</dt>
                <dd>{option.battery}</dd>
              </div>
              <div>
                <dt>0-100</dt>
                <dd>{option.acceleration}</dd>
              </div>
              <div>
                <dt>{tx('Top speed', 'السرعة القصوى')}</dt>
                <dd>{option.topSpeed}</dd>
              </div>
              <div>
                <dt>{tx('AC charge 0-100%', 'شحن متردد 0-100%')}</dt>
                <dd>{option.chargeTime}</dd>
              </div>
              <div>
                <dt>{tx('Wheels', 'الجنوط')}</dt>
                <dd>{option.wheels}</dd>
              </div>
              <div>
                <dt>{tx('Drive modes', 'أوضاع القيادة')}</dt>
                <dd>{option.driveModes}</dd>
              </div>
              <div>
                <dt>{tx('Airbags', 'الوسائد الهوائية')}</dt>
                <dd>{option.airbags}</dd>
              </div>
            </dl>
          </button>
        ))}
      </section>

      <div className="two-column">
        <InfoBlock icon={<Building2 size={20} />} title={tx('Official distributor', 'الوكيل الرسمي')}>
          <p>
            <strong>{distributor.name}</strong> - {t(distributor.role)}
          </p>
          {distributorAlt && (
            <AltBlock>
              <p>{distributorAlt}</p>
            </AltBlock>
          )}
        </InfoBlock>

        <InfoBlock icon={<ShieldCheck size={20} />} title={tx('Warranty', 'الضمان')}>
          <div className="warranty-list">
            {warranty.map((item) => (
              <div key={item.id}>
                <span>{pair(item.label)}</span>
                <strong>{t(item.value)}</strong>
              </div>
            ))}
          </div>
        </InfoBlock>
      </div>

      <InfoBlock icon={<Palette size={20} />} title={tx('Available colours', 'الألوان المتاحة')}>
        <div className="path-pills">
          {colours.map((colour) => (
            <span key={colour.en}>{pair(colour)}</span>
          ))}
        </div>
      </InfoBlock>

      <SectionHeading
        eyebrow={tx('Equipment', 'التجهيزات')}
        title={tx('What Each Trim Actually Comes With', 'ما تحصل عليه فعليا في كل فئة')}
      />

      {EQUIPMENT_GROUPS.map((group) => (
        <section key={group.id} className="equipment-block">
          <h3>{pair(group.name)}</h3>
          <div className="equipment-table" role="table">
            <div className="equipment-row equipment-head" role="row">
              <span>{tx('Feature', 'التجهيز')}</span>
              <span>Play RWD</span>
              <span>Wild AWD</span>
            </div>
            {equipment
              .filter((item) => item.group === group.id)
              .map((item) => (
                <div className="equipment-row" role="row" key={item.id}>
                  <span className="equipment-name">{pair(item.name)}</span>
                  <span data-label="Play">
                    <VerificationBadge status={equipmentVerification[item.play]} compact />
                  </span>
                  <span data-label="Wild">
                    <VerificationBadge status={equipmentVerification[item.wild]} compact />
                  </span>
                </div>
              ))}
          </div>
        </section>
      ))}

      <DealerList />

      <InfoBlock icon={<BadgeCheck size={20} />} title={tx('Sources', 'المصادر')}>
        <div className="source-list">
          {egyptSources.map((source) => (
            <a key={source.id} href={sourceHref(source.url)} target="_blank" rel="noreferrer">
              <strong>{source.title}</strong>
              <span>
                {source.market} - checked {source.checked}
              </span>
            </a>
          ))}
        </div>
      </InfoBlock>
    </PageFrame>
  )
}

/** Dealers reported as selling at the official list price. Admin-maintained. */
function DealerList() {
  const { tx } = useLanguage()
  const { dealers, loading } = useMarketData()

  if (loading || dealers.length === 0) return null

  return (
    <InfoBlock icon={<Store size={20} />} title={tx('Where to buy at list price', 'أين تشتري بالسعر الرسمي')}>
      <div className="dealer-list">
        {dealers.map((dealer) => (
          <div className="dealer-card" key={dealer.id}>
            <div>
              <strong>{dealer.name}</strong>
              <small>{dealer.area}</small>
              {dealer.notes && <p>{dealer.notes}</p>}
            </div>
            <div className="dealer-meta">
              {dealer.sellsAtListPrice && (
                <span className="badge ok">{tx('Sells at list price', 'يبيع بالسعر الرسمي')}</span>
              )}
              {dealer.phone && (
                <a className="dealer-phone" href={`tel:${dealer.phone}`}>
                  <Phone size={14} /> {dealer.phone}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="muted-note dealer-disclaimer">
        {tx(
          'Reported by owners and checked by an admin. Prices and availability change, so confirm before you travel.',
          'مُبلّغ عنها من الملاك ومراجعة من المشرف. الأسعار والتوفر تتغير، لذلك تأكد قبل أن تذهب.',
        )}
      </p>
    </InfoBlock>
  )
}
