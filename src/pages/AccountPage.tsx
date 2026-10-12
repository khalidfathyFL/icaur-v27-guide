import { useState, type FormEvent } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { PageFrame } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { apiConfigured, ApiError, type Ownership } from '../lib/api'
import { Segmented } from '../components/Segmented'
import {
  COUNTRIES,
  EGYPT,
  EGYPT_GOVERNORATES,
  PASSWORD_RULE,
  STRONG_PASSWORD,
} from '../content/places'
import { TRIMS } from '../vehicle/trimContext'
import { colours as CAR_COLOURS } from '../content/egypt'

type Mode = 'signin' | 'register'

/** Only same-site panel paths, so `?next=` cannot send someone off the site. */
const safeNext = (next: string | null | undefined) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

export function SignInPage({ next }: { next?: string | null }) {
  const { t, tx } = useLanguage()
  const { user, signIn, register } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  // Deliberately unset, so nobody is counted as an owner by not noticing.
  const [ownership, setOwnership] = useState<Ownership | ''>('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [trim, setTrim] = useState('')
  const [colour, setColour] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (mode === 'register') {
      if (!ownership) {
        setError(tx('Tell us whether you own a V27 or are just interested.', 'أخبرنا هل تملك V27 أم أنك مهتم فقط.'))
        return
      }
      if (password !== confirmPassword) {
        setError(tx('Passwords do not match', 'كلمتا المرور غير متطابقتين'))
        return
      }
      // Mirrors the rule the API enforces, so the message is instant and
      // specific rather than a round-trip 400.
      if (!STRONG_PASSWORD.test(password)) {
        setError(t(PASSWORD_RULE))
        return
      }
    }

    setBusy(true)

    try {
      if (mode === 'signin') await signIn(email, password, remember)
      else {
        const owner = ownership === 'owner'
        await register({
          name,
          email,
          password,
          ownership: ownership || undefined,
          phone: phone || undefined,
          country: country || undefined,
          city: city || undefined,
          trim: owner && (trim === 'play' || trim === 'wild') ? trim : undefined,
          colour: owner ? colour || undefined : undefined,
        })
      }
      window.location.hash = `#${safeNext(next)}`
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
          'Your panel has your posts, corrections and profile in one place.',
          'لوحتك تجمع مقالاتك وتصحيحاتك وملفك الشخصي في مكان واحد.',
        )}
      >
        <div className="hero-actions">
          <a className="primary-action" href={`#${safeNext(next)}`}>
            {tx('Open my panel', 'افتح لوحتي')}
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

        {mode === 'register' && (
          <div className="auth-choice">
            <span>{tx('Do you own a V27?', 'هل تملك V27؟')}</span>
            <Segmented<Ownership | ''>
              label={tx('Do you own a V27?', 'هل تملك V27؟')}
              value={ownership}
              onChange={setOwnership}
              options={[
                { value: 'owner', label: tx('I own one', 'أملك واحدة') },
                { value: 'interested', label: tx('Just interested', 'مهتم فقط') },
              ]}
            />
          </div>
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
          {mode === 'register' && <small>{t(PASSWORD_RULE)}</small>}
        </label>

        {mode === 'signin' && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>{tx('Remember me', 'تذكرني')}</span>
          </label>
        )}

        {mode === 'register' && (
          <label>
            <span>{tx('Confirm password', 'تأكيد كلمة المرور')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        )}

        {mode === 'register' && (
          <fieldset className="optional-fields">
            <legend>
              {ownership === 'owner'
                ? tx('Your car and location (optional)', 'سيارتك ومكانك (اختياري)')
                : tx('Your location (optional)', 'مكانك (اختياري)')}
            </legend>
            <p className="editor-hint">
              {tx(
                'You can skip all of this and fill it in later from your profile.',
                'يمكنك تخطي هذا كله وإكماله لاحقا من ملفك الشخصي.',
              )}
            </p>

            <label>
              <span>{tx('Mobile number', 'رقم الموبايل')}</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={32}
                placeholder="+20 1X XXXX XXXX"
                dir="ltr"
              />
            </label>

            <label>
              <span>{tx('Country', 'الدولة')}</span>
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value)
                  if (event.target.value !== EGYPT) setCity('')
                }}
              >
                <option value="">{tx('Not set', 'غير محدد')}</option>
                {COUNTRIES.map((option) => (
                  <option key={option.en} value={option.en}>
                    {t(option)}
                  </option>
                ))}
              </select>
            </label>

            {country && (
              <label>
                <span>{country === EGYPT ? tx('Governorate', 'المحافظة') : tx('City', 'المدينة')}</span>
                {country === EGYPT ? (
                  <select value={city} onChange={(event) => setCity(event.target.value)}>
                    <option value="">{tx('Not set', 'غير محدد')}</option>
                    {EGYPT_GOVERNORATES.map((option) => (
                      <option key={option.en} value={option.en}>
                        {t(option)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} />
                )}
              </label>
            )}

            {ownership === 'owner' && (
              <>
                <label>
                  <span>{tx('Which V27 do you own?', 'أي V27 تملك؟')}</span>
                  <select value={trim} onChange={(event) => setTrim(event.target.value)}>
                    <option value="">{tx('Not set', 'غير محدد')}</option>
                    {TRIMS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{tx('Car colour', 'لون السيارة')}</span>
                  <select value={colour} onChange={(event) => setColour(event.target.value)}>
                    <option value="">{tx('Not set', 'غير محدد')}</option>
                    {CAR_COLOURS.map((option) => (
                      <option key={option.en} value={option.en}>
                        {t(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </fieldset>
        )}

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
