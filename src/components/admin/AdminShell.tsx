import { useState, type ComponentType, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '../../i18n/languageContext'

/**
 * The admin workspace frame, following the same shape as the MicroBIM admin:
 * an accordion sidebar of grouped sections, one group open at a time, with
 * optional count badges on the items that have work waiting.
 */

export interface AdminNavItem {
  key: string
  label: string
  icon: ComponentType<{ size?: number }>
  /** Optional count shown as a pill (e.g. pending approvals). */
  badge?: number
  /** Optional labelled cluster within the group; a small header precedes each cluster. */
  subgroup?: string
}

/** A top-level group in the sidebar accordion; expands to reveal its items. */
export interface AdminNavGroup {
  key: string
  label: string
  icon: ComponentType<{ size?: number }>
  items: AdminNavItem[]
}

interface AdminShellProps {
  groups: AdminNavGroup[]
  /** Key of the active item. */
  active: string
  onChange: (key: string) => void
  title: string
  subtitle?: string
  children: ReactNode
}

const groupOf = (groups: AdminNavGroup[], itemKey: string) =>
  groups.find((group) => group.items.some((item) => item.key === itemKey))?.key ?? groups[0]?.key

export function AdminShell({ groups, active, onChange, title, subtitle, children }: AdminShellProps) {
  const { tx } = useLanguage()
  // Opening follows the active item, so a deep link lands with its group open.
  const [openGroup, setOpenGroup] = useState<string | undefined>(() => groupOf(groups, active))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const activeItem = groups.flatMap((group) => group.items).find((item) => item.key === active)

  return (
    <div className="admin-shell">
      <aside className={mobileNavOpen ? 'admin-sidebar open' : 'admin-sidebar'}>
        <div className="admin-sidebar-head">
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>

        <nav aria-label={tx('Admin sections', 'أقسام الإدارة')}>
          {groups.map((group) => {
            const expanded = openGroup === group.key
            const GroupIcon = group.icon
            const pending = group.items.reduce((total, item) => total + (item.badge ?? 0), 0)

            return (
              <div className="admin-group" key={group.key}>
                <button
                  type="button"
                  className={expanded ? 'admin-group-head expanded' : 'admin-group-head'}
                  aria-expanded={expanded}
                  onClick={() => setOpenGroup(expanded ? undefined : group.key)}
                >
                  <GroupIcon size={17} />
                  <span>{group.label}</span>
                  {pending > 0 && <em className="admin-badge">{pending}</em>}
                  <ChevronDown size={15} className="admin-chevron" />
                </button>

                {expanded && (
                  <div className="admin-group-items">
                    {group.items.map((item, index) => {
                      const ItemIcon = item.icon
                      const newCluster =
                        item.subgroup !== undefined && item.subgroup !== group.items[index - 1]?.subgroup

                      return (
                        <div key={item.key}>
                          {newCluster && <p className="admin-subgroup">{item.subgroup}</p>}
                          <button
                            type="button"
                            className={item.key === active ? 'admin-item active' : 'admin-item'}
                            onClick={() => {
                              onChange(item.key)
                              setMobileNavOpen(false)
                            }}
                          >
                            <ItemIcon size={16} />
                            <span>{item.label}</span>
                            {item.badge ? <em className="admin-badge">{item.badge}</em> : null}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-main-head">
          <button
            type="button"
            className="admin-nav-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-expanded={mobileNavOpen}
          >
            {tx('Sections', 'الأقسام')}
          </button>
          <h2>{activeItem?.label ?? title}</h2>
        </header>

        <div className="admin-content">{children}</div>
      </section>
    </div>
  )
}
