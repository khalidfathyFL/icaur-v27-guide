import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { PRIMARY_NAV, SECONDARY_NAV } from '../app/navigation'
import { useLanguage } from '../i18n/languageContext'

export function SiteFooter() {
  const { tx, t } = useLanguage()

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a className="brand" href="#/">
            <span className="brand-mark" aria-hidden="true">i</span>
            <span className="brand-text">
              <strong>iCAUR V27</strong>
              <small>{tx('Egypt Owner Guide', 'دليل المالك - مصر')}</small>
            </span>
          </a>
          <p>
            {tx(
              'Every feature is labeled by market and source. Confirm equipment with your dealer before you buy.',
              'كل ميزة موضح سوقها ومصدرها. تأكد من التجهيزات مع الوكيل قبل الشراء.',
            )}
          </p>
        </div>

        <nav aria-label={tx('Owner guide', 'دليل المالك')}>
          <strong>{tx('Owner guide', 'دليل المالك')}</strong>
          {PRIMARY_NAV.map((item) => (
            <a key={item.href} href={`#${item.href}`}>
              {t(item)}
            </a>
          ))}
        </nav>

        <nav aria-label={tx('Research & community', 'البحث والمجتمع')}>
          <strong>{tx('Research & community', 'البحث والمجتمع')}</strong>
          {SECONDARY_NAV.map((item) => (
            <a key={item.href} href={`#${item.href}`}>
              {t(item)}
            </a>
          ))}
        </nav>
      </div>
      <BackToTop />
    </footer>
  )
}

function BackToTop() {
  const { tx } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      className={visible ? 'back-to-top visible' : 'back-to-top'}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={tx('Back to top', 'العودة للأعلى')}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp size={20} />
    </button>
  )
}
