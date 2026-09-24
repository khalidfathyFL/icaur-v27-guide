import { useState, type FormEvent } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { PageFrame } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { apiConfigured, ApiError } from '../lib/api'

type Mode = 'signin' | 'register'

export function SignInPage() {
  const { tx } = useLanguage()
  const { user, signIn, register } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      if (mode === 'signin') await signIn(email, password)
      else await register(name, email, password)
      window.location.hash = '#/contribute'
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Something went wrong.', 'حدث خطأ ما.'))
    } finally {
      setBusy(false)
    }
  }

  if (!apiConfigured) return <ServiceUnavailable />

  if (user) {
    return (
      <PageFrame
        eyebrow={tx('Account', 'الحساب')}
        title={tx(`Signed in as ${user.name}`, `مسجل الدخول باسم ${user.name}`)}
        intro={tx(
          'You can write posts and suggest corrections. An admin reviews everything before it appears on the site.',
          'يمكنك كتابة مقالات واقتراح تصحيحات. يراجع المشرف كل شيء قبل ظهوره على الموقع.',
        )}
      >
        <div className="hero-actions">
          <a className="primary-action" href="#/contribute">
            {tx('Go to contributions', 'اذهب إلى المساهمات')}
          </a>
        </div>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      eyebrow={tx('Account', 'الحساب')}
      title={mode === 'signin' ? tx('Sign In', 'تسجيل الدخول') : tx('Create Account', 'إنشاء حساب')}
      intro={tx(
        'Contributors can write posts and suggest corrections to any guide. Everything is reviewed by an admin before it goes live.',
        'يمكن للمساهمين كتابة مقالات واقتراح تصحيحات لأي دليل. يراجع المشرف كل شيء قبل نشره.',
      )}
    >
      <form className="auth-form" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label>
            <span>{tx('Name', 'الاسم')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </label>
        )}

        <label>
          <span>{tx('Email', 'البريد الإلكتروني')}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          <span>{tx('Password', 'كلمة المرور')}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && (
            <small>{tx('At least 8 characters.', '8 أحرف على الأقل.')}</small>
          )}
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-action" type="submit" disabled={busy}>
          {mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}
          {busy
            ? tx('Please wait…', 'برجاء الانتظار…')
            : mode === 'signin'
              ? tx('Sign In', 'تسجيل الدخول')
              : tx('Create Account', 'إنشاء حساب')}
        </button>

        <button
          className="link-button"
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'register' : 'signin')
            setError(null)
          }}
        >
          {mode === 'signin'
            ? tx('No account yet? Create one', 'ليس لديك حساب؟ أنشئ واحدا')
            : tx('Already have an account? Sign in', 'لديك حساب؟ سجل الدخول')}
        </button>
      </form>
    </PageFrame>
  )
}

export function ServiceUnavailable() {
  const { tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Contributions', 'المساهمات')}
      title={tx('Not Available In This Build', 'غير متاح في هذه النسخة')}
      intro={tx(
        'This copy of the site was built without an API address, so accounts, posts and suggested edits are switched off. The guides, specs and comparison all still work.',
        'تم بناء هذه النسخة من الموقع بدون عنوان API، لذلك الحسابات والمقالات والتصحيحات معطلة. الأدلة والمواصفات والمقارنة تعمل كالمعتاد.',
      )}
    >
      <a className="primary-action" href="#/guides">
        {tx('Back to Guides', 'ارجع إلى الأدلة')}
      </a>
    </PageFrame>
  )
}
