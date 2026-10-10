import { useState, type FormEvent } from 'react'
import { Car, KeyRound, MapPin, Save, UserCog } from 'lucide-react'
import { PageFrame, SectionHeading } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import {
  COUNTRIES,
  EGYPT,
  EGYPT_GOVERNORATES,
  PASSWORD_RULE,
  STRONG_PASSWORD,
} from '../content/places'
import { ApiError, api, apiConfigured } from '../lib/api'
import { TRIMS } from '../vehicle/trimContext'
import { ServiceUnavailable } from './AccountPage'

export function ProfilePage() {
  const { tx } = useLanguage()
  const { user, loading } = useAuth()

  if (!apiConfigured) return <ServiceUnavailable />

  if (loading) {
    return (
      <PageFrame eyebrow={tx('Profile', 'الملف الشخصي')} title={tx('Loading…', 'جارٍ التحميل…')} intro="">
        <span />
      </PageFrame>
    )
  }

  if (!user) {
    return (
      <PageFrame
        eyebrow={tx('Profile', 'الملف الشخصي')}
        title={tx('Sign In First', 'سجل الدخول أولا')}
        intro={tx(
          'Your profile keeps your contact details and which V27 you own.',
          'ملفك الشخصي يحفظ بيانات التواصل ونوع V27 التي تملكها.',
        )}
      >
        <a className="primary-action" href="#/signin">
          {tx('Sign in', 'تسجيل الدخول')}
        </a>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      eyebrow={tx('Profile', 'الملف الشخصي')}
      title={tx('Your Details', 'بياناتك')}
      intro={tx(
        'Tell us how to reach you and which V27 you drive. Your trim decides which equipment the guides show as standard for you.',
        'أخبرنا كيف نتواصل معك وأي فئة من V27 تقودها. الفئة تحدد التجهيزات التي تظهر لك كقياسية في الأدلة.',
      )}
    >
      <ProfileForm />
      <PasswordForm />
    </PageFrame>
  )
}

function ProfileForm() {
  const { t, tx } = useLanguage()
  const { user, refresh } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [country, setCountry] = useState(user?.country ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [trim, setTrim] = useState(user?.trim ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ProfilePage only renders this form once the signed-in user has loaded, so
  // the initial state above is already seeded from it.
  const inEgypt = country === EGYPT

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      await api.updateProfile({
        name,
        phone: phone || undefined,
        country: country || undefined,
        city: city || undefined,
        trim: trim === 'play' || trim === 'wild' ? trim : undefined,
      })
      await refresh()
      setMessage(tx('Saved.', 'تم الحفظ.'))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="contribute-block">
      <SectionHeading eyebrow={tx('Account', 'الحساب')} title={tx('Your Details', 'بياناتك')} compact />

      <form className="auth-form wide" onSubmit={onSubmit}>
        <label>
          <span>
            <UserCog size={15} /> {tx('Name', 'الاسم')}
          </span>
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
        </label>

        <label>
          <span>{tx('Email', 'البريد الإلكتروني')}</span>
          <input value={user?.email ?? ''} disabled />
          <small>{tx('Your email identifies the account and cannot be changed here.', 'البريد الإلكتروني يعرّف الحساب ولا يمكن تغييره من هنا.')}</small>
        </label>

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
          <small>
            {tx(
              'Optional. Only admins can see it, and it is never shown on the site.',
              'اختياري. المشرفون فقط يرونه ولا يظهر على الموقع إطلاقا.',
            )}
          </small>
        </label>

        <label>
          <span>
            <MapPin size={15} /> {tx('Country', 'الدولة')}
          </span>
          <select
            value={country}
            onChange={(event) => {
              setCountry(event.target.value)
              // A governorate is meaningless once the country is not Egypt.
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
            <span>{inEgypt ? tx('Governorate', 'المحافظة') : tx('City', 'المدينة')}</span>
            {inEgypt ? (
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

        <label>
          <span>
            <Car size={15} /> {tx('Which V27 do you own?', 'أي V27 تملك؟')}
          </span>
          <select value={trim} onChange={(event) => setTrim(event.target.value)}>
            <option value="">{tx('Not set / I do not own one yet', 'غير محدد / لا أملك واحدة بعد')}</option>
            {TRIMS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <button className="primary-action" type="submit" disabled={busy}>
          <Save size={18} />
          {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save details', 'احفظ البيانات')}
        </button>
      </form>
    </section>
  )
}

function PasswordForm() {
  const { t, tx } = useLanguage()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError(tx('Passwords do not match', 'كلمتا المرور غير متطابقتين'))
      return
    }

    // Mirrors the rule the API enforces, so the message is instant and specific
    // rather than a round-trip 400.
    if (!STRONG_PASSWORD.test(newPassword)) {
      setError(t(PASSWORD_RULE))
      return
    }

    setBusy(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      setMessage(tx('Password changed.', 'تم تغيير كلمة المرور.'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not change it.', 'تعذر التغيير.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="contribute-block">
      <SectionHeading eyebrow={tx('Security', 'الأمان')} title={tx('Change Password', 'تغيير كلمة المرور')} compact />

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          <span>{tx('Current password', 'كلمة المرور الحالية')}</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <label>
          <span>{tx('New password', 'كلمة المرور الجديدة')}</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
          <small>{t(PASSWORD_RULE)}</small>
        </label>

        <label>
          <span>{tx('Confirm new password', 'تأكيد كلمة المرور الجديدة')}</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <button className="primary-action" type="submit" disabled={busy}>
          <KeyRound size={18} />
          {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Change password', 'غيّر كلمة المرور')}
        </button>
      </form>
    </section>
  )
}
