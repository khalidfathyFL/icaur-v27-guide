import { useEffect, useState } from 'react'
import { PenLine } from 'lucide-react'
import { PageFrame } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured, type ApiPost } from '../lib/api'
import { ServiceUnavailable } from './AccountPage'

/** Renders a contributor's markdown-ish text without pulling in a parser. */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => (
          <p key={index}>{block}</p>
        ))}
    </>
  )
}

export function BlogPage() {
  const { t, tx } = useLanguage()
  const { user } = useAuth()
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false
    api
      .listPosts()
      .then(({ posts: list }) => {
        if (!cancelled) setPosts(list)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Could not load posts.', 'تعذر تحميل المقالات.'))
      })

    return () => {
      cancelled = true
    }
  }, [tx])

  if (!apiConfigured) return <ServiceUnavailable />

  return (
    <PageFrame
      eyebrow={tx('Community', 'المجتمع')}
      title={tx('Owner Posts', 'مقالات الملاك')}
      intro={tx(
        'Experiences, tips and write-ups from V27 owners. Every post is reviewed by an admin before it appears here.',
        'تجارب ونصائح ومقالات من ملاك V27. يراجع المشرف كل مقال قبل ظهوره هنا.',
      )}
    >
      <div className="hero-actions blog-actions">
        <a className="primary-action" href={user ? '#/contribute' : '#/signin'}>
          <PenLine size={18} />
          {tx('Write a post', 'اكتب مقالا')}
        </a>
      </div>

      {error && <p className="form-error">{error}</p>}

      {posts === null && !error && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>}

      {posts?.length === 0 && (
        <p className="muted-note">
          {tx('No posts published yet. Yours could be the first.', 'لا توجد مقالات منشورة بعد. قد يكون مقالك الأول.')}
        </p>
      )}

      <div className="post-list">
        {posts?.map((post) => (
          <a className="post-card" key={post.id} href={`#/blog/${post.slug}`}>
            <h2>{t(post.title)}</h2>
            <p>{t(post.excerpt)}</p>
            <small>
              {post.authorName} · {new Date(post.createdAt).toLocaleDateString()}
            </small>
          </a>
        ))}
      </div>
    </PageFrame>
  )
}

export function PostPage({ slug }: { slug: string }) {
  const { t, tx, alt } = useLanguage()
  const [post, setPost] = useState<ApiPost | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false
    api
      .readPost(slug)
      .then(({ post: found }) => {
        if (!cancelled) setPost(found)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Post not found.', 'المقال غير موجود.'))
      })

    return () => {
      cancelled = true
    }
  }, [slug, tx])

  if (!apiConfigured) return <ServiceUnavailable />

  if (error) {
    return (
      <PageFrame eyebrow={tx('Community', 'المجتمع')} title={error} intro="">
        <a className="primary-action" href="#/blog">
          {tx('Back to posts', 'ارجع إلى المقالات')}
        </a>
      </PageFrame>
    )
  }

  if (!post) {
    return (
      <PageFrame eyebrow={tx('Community', 'المجتمع')} title={tx('Loading…', 'جارٍ التحميل…')} intro="">
        <span />
      </PageFrame>
    )
  }

  const bodyAlt = alt(post.body)

  return (
    <PageFrame
      eyebrow={`${post.authorName} · ${new Date(post.createdAt).toLocaleDateString()}`}
      title={t(post.title)}
      intro={t(post.excerpt)}
    >
      {post.status !== 'approved' && (
        <p className="review-banner">
          {tx(
            'This post is still awaiting review, so only you and the admins can see it.',
            'هذا المقال ما زال في انتظار المراجعة، لذلك تراه أنت والمشرفون فقط.',
          )}
        </p>
      )}

      <article className="post-body">
        <Paragraphs text={t(post.body)} />
        {bodyAlt && (
          <div className="alt-lang" dir="rtl" lang="ar">
            <Paragraphs text={bodyAlt} />
          </div>
        )}
      </article>

      <a className="inline-link" href="#/blog">
        {tx('Back to posts', 'ارجع إلى المقالات')}
      </a>
    </PageFrame>
  )
}
