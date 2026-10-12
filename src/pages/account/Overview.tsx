import { CheckCircle2, Clock, FileEdit, FilePlus2, PenLine, UserCog, XCircle } from 'lucide-react'
import { Card, CardLink, EmptyState, StatCard } from '../../components/panel/blocks'
import { StatusPill } from '../../components/StatusPill'
import { useAuth } from '../../auth/authContext'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { formatDate } from '../../lib/format'
import { useMyContributions } from './useMyContributions'

/** The owner's landing page: how their contributions are doing, and where to go next. */
export function Overview() {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const { user } = useAuth()
  const { posts, suggestions, error } = useMyContributions(tx('Could not load.', 'تعذر التحميل.'))

  const loaded = posts !== null && suggestions !== null
  const all = [...(posts ?? []), ...(suggestions ?? [])]
  const count = (status: string) => (loaded ? all.filter((item) => item.status === status).length : null)

  const recent = loaded
    ? [
        ...posts.map((post) => ({
          id: post.id,
          kind: tx('Post', 'مقال'),
          title: t(post.title) || post.title.en || post.title.ar,
          status: post.status,
          note: post.reviewNote,
          date: post.updatedAt,
          href: '#/account/posts',
        })),
        ...suggestions.map((item) => ({
          id: item.id,
          kind: tx('Correction', 'تصحيح'),
          title: item.target.id,
          status: item.status,
          note: item.reviewNote,
          date: item.createdAt,
          href: '#/account/suggestions',
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6)
    : null

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="panel-stack">
      <div className="panel-welcome">
        <div>
          <h2>{tx(`Welcome back, ${firstName}`, `مرحبا بعودتك يا ${firstName}`)}</h2>
          <p>
            {tx(
              'Everything you send is reviewed by an admin before it appears on the site.',
              'يراجع المشرف كل ما ترسله قبل ظهوره على الموقع.',
            )}
          </p>
        </div>
        <div className="panel-page-actions">
          <a className="panel-button primary" href="#/account/new-post">
            <PenLine size={16} aria-hidden="true" /> {tx('Write a post', 'اكتب مقالا')}
          </a>
          <a className="panel-button" href="#/account/suggest">
            <FileEdit size={16} aria-hidden="true" /> {tx('Suggest a correction', 'اقترح تصحيحا')}
          </a>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="panel-grid stats">
        <StatCard icon={CheckCircle2} tone="ok" label={tx('Published', 'منشور')} value={count('approved')} />
        <StatCard icon={Clock} tone="warn" label={tx('Awaiting review', 'في انتظار المراجعة')} value={count('pending')} />
        <StatCard icon={XCircle} tone="danger" label={tx('Not accepted', 'غير مقبول')} value={count('rejected')} />
        <StatCard
          icon={FilePlus2}
          tone="accent"
          label={tx('Posts written', 'مقالات مكتوبة')}
          value={posts ? posts.length : null}
          href="#/account/posts"
          linkLabel={tx('My posts', 'مقالاتي')}
        />
      </div>

      <div className="panel-grid wide-left">
        <Card title={tx('Recent contributions', 'آخر المساهمات')} action={<CardLink href="#/account/posts">{tx('View all', 'عرض الكل')}</CardLink>} flush>
          {recent === null ? (
            <div className="panel-list">
              <div className="panel-list-row">
                <span className="panel-skeleton" />
              </div>
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={PenLine}
              title={tx('Nothing sent yet', 'لم ترسل شيئا بعد')}
              text={tx('Share what you learned about your V27, or fix something the guides get wrong.', 'شارك ما تعلمته عن V27 أو صحح خطأ في الأدلة.')}
              action={
                <a className="panel-button primary" href="#/account/new-post">
                  {tx('Write your first post', 'اكتب أول مقال')}
                </a>
              }
            />
          ) : (
            <ul className="panel-list">
              {recent.map((item) => (
                <li className="panel-list-row" key={item.id}>
                  <a className="panel-cell-main" href={item.href}>
                    <strong className="panel-clamp one">{item.title}</strong>
                    <small>
                      <span className="panel-kind">{item.kind}</span> {formatDate(item.date, language)}
                      {item.note ? ` · “${item.note}”` : ''}
                    </small>
                  </a>
                  <StatusPill status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={tx('Your profile', 'ملفك الشخصي')} action={<CardLink href="#/account/profile">{tx('Edit', 'تعديل')}</CardLink>}>
          <ul className="panel-checklist">
            <ProfileCheck done={Boolean(user?.trim)} label={tx('Which V27 you own', 'أي V27 تملك')} />
            <ProfileCheck done={Boolean(user?.colour)} label={tx('Car colour', 'لون السيارة')} />
            <ProfileCheck done={Boolean(user?.country)} label={tx('Where you are', 'مكانك')} />
            <ProfileCheck done={Boolean(user?.phone)} label={tx('Mobile number (admins only)', 'رقم الموبايل (للمشرفين فقط)')} />
          </ul>
          <p className="panel-muted panel-footnote">
            {tx('Your trim decides which equipment the guides show as standard for you.', 'الفئة تحدد التجهيزات التي تظهر لك كقياسية في الأدلة.')}
          </p>
          <a className="panel-button" href="#/account/profile">
            <UserCog size={16} aria-hidden="true" /> {tx('Complete profile', 'أكمل الملف')}
          </a>
        </Card>
      </div>
    </div>
  )
}

function ProfileCheck({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={done ? 'done' : undefined}>
      {done ? <CheckCircle2 size={17} aria-hidden="true" /> : <span className="panel-check-empty" aria-hidden="true" />}
      {label}
    </li>
  )
}
