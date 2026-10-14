import { SIDEBAR_GROUPS, isActive } from '../app/navigation'
import { useShortText } from '../i18n/languageContext'

/**
 * Every page in its group, always in view on wide screens, so nothing is one
 * click away behind "More". Narrower screens hide it and use the header's
 * links and the ☰ drawer instead.
 */
export function SiteSidebar({ path }: { path: string }) {
  const tx = useShortText()

  return (
    <aside className="site-sidebar" aria-label={tx('All pages', 'كل الصفحات')}>
      {SIDEBAR_GROUPS.map((group) => (
        <nav key={group.key} aria-label={tx(group.en, group.ar)}>
          <p className="sidebar-label">{tx(group.en, group.ar)}</p>
          {group.items.map((item) => {
            const active = isActive(path, item.href)
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={`#${item.href}`}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
                title={item.hint.en ? tx(item.hint.en, item.hint.ar) : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{tx(item.en, item.ar)}</span>
                {item.isNew && <span className="new-tag">{tx('New', 'جديد')}</span>}
              </a>
            )
          })}
        </nav>
      ))}
    </aside>
  )
}
