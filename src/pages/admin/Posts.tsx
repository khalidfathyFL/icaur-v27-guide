import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, ExternalLink, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { DetailList } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { RichTextEditor } from '../../components/editor/RichTextEditor'
import { StatusPill } from '../../components/StatusPill'
import { useAuth } from '../../auth/authContext'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiPost } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { postDraftProblem, postTitle } from '../../lib/postLanguage'
import { QueueEmpty, ReviewFooter, StatusFilter, type QueueStatus } from './moderation'
import { useOpenRecord } from './useOpenRecord'

export function Posts({ params, onChanged }: { params: URLSearchParams; onChanged: () => void }) {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const record = useOpenRecord('/admin/posts', params)
  // A deep link to one post should find it whatever its status.
  const [status, setStatus] = useState<QueueStatus>(record.openId ? 'all' : 'pending')
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listPosts({ status })
      .then(({ posts: list }) => {
        setPosts(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [status, tx])

  useEffect(load, [load])

  const selected = posts?.find((post) => post.id === record.openId) ?? null

  return (
    <>
      <DataTable
        rows={posts}
        rowKey={(post) => post.id}
        error={error}
        searchText={(post) => `${post.title.en} ${post.title.ar} ${post.authorName}`}
        searchPlaceholder={tx('Search title or author…', 'ابحث بالعنوان أو الكاتب…')}
        filters={
          <StatusFilter
            value={status}
            onChange={(next) => {
              setPosts(null)
              setStatus(next)
            }}
          />
        }
        onRowClick={(post) => record.open(post.id)}
        empty={<QueueEmpty status={status} />}
        columns={[
          {
            key: 'title',
            header: tx('Post', 'المقال'),
            width: 'minmax(0, 3fr)',
            render: (post) => (
              <span className="panel-cell-main">
                <strong>
                  {post.pinned && <Pin size={13} className="post-pin-icon" aria-label={tx('Pinned', 'مثبّت')} />}
                  {postTitle(post, language)}
                </strong>
                <small>{post.authorName}</small>
              </span>
            ),
          },
          { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (post) => <StatusPill status={post.status} /> },
          {
            key: 'date',
            header: tx('Submitted', 'تاريخ الإرسال'),
            width: '140px',
            render: (post) => <span className="panel-muted">{formatDate(post.createdAt, language)}</span>,
          },
          {
            key: 'open',
            header: '',
            width: '110px',
            align: 'end',
            render: (post) => (
              <button type="button" className="panel-button small" onClick={() => record.open(post.id)}>
                {post.status === 'pending' ? tx('Review', 'راجع') : tx('Open', 'افتح')}
                <ChevronRight size={15} aria-hidden="true" className="flip-rtl" />
              </button>
            ),
          },
        ]}
      />

      {selected && (
        <PostDrawer
          key={selected.id}
          post={selected}
          onClose={record.close}
          onChanged={() => {
            load()
            onChanged()
          }}
          onDeleted={() => {
            record.close()
            toast(tx('Post deleted.', 'تم حذف المقال.'))
            load()
            onChanged()
          }}
        />
      )}
    </>
  )
}

function PostDrawer({
  post,
  onClose,
  onChanged,
  onDeleted,
}: {
  post: ApiPost
  onClose: () => void
  onChanged: () => void
  onDeleted: () => void
}) {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  // Editing needs its own permission and deleting is admin-only, unlike reviewing.
  const { isAdmin, can } = useAuth()
  const canEdit = can('posts.edit')
  // Only a published post shows on the site, so only it is offered for pinning;
  // a pinned post that is later unpublished can still be unpinned.
  const canPin = can('posts.review') && (post.status === 'approved' || Boolean(post.pinned))
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [titleEn, setTitleEn] = useState(post.title.en)
  const [titleAr, setTitleAr] = useState(post.title.ar)
  const [bodyEn, setBodyEn] = useState(post.body.en)
  const [bodyAr, setBodyAr] = useState(post.body.ar)

  async function decide(decision: 'approved' | 'rejected', note: string) {
    setBusy(true)
    try {
      await api.reviewPost(post.id, { status: decision, note: note || undefined })
      toast(decision === 'approved' ? tx('Post published.', 'تم نشر المقال.') : tx('Post rejected.', 'تم رفض المقال.'))
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function togglePin() {
    setBusy(true)
    try {
      await api.pinPost(post.id, !post.pinned)
      toast(post.pinned ? tx('Post unpinned.', 'تم إلغاء تثبيت المقال.') : tx('Post pinned to the top.', 'تم تثبيت المقال في الأعلى.'))
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    const title = { en: titleEn, ar: titleAr }
    const body = { en: bodyEn, ar: bodyAr }
    const problem = postDraftProblem(title, body)
    if (problem) {
      toast(tx(problem.en, problem.ar), 'error')
      return
    }

    setBusy(true)
    try {
      await api.updatePost(post.id, { title, body })
      toast(tx('Changes saved.', 'تم حفظ التغييرات.'))
      setEditing(false)
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const ok = await confirm({
      title: tx('Delete this post?', 'حذف هذا المقال؟'),
      message: tx(
        'It disappears from the site and from its author’s list. This cannot be undone.',
        'سيختفي من الموقع ومن قائمة كاتبه. لا يمكن التراجع عن ذلك.',
      ),
      confirmLabel: tx('Delete', 'حذف'),
      tone: 'danger',
    })
    if (!ok) return

    setBusy(true)
    try {
      await api.deletePost(post.id)
      onDeleted()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')), 'error')
      setBusy(false)
    }
  }

  const footer = editing ? (
    <div className="panel-drawer-actions">
      <button type="button" className="panel-button" disabled={busy} onClick={() => setEditing(false)}>
        {tx('Cancel', 'إلغاء')}
      </button>
      <button type="button" className="panel-button primary" disabled={busy} onClick={save}>
        {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save changes', 'احفظ التغييرات')}
      </button>
    </div>
  ) : (
    <>
      {post.status === 'pending' && <ReviewFooter busy={busy} onDecide={decide} />}
      <div className="panel-drawer-actions spread">
        <a className="panel-button ghost" href={`#/blog/${post.slug}`}>
          <ExternalLink size={15} aria-hidden="true" /> {tx('Open on site', 'افتح في الموقع')}
        </a>
        {(isAdmin || canEdit || canPin) && (
          <div>
            {canPin && (
              <button type="button" className="panel-button" disabled={busy} onClick={togglePin}>
                {post.pinned ? <PinOff size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />}
                {post.pinned ? tx('Unpin', 'إلغاء التثبيت') : tx('Pin to top', 'ثبّت في الأعلى')}
              </button>
            )}
            {isAdmin && (
              <button type="button" className="panel-button danger-soft" disabled={busy} onClick={remove}>
                <Trash2 size={15} aria-hidden="true" /> {tx('Delete', 'حذف')}
              </button>
            )}
            {canEdit && (
              <button type="button" className="panel-button" disabled={busy} onClick={() => setEditing(true)}>
                <Pencil size={15} aria-hidden="true" /> {tx('Edit', 'تعديل')}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )

  return (
    <Drawer
      open
      size="lg"
      busy={busy}
      title={editing ? tx('Edit post', 'تعديل المقال') : postTitle(post, language)}
      subtitle={`${post.authorName} · ${formatDate(post.createdAt, language)}`}
      onClose={onClose}
      footer={footer}
    >
      {editing ? (
        <div className="auth-form wide panel-form">
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
        </div>
      ) : (
        <>
          <DetailList
            rows={[
              { label: tx('Status', 'الحالة'), value: <StatusPill status={post.status} /> },
              { label: tx('Author', 'الكاتب'), value: post.authorName },
              { label: tx('Submitted', 'تاريخ الإرسال'), value: formatDate(post.createdAt, language, true) },
              { label: tx('Last edited', 'آخر تعديل'), value: formatDate(post.updatedAt, language, true) },
              { label: tx('Review note', 'ملاحظة المراجعة'), value: post.reviewNote },
            ]}
          />
          <PostBody label={tx('English', 'الإنجليزية')} title={post.title.en} html={post.body.en} dir="ltr" />
          <PostBody label={tx('Arabic', 'العربية')} title={post.title.ar} html={post.body.ar} dir="rtl" />
        </>
      )}
    </Drawer>
  )
}

function PostBody({ label, title, html, dir }: { label: string; title: string; html: string; dir: 'ltr' | 'rtl' }) {
  if (!title && !html) return null
  return (
    <section className="panel-preview" dir={dir}>
      <p className="panel-preview-label">{label}</p>
      {title && <h3>{title}</h3>}
      {/* Sanitized on the server when the post was saved, as on the public post page. */}
      <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}
