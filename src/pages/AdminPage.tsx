import { useCallback, useMemo, useState } from 'react'
import { FileText, RefreshCw, ShieldAlert, UserRound } from 'lucide-react'
import { ADMIN_GROUPS, visibleAdminSections } from '../app/panelNav'
import { useAuth } from '../auth/authContext'
import { EmptyState } from '../components/panel/blocks'
import { PanelGate } from '../components/panel/PanelGate'
import { PanelShell, type ShellGroup } from '../components/panel/PanelShell'
import { usePanelGate } from '../components/panel/usePanelGate'
import type { PaletteItem } from '../components/panel/CommandPalette'
import { useLanguage, useShortText } from '../i18n/languageContext'
import { api, apiConfigured } from '../lib/api'
import { postTitle } from '../lib/postLanguage'
import { Activity } from './admin/Activity'
import { Comments } from './admin/Comments'
import { Dashboard } from './admin/Dashboard'
import { Dealers } from './admin/Dealers'
import { Permissions } from './admin/Permissions'
import { Posts } from './admin/Posts'
import { Pricing } from './admin/Pricing'
import { Suggestions } from './admin/Suggestions'
import { Users } from './admin/Users'
import { usePendingCounts } from './admin/usePendingCounts'

/**
 * The admin panel. Each section appears only for someone holding the
 * permission the server checks for it, so a moderator trusted with comments
 * gets a panel with just the comment queue rather than an "Admins only" wall.
 */
export function AdminPage({ section, params, routeKey }: { section: string; params: URLSearchParams; routeKey: string }) {
  const { user, loading, can } = useAuth()
  const tx = useShortText()
  const gate = usePanelGate({ apiConfigured, loading, signedIn: Boolean(user), returnTo: `/admin/${section}` })

  if (gate) return gate

  if (visibleAdminSections(can).length === 0) {
    return (
      <PanelGate
        title={tx('Admins only', 'للمشرفين فقط')}
        text={tx(
          'This panel is for reviewing contributions and maintaining the market data. Your account has not been given any of that work.',
          'هذه اللوحة لمراجعة المساهمات وإدارة بيانات السوق. لم يُمنح حسابك أيا من هذه المهام.',
        )}
        actions={
          <a className="panel-button primary" href="#/account">
            {tx('Go to my account', 'اذهب إلى حسابي')}
          </a>
        }
      />
    )
  }

  return <AdminPanel section={section} params={params} routeKey={routeKey} />
}

function AdminPanel({ section, params, routeKey }: { section: string; params: URLSearchParams; routeKey: string }) {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const { can } = useAuth()
  const { counts, refresh } = usePendingCounts(can)
  const [reloads, setReloads] = useState(0)

  const visible = visibleAdminSections(can)
  const active = section || visible[0].key
  const allowed = visible.some((item) => item.key === active)

  const badges: Record<string, number | undefined> = {
    posts: counts?.posts,
    suggestions: counts?.suggestions,
    comments: counts?.comments,
  }

  const groups: ShellGroup[] = ADMIN_GROUPS.map((group) => ({
    key: group.key,
    label: t(group.label),
    icon: group.icon,
    items: visible
      .filter((item) => item.group === group.key)
      .map((item) => ({
        key: item.key,
        label: t(item.label),
        description: t(item.description),
        icon: item.icon,
        badge: badges[item.key],
      })),
  })).filter((group) => group.items.length > 0)

  // Accounts and posts become searchable from Ctrl+K, for whoever may open them.
  const loadSearch = useCallback(async (): Promise<PaletteItem[]> => {
    const [users, posts] = await Promise.allSettled([
      can('users.manage') ? api.listUsers() : Promise.resolve(null),
      can('posts.review') ? api.listPosts({ status: 'all' }) : Promise.resolve(null),
    ])
    const items: PaletteItem[] = []
    if (users.status === 'fulfilled' && users.value) {
      for (const person of users.value.users) {
        items.push({ id: `user-${person.id}`, label: person.name, hint: person.email, href: `#/admin/users?id=${person.id}`, icon: UserRound })
      }
    }
    if (posts.status === 'fulfilled' && posts.value) {
      for (const post of posts.value.posts) {
        items.push({ id: `post-${post.id}`, label: postTitle(post, language), hint: post.authorName, href: `#/admin/posts?id=${post.id}`, icon: FileText })
      }
    }
    return items
  }, [can, language])

  const content = useMemo(() => {
    if (!allowed) return null
    switch (active) {
      case 'dashboard':
        return <Dashboard counts={counts} onChanged={refresh} />
      case 'activity':
        return <Activity />
      case 'posts':
        return <Posts params={params} onChanged={refresh} />
      case 'suggestions':
        return <Suggestions params={params} onChanged={refresh} />
      case 'comments':
        return <Comments params={params} onChanged={refresh} />
      case 'dealers':
        return <Dealers />
      case 'pricing':
        return <Pricing />
      case 'users':
        return <Users params={params} />
      case 'permissions':
        return <Permissions />
      default:
        return null
    }
  }, [active, allowed, counts, params, refresh])

  return (
    <PanelShell
      kind="admin"
      groups={groups}
      active={allowed ? active : ''}
      accordion
      loadSearch={loadSearch}
      actions={
        <button
          type="button"
          className="panel-icon-button"
          onClick={() => {
            refresh()
            setReloads((count) => count + 1)
          }}
          aria-label={tx('Refresh', 'تحديث')}
          title={tx('Refresh', 'تحديث')}
        >
          <RefreshCw size={17} />
        </button>
      }
    >
      {/* Keyed by route and refresh count, so each section and each refresh starts clean. */}
      <div className="panel-section" key={`${routeKey}-${reloads}`}>
        {content ?? (
          <EmptyState
            icon={ShieldAlert}
            title={tx('This section is not available to you', 'هذا القسم غير متاح لك')}
            text={tx('Pick one of the sections in the menu.', 'اختر أحد الأقسام من القائمة.')}
          />
        )}
      </div>
    </PanelShell>
  )
}
