import { Phone, Store } from 'lucide-react'
import { PageFrame } from '../components/layout'
import { useLanguage } from '../i18n/languageContext'
import { useMarketData } from '../features/market/useMarketData'

/** Dealers reported as selling at the official list price. Admin-maintained. */
export function DealersPage() {
  const { tx } = useLanguage()
  const { dealers, loading } = useMarketData()

  return (
    <PageFrame
      eyebrow={tx('Egypt market', 'السوق المصري')}
      title={tx('Where to buy at list price', 'أين تشتري بالسعر الرسمي')}
      intro={tx(
        'Dealers that owners reported as selling the V27 at the official price, without a markup.',
        'وكلاء أبلغ الملاك أنهم يبيعون V27 بالسعر الرسمي دون زيادة.',
      )}
    >
      {loading ? null : dealers.length === 0 ? (
        <div className="empty-state">
          <Store size={30} aria-hidden="true" />
          <strong>{tx('No dealers listed yet', 'لا يوجد وكلاء بعد')}</strong>
          <span>
            {tx(
              'When owners report a dealer selling at list price, it will appear here.',
              'عندما يبلغ الملاك عن وكيل يبيع بالسعر الرسمي سيظهر هنا.',
            )}
          </span>
        </div>
      ) : (
        <>
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
        </>
      )}
    </PageFrame>
  )
}
