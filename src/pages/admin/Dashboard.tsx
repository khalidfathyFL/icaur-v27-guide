import { useCallback, useEffect, useState } from 'react'
import { Check, FileEdit, FileText, MessageCircleQuestion, MessageSquare, Newspaper, PartyPopper, Users, X } from 'lucide-react'
import { Avatar, Card, CardLink, EmptyState, StatCard } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import { useAuth } from '../../auth/authContext'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiAuditEntry, type ApiStats } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { postTitle } from '../../lib/postLanguage'
import { ACTION_LABELS } from './auditLabels'
import type { PendingCounts } from './usePendingCounts'

/** Hex for each launch colour, used only as a small swatch beside its name. */
const SWATCHES: Record<string, string> = {
  White: '#f2f2f0',
  Black: '#1b1b1d',
  Grey: '#8a8d91',
  Silver: '#c7cbd0',
  Green: '#3f5d4a',
  Brown: '#6b4f3a',
}

const TRIM_LABELS: Record<string, string> = { play: 'Play RWD', wild: 'Wild AWD' }

type WaitingItem = {
  kind: 'posts' | 'suggestions' | 'comments'
  id: string
  title: string
  author: string
  createdAt: string
}

/**
 * What needs attention first, then who owns what. Each breakdown is a
 * single-series magnitude comparison, so the bars use one hue and carry
 * their own value label instead of a legend.
 */
export function Dashboard({ counts, onChanged }: { counts: PendingCounts | null; onChanged: () => void }) {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const { can } = useAuth()
  const [stats, setStats] = useState<ApiStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState<WaitingItem[] | null>(null)
  const [activity, setActivity] = useState<ApiAuditEntry[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .stats()
      .then(({ stats: result }) => {
        if (!cancelled) setStats(result)
      })
      .catch((caught) => {
        if (!cancelled) setStatsError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.')))
      })
    if (can('audit.read')) {
      api
        .audit()
        .then(({ entries }) => {
          if (!cancelled) setActivity(entries.slice(0, 8))
        })
        .catch(() => {
          if (!cancelled) setActivity([])
        })
    }
    return () => {
      cancelled = true
    }
  }, [can, tx])

  const loadWaiting = useCallback(() => {
    const none = Promise.resolve(null)
    Promise.allSettled([
      can('posts.review') ? api.listPosts({ status: 'pending' }) : none,
      can('suggestions.review') ? api.listSuggestions({ queue: true, status: 'pending' }) : none,
      can('comments.review') ? api.commentQueue('pending') : none,
    ]).then(([posts, suggestions, comments]) => {
      const items: WaitingItem[] = []
      if (posts.status === 'fulfilled' && posts.value) {
        for (const post of posts.value.posts) {
          items.push({ kind: 'posts', id: post.id, title: postTitle(post, language), author: post.authorName, createdAt: post.createdAt })
        }
      }
      if (suggestions.status === 'fulfilled' && suggestions.value) {
        for (const item of suggestions.value.suggestions) {
          items.push({ kind: 'suggestions', id: item.id, title: item.target.id, author: item.authorName, createdAt: item.createdAt })
        }
      }
      if (comments.status === 'fulfilled' && comments.value) {
        for (const comment of comments.value.comments) {
          items.push({ kind: 'comments', id: comment.id, title: comment.body, author: comment.authorName, createdAt: comment.createdAt })
        }
      }
      // Oldest first: whoever has waited longest is answered first.
      setWaiting(items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 6))
    })
  }, [can, language])

  useEffect(loadWaiting, [loadWaiting])

  async function decide(item: WaitingItem, decision: 'approved' | 'rejected') {
    setBusyId(item.id)
    try {
      const input = { status: decision }
      if (item.kind === 'posts') await api.reviewPost(item.id, input)
      else if (item.kind === 'suggestions') await api.reviewSuggestion(item.id, input)
      else await api.reviewComment(item.id, input)
      toast(decision === 'approved' ? tx('Approved.', 'تم القبول.') : tx('Rejected.', 'تم الرفض.'))
      loadWaiting()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const kindLabels = { posts: tx('Post', 'مقال'), suggestions: tx('Correction', 'تصحيح'), comments: tx('Comment', 'تعليق') }

  /** Drops the "not set" bucket from a breakdown and sorts busiest first. */
  const named = (rows: { value: string | null; count: number }[], label?: (value: string) => string) =>
    rows
      .filter((row): row is { value: string; count: number } => Boolean(row.value))
      .map((row) => ({ label: label?.(row.value) ?? row.value, count: row.count }))
      .sort((a, b) => b.count - a.count)

  const unsetTrim = stats?.byTrim.find((row) => row.value === null)?.count ?? 0
  const noOne = tx('Nobody has told us yet.', 'لم يخبرنا أحد بعد.')

  return (
    <div className="panel-stack">
      <div className="panel-grid stats">
        {can('posts.review') && (
          <StatCard
            icon={Newspaper}
            tone={counts?.posts ? 'warn' : 'neutral'}
            label={tx('Posts to review', 'مقالات للمراجعة')}
            value={counts ? counts.posts : null}
            href="#/admin/posts"
            linkLabel={tx('Open queue', 'افتح القائمة')}
          />
        )}
        {can('suggestions.review') && (
          <StatCard
            icon={FileEdit}
            tone={counts?.suggestions ? 'warn' : 'neutral'}
            label={tx('Corrections to review', 'تصحيحات للمراجعة')}
            value={counts ? counts.suggestions : null}
            href="#/admin/suggestions"
            linkLabel={tx('Open queue', 'افتح القائمة')}
          />
        )}
        {can('comments.review') && (
          <StatCard
            icon={MessageSquare}
            tone={counts?.comments ? 'warn' : 'neutral'}
            label={tx('Comments to review', 'تعليقات للمراجعة')}
            value={counts ? counts.comments : null}
            href="#/admin/comments"
            linkLabel={tx('Open queue', 'افتح القائمة')}
          />
        )}
        {can('comments.review') && (
          <StatCard
            icon={MessageCircleQuestion}
            tone={counts?.questions || counts?.answers ? 'warn' : 'neutral'}
            label={tx('Questions and answers to review', 'أسئلة وإجابات للمراجعة')}
            value={counts ? counts.questions + counts.answers : null}
            href={counts && counts.questions === 0 && counts.answers > 0 ? '#/admin/answers' : '#/admin/questions'}
            linkLabel={tx('Open queue', 'افتح القائمة')}
          />
        )}
        <StatCard
          icon={Users}
          tone="accent"
          label={tx('Accounts', 'الحسابات')}
          value={stats ? stats.total : statsError ? '—' : null}
          hint={stats ? tx(`${stats.recent} new in 30 days`, `${stats.recent} جديد خلال 30 يوما`) : undefined}
          href={can('users.manage') ? '#/admin/users' : undefined}
          linkLabel={tx('Manage', 'إدارة')}
        />
        <StatCard
          icon={FileText}
          tone="info"
          label={tx('Published posts', 'مقالات منشورة')}
          value={stats ? stats.approvedPosts : statsError ? '—' : null}
          href="#/blog"
          linkLabel={tx('See on site', 'اعرض في الموقع')}
        />
      </div>

      {statsError && <p className="form-error">{statsError}</p>}

      <div className="panel-grid wide-left">
        <Card title={tx('Needs review', 'يحتاج مراجعة')} description={tx('Longest waiting first', 'الأقدم انتظارا أولا')} flush>
          {waiting === null ? (
            <div className="panel-list">
              {[0, 1, 2].map((index) => (
                <div className="panel-list-row" key={index}>
                  <span className="panel-skeleton" />
                </div>
              ))}
            </div>
          ) : waiting.length === 0 ? (
            <EmptyState icon={PartyPopper} title={tx('All caught up', 'لا يوجد ما يحتاج مراجعة')} text={tx('Nothing is waiting for review.', 'لا توجد عناصر في انتظار المراجعة.')} />
          ) : (
            <ul className="panel-list">
              {waiting.map((item) => (
                <li className="panel-list-row" key={`${item.kind}-${item.id}`}>
                  <a className="panel-cell-main" href={`#/admin/${item.kind}?id=${item.id}`}>
                    <strong className="panel-clamp one">{item.title}</strong>
                    <small>
                      <span className="panel-kind">{kindLabels[item.kind]}</span> {item.author} · {formatDate(item.createdAt, language)}
                    </small>
                  </a>
                  <span className="panel-row-actions">
                    <button
                      type="button"
                      className="panel-icon-button success"
                      disabled={busyId === item.id}
                      onClick={() => decide(item, 'approved')}
                      aria-label={tx('Approve', 'قبول')}
                      title={tx('Approve', 'قبول')}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="panel-icon-button danger"
                      disabled={busyId === item.id}
                      onClick={() => decide(item, 'rejected')}
                      aria-label={tx('Reject', 'رفض')}
                      title={tx('Reject', 'رفض')}
                    >
                      <X size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {can('audit.read') && (
          <Card title={tx('Recent activity', 'آخر النشاط')} action={<CardLink href="#/admin/activity">{tx('View all', 'عرض الكل')}</CardLink>} flush>
            {activity === null ? (
              <div className="panel-list">
                <div className="panel-list-row">
                  <span className="panel-skeleton" />
                </div>
              </div>
            ) : activity.length === 0 ? (
              <EmptyState title={tx('Nothing has happened yet', 'لم يحدث شيء بعد')} />
            ) : (
              <ul className="panel-list compact">
                {activity.map((entry) => (
                  <li className="panel-list-row" key={entry.id}>
                    <Avatar name={entry.actorName} size="sm" />
                    <span className="panel-cell-main">
                      <span>
                        <strong>{entry.actorName}</strong> {ACTION_LABELS[entry.action] ? t(ACTION_LABELS[entry.action]) : entry.action}
                      </span>
                      <small>
                        {entry.target?.label ? `${entry.target.label} · ` : ''}
                        {formatDate(entry.at, language, true)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <Card
        title={tx('Who owns what', 'من يملك ماذا')}
        description={tx(
          'Counts only. Individual details stay on the Accounts page and are never aggregated into anything that identifies someone.',
          'أعداد فقط. بيانات الأفراد تبقى في صفحة الحسابات ولا تُجمع أبدا في شيء يحدد هوية أحد.',
        )}
      >
        {stats ? (
          <>
            <div className="bar-grid">
              <BarList
                title={tx('Owners or just interested', 'ملاك أم مهتمون')}
                // The site and the API deploy separately, so an older API may not send this yet.
                rows={named(stats.byOwnership ?? [], (value) =>
                  value === 'owner' ? tx('Own a V27', 'يملكون V27') : tx('Just interested', 'مهتمون فقط'),
                )}
                emptyLabel={noOne}
              />
              <BarList title={tx('Which trim they own', 'الفئة التي يملكونها')} rows={named(stats.byTrim, (value) => TRIM_LABELS[value] ?? value)} emptyLabel={noOne} />
              <BarList title={tx('Country', 'الدولة')} rows={named(stats.byCountry)} emptyLabel={noOne} />
              <BarList title={tx('Governorate', 'المحافظة')} rows={named(stats.byCity)} emptyLabel={noOne} />
              <BarList title={tx('Colour', 'اللون')} rows={named(stats.byColour)} emptyLabel={noOne} swatchFor={(label) => SWATCHES[label]} />
            </div>
            {unsetTrim > 0 && (
              <p className="panel-muted panel-footnote">
                {tx(
                  `${unsetTrim} ${unsetTrim === 1 ? 'account has' : 'accounts have'} not said which trim they own.`,
                  `${unsetTrim} حساب لم يحدد الفئة التي يملكها.`,
                )}
              </p>
            )}
          </>
        ) : (
          <span className="panel-skeleton" />
        )}
      </Card>
    </div>
  )
}

/**
 * A labelled magnitude list. Bars share one hue because this compares amounts
 * of a single measure rather than distinct series, and every bar is directly
 * labelled so the value never depends on reading the length.
 */
function BarList({
  title,
  rows,
  emptyLabel,
  swatchFor,
}: {
  title: string
  rows: { label: string; count: number }[]
  emptyLabel: string
  swatchFor?: (label: string) => string | undefined
}) {
  const max = Math.max(...rows.map((row) => row.count), 1)

  return (
    <section className="bar-list">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="panel-muted">{emptyLabel}</p>
      ) : (
        <ol>
          {rows.map((row) => {
            const swatch = swatchFor?.(row.label)
            return (
              <li key={row.label} title={`${row.label}: ${row.count}`}>
                <span className="bar-label">
                  {swatch && <i className="bar-swatch" style={{ background: swatch }} aria-hidden />}
                  {row.label}
                </span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
                </span>
                <span className="bar-value">{row.count}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
