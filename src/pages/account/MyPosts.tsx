import { useState } from 'react'
import { ExternalLink, Pencil, PenLine, Trash2 } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState, FilterSelect } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { RichTextEditor } from '../../components/editor/RichTextEditor'
import { StatusPill } from '../../components/StatusPill'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiPost, type ApiSuggestion, type ReviewStatus } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { postDraftProblem, postTitle } from '../../lib/postLanguage'
import { useMyContributions } from './useMyContributions'

type StatusChoice = ReviewStatus | 'all'

function useStatusOptions() {
  const tx = useShortText()
  return [
    { value: 'all' as const, label: tx('Any status', 'أي حالة') },
    { value: 'pending' as const, label: tx('Awaiting review', 'في انتظار المراجعة') },
    { value: 'approved' as const, label: tx('Published', 'منشور') },
    { value: 'rejected' as const, label: tx('Not accepted', 'غير مقبول') },
  ]
}

export function MyPosts() {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const statusOptions = useStatusOptions()
  const { posts, error, reload } = useMyContributions(tx('Could not load.', 'تعذر التحميل.'))
  const [status, setStatus] = useState<StatusChoice>('all')
  const [editing, setEditing] = useState<ApiPost | null>(null)

  async function remove(post: ApiPost) {
    const ok = await confirm({
      title: tx('Delete this post?', 'حذف هذا المقال؟'),
      message:
        post.status === 'approved'
          ? tx('It is published, so it disappears from the site too. This cannot be undone.', 'المقال منشور، لذا سيختفي من الموقع أيضا. لا يمكن التراجع.')
          : tx('This cannot be undone.', 'لا يمكن التراجع عن ذلك.'),
      confirmLabel: tx('Delete', 'حذف'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.deletePost(post.id)
      toast(tx('Post deleted.', 'تم حذف المقال.'))
      reload()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')), 'error')
    }
  }

  const rows = posts?.filter((post) => status === 'all' || post.status === status) ?? null

  return (
    <>
      <DataTable
        rows={rows}
        rowKey={(post) => post.id}
        error={error}
        searchText={(post) => `${post.title.en} ${post.title.ar}`}
        searchPlaceholder={tx('Search your posts…', 'ابحث في مقالاتك…')}
        filters={<FilterSelect<StatusChoice> label={tx('Status', 'الحالة')} value={status} onChange={setStatus} options={statusOptions} />}
        actions={
          <a className="panel-button primary" href="#/account/new-post">
            <PenLine size={16} aria-hidden="true" /> {tx('Write a post', 'اكتب مقالا')}
          </a>
        }
        empty={
          <EmptyState
            icon={PenLine}
            title={status === 'all' ? tx('You have not written a post yet', 'لم تكتب مقالا بعد') : tx('No posts with this status', 'لا توجد مقالات بهذه الحالة')}
            text={tx('Posts are reviewed by an admin, then published on Owner Posts.', 'يراجع المشرف المقالات ثم تُنشر في مقالات الملاك.')}
          />
        }
        columns={[
          {
            key: 'title',
            header: tx('Post', 'المقال'),
            width: 'minmax(0, 3fr)',
            render: (post) => (
              <span className="panel-cell-main">
                <strong>{postTitle(post, language)}</strong>
                {post.reviewNote && <small className="panel-note">“{post.reviewNote}”</small>}
              </span>
            ),
          },
          { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (post) => <StatusPill status={post.status} /> },
          {
            key: 'updated',
            header: tx('Last change', 'آخر تغيير'),
            width: '140px',
            render: (post) => <span className="panel-muted">{formatDate(post.updatedAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '130px',
            align: 'end',
            render: (post) => (
              <span className="panel-row-actions">
                <a className="panel-icon-button" href={`#/blog/${post.slug}`} aria-label={tx('View', 'عرض')} title={tx('View', 'عرض')}>
                  <ExternalLink size={15} />
                </a>
                <button type="button" className="panel-icon-button" onClick={() => setEditing(post)} aria-label={tx('Edit', 'تعديل')} title={tx('Edit', 'تعديل')}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="panel-icon-button danger" onClick={() => remove(post)} aria-label={tx('Delete', 'حذف')} title={tx('Delete', 'حذف')}>
                  <Trash2 size={15} />
                </button>
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <EditPostDrawer
          key={editing.id}
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

function EditPostDrawer({ post, onClose, onSaved }: { post: ApiPost; onClose: () => void; onSaved: () => void }) {
  const tx = useShortText()
  const toast = useToast()
  const [titleEn, setTitleEn] = useState(post.title.en)
  const [titleAr, setTitleAr] = useState(post.title.ar)
  const [bodyEn, setBodyEn] = useState(post.body.en)
  const [bodyAr, setBodyAr] = useState(post.body.ar)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const title = { en: titleEn, ar: titleAr }
    const body = { en: bodyEn, ar: bodyAr }
    const problem = postDraftProblem(title, body)
    if (problem) {
      setError(tx(problem.en, problem.ar))
      return
    }

    setBusy(true)
    setError(null)
    try {
      await api.updatePost(post.id, { title, body })
      toast(tx('Saved and sent for review again.', 'تم الحفظ وإعادة الإرسال للمراجعة.'))
      onSaved()
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open
      size="lg"
      busy={busy}
      title={tx('Edit post', 'تعديل المقال')}
      subtitle={
        post.status === 'approved'
          ? tx(
              'This post is published. Saving takes it off the site until an admin approves it again.',
              'هذا المقال منشور. الحفظ يخفيه من الموقع حتى يوافق عليه المشرف مرة أخرى.',
            )
          : tx('Saving sends it back to the review queue.', 'الحفظ يعيده إلى قائمة المراجعة.')
      }
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions">
          <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
            {tx('Cancel', 'إلغاء')}
          </button>
          <button type="button" className="panel-button primary" disabled={busy} onClick={save}>
            {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save and resend', 'احفظ وأعد الإرسال')}
          </button>
        </div>
      }
    >
      <div className="auth-form wide panel-form">
        {post.reviewNote && (
          <p className="panel-callout">
            <strong>{tx('Reviewer’s note', 'ملاحظة المراجع')}:</strong> {post.reviewNote}
          </p>
        )}
        <label>
          <span>{tx('Title (English)', 'العنوان (إنجليزي)')}</span>
          <input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} maxLength={200} />
        </label>
        <label>
          <span>{tx('Title (Arabic)', 'العنوان (عربي)')}</span>
          <input value={titleAr} onChange={(event) => setTitleAr(event.target.value)} maxLength={200} dir="rtl" />
        </label>
        <div className="editor-field">
          <span className="editor-label">{tx('Post (English)', 'المقال (إنجليزي)')}</span>
          <RichTextEditor value={bodyEn} onChange={setBodyEn} />
        </div>
        <div className="editor-field">
          <span className="editor-label">{tx('Post (Arabic)', 'المقال (عربي)')}</span>
          <RichTextEditor value={bodyAr} onChange={setBodyAr} dir="rtl" />
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Drawer>
  )
}

export function MySuggestions() {
  const { language } = useLanguage()
  const tx = useShortText()
  const statusOptions = useStatusOptions()
  const { suggestions, error } = useMyContributions(tx('Could not load.', 'تعذر التحميل.'))
  const [status, setStatus] = useState<StatusChoice>('all')

  const rows = suggestions?.filter((item) => status === 'all' || item.status === status) ?? null
  const about = (item: ApiSuggestion) => [item.target.id, item.target.field].filter(Boolean).join(' · ')

  return (
    <DataTable
      rows={rows}
      rowKey={(item) => item.id}
      error={error}
      searchText={(item) => `${about(item)} ${item.proposed}`}
      searchPlaceholder={tx('Search your corrections…', 'ابحث في تصحيحاتك…')}
      filters={<FilterSelect<StatusChoice> label={tx('Status', 'الحالة')} value={status} onChange={setStatus} options={statusOptions} />}
      actions={
        <a className="panel-button primary" href="#/account/suggest">
          <PenLine size={16} aria-hidden="true" /> {tx('Suggest a correction', 'اقترح تصحيحا')}
        </a>
      }
      empty={
        <EmptyState
          title={status === 'all' ? tx('No corrections yet', 'لا توجد تصحيحات بعد') : tx('No corrections with this status', 'لا توجد تصحيحات بهذه الحالة')}
          text={tx('Spotted something the guides get wrong? Tell us and cite your source.', 'لاحظت خطأ في الأدلة؟ أخبرنا واذكر مصدرك.')}
        />
      }
      columns={[
        {
          key: 'about',
          header: tx('About', 'عن'),
          width: 'minmax(0, 1.6fr)',
          render: (item) => (
            <span className="panel-cell-main">
              <strong>{about(item)}</strong>
              {item.reviewNote && <small className="panel-note">“{item.reviewNote}”</small>}
            </span>
          ),
        },
        {
          key: 'proposed',
          header: tx('What it should say', 'ما يجب أن يقوله'),
          width: 'minmax(0, 2.4fr)',
          render: (item) => <span className="panel-clamp">{item.proposed}</span>,
        },
        { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (item) => <StatusPill status={item.status} /> },
        {
          key: 'date',
          header: tx('Sent', 'أرسل'),
          width: '130px',
          render: (item) => <span className="panel-muted">{formatDate(item.createdAt, language)}</span>,
        },
      ]}
    />
  )
}
