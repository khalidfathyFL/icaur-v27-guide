import { useLanguage } from '../i18n/languageContext'

export function SiteFooter() {
  const { tx } = useLanguage()

  return (
    <footer className="site-footer">
      <div>
        <strong>{tx('iCAUR V27 Egypt Knowledge Base', 'دليل iCAUR V27 مصر')}</strong>
        <span>
          {tx(
            'React + TypeScript static site, ready for GitHub Pages.',
            'موقع React + TypeScript جاهز للاستضافة على GitHub Pages.',
          )}
        </span>
      </div>
      <a href="#/sources">{tx('Sources', 'المصادر')}</a>
    </footer>
  )
}
