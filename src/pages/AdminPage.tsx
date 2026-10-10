import { useCallback, useEffect, useState } from 'react'
import {
  BadgeDollarSign,
  FileEdit,
  LayoutDashboard,
  Newspaper,
  ShieldCheck,
  Store,
  Users,
  Wrench,
} from 'lucide-react'
import { AdminShell, type AdminNavGroup } from '../components/admin/AdminShell'
import { PageFrame } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured } from '../lib/api'
import { DealerAdmin, PostQueue, PricingAdmin, SuggestionQueue, UserAdmin } from './admin/sections'
import { ServiceUnavailable } from './AccountPage'

/** Counts of work waiting, shown as badges on the sidebar. */
function usePendingCounts() {
  const [counts, setCounts] = useState({ posts: 0, suggestions: 0 })

  const refresh = useCallback(() => {
    Promise.allSettled([
      api.listPosts({ status: 'pending' }),
      api.listSuggestions({ queue: true, status: 'pending' }),
    ]).then(([posts, suggestions]) => {
      setCounts({
        posts: posts.status === 'fulfilled' ? posts.value.posts.length : 0,
        suggestions: suggestions.status === 'fulfilled' ? suggestions.value.suggestions.length : 0,
      })
    })
  }, [])

  useEffect(refresh, [refresh])

  return { counts, refresh }
}

export function AdminPage() {
  const { tx } = useLanguage()
  const { user, loading, isAdmin } = useAuth()
  const [active, setActive] = useState('posts')
  const { counts, refresh } = usePendingCounts()

  if (!apiConfigured) return <ServiceUnavailable />

  if (loading) {
    return (
      <PageFrame eyebrow="Admin" title={tx('Loading…', 'جارٍ التحميل…')} intro="">
        <span />
      </PageFrame>
    )
  }

  // The server checks this on every privileged call; this only keeps the page
  // tidy for someone who is not an admin.
  if (!user || !isAdmin) {
    return (
      <PageFrame
        eyebrow="Admin"
        title={tx('Admins Only', 'للمشرفين فقط')}
        intro={tx(
          'This workspace is for reviewing contributions and maintaining the market data. Sign in with an admin account to use it.',
          'هذه المساحة لمراجعة المساهمات وإدارة بيانات السوق. سجل الدخول بحساب مشرف لاستخدامها.',
        )}
      >
        <a className="primary-action" href="#/signin">
          {tx('Sign in', 'تسجيل الدخول')}
        </a>
      </PageFrame>
    )
  }

  const groups: AdminNavGroup[] = [
    {
      key: 'moderation',
      label: tx('Moderation', 'المراجعة'),
      icon: ShieldCheck,
      items: [
        {
          key: 'posts',
          label: tx('Posts', 'المقالات'),
          icon: Newspaper,
          badge: counts.posts,
          subgroup: tx('Awaiting review', 'في انتظار المراجعة'),
        },
        {
          key: 'suggestions',
          label: tx('Corrections', 'التصحيحات'),
          icon: FileEdit,
          badge: counts.suggestions,
          subgroup: tx('Awaiting review', 'في انتظار المراجعة'),
        },
      ],
    },
    {
      key: 'catalogue',
      label: tx('Market data', 'بيانات السوق'),
      icon: Wrench,
      items: [
        { key: 'dealers', label: tx('Dealers', 'الوكلاء'), icon: Store },
        { key: 'pricing', label: tx('Prices', 'الأسعار'), icon: BadgeDollarSign },
      ],
    },
    {
      key: 'people',
      label: tx('People', 'الأشخاص'),
      icon: Users,
      items: [{ key: 'users', label: tx('Accounts', 'الحسابات'), icon: LayoutDashboard }],
    },
  ]

  return (
    <PageFrame
      eyebrow="Admin"
      title={tx('Admin Workspace', 'مساحة الإدارة')}
      intro={tx(
        'Approve or reject what contributors send, and keep the dealer list and prices current.',
        'وافق أو ارفض ما يرسله المساهمون، وحافظ على تحديث قائمة الوكلاء والأسعار.',
      )}
    >
      <AdminShell
        groups={groups}
        active={active}
        onChange={setActive}
        title={tx('Workspace', 'المساحة')}
        subtitle={user.name}
      >
        {active === 'posts' && <PostQueue onChanged={refresh} />}
        {active === 'suggestions' && <SuggestionQueue onChanged={refresh} />}
        {active === 'dealers' && <DealerAdmin />}
        {active === 'pricing' && <PricingAdmin />}
        {active === 'users' && <UserAdmin currentUserId={user.id} />}
      </AdminShell>
    </PageFrame>
  )
}
