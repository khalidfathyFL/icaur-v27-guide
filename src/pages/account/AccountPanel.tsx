import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { ACCOUNT_GROUPS, ACCOUNT_SECTIONS } from '../../app/panelNav'
import { useAuth } from '../../auth/authContext'
import { EmptyState } from '../../components/panel/blocks'
import { PanelShell, type ShellGroup } from '../../components/panel/PanelShell'
import { usePanelGate } from '../../components/panel/usePanelGate'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { apiConfigured } from '../../lib/api'
import { PostComposer, SuggestionComposer } from './Compose'
import { MyPosts, MySuggestions } from './MyPosts'
import { Overview } from './Overview'
import { Profile, Security } from './Profile'

/** The owner's own panel: their contributions, their profile, their sign-in. */
export function AccountPanel({ section, routeKey }: { section: string; routeKey: string }) {
  const { t } = useLanguage()
  const tx = useShortText()
  const { user, loading } = useAuth()
  const gate = usePanelGate({ apiConfigured, loading, signedIn: Boolean(user), returnTo: `/account/${section}` })

  if (gate) return gate

  const active = section || 'dashboard'

  const groups: ShellGroup[] = ACCOUNT_GROUPS.map((group) => ({
    key: group.key,
    label: t(group.label),
    icon: group.icon,
    items: ACCOUNT_SECTIONS.filter((item) => item.group === group.key).map((item) => ({
      key: item.key,
      label: t(item.label),
      description: t(item.description),
      icon: item.icon,
    })),
  }))

  const sections: Record<string, ReactNode> = {
    dashboard: <Overview />,
    posts: <MyPosts />,
    suggestions: <MySuggestions />,
    'new-post': <PostComposer />,
    suggest: <SuggestionComposer />,
    profile: <Profile />,
    security: <Security />,
  }
  const content = sections[active]

  return (
    <PanelShell kind="account" groups={groups} active={content ? active : ''}>
      <div className="panel-section" key={routeKey}>
        {content ?? (
          <EmptyState
            icon={ShieldAlert}
            title={tx('Page not found', 'الصفحة غير موجودة')}
            action={
              <a className="panel-button primary" href="#/account">
                {tx('Back to my dashboard', 'العودة إلى لوحتي')}
              </a>
            }
          />
        )}
      </div>
    </PanelShell>
  )
}
