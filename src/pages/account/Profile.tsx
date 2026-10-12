import { useState, type FormEvent } from 'react'
import { Car, KeyRound, LogOut, MapPin, Save, ShieldCheck } from 'lucide-react'
import { Avatar, Card } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import { useAuth } from '../../auth/authContext'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { COUNTRIES, EGYPT, EGYPT_GOVERNORATES, PASSWORD_RULE, STRONG_PASSWORD } from '../../content/places'
import { colours as CAR_COLOURS } from '../../content/egypt'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { TRIMS } from '../../vehicle/trimContext'

export function Profile() {
  const { language } = useLanguage()
  const tx = useShortText()
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="panel-stack">
      <div className="panel-profile-head">
        <Avatar name={user.name} size="lg" />
        <div>
          <h2>{user.name}</h2>
          <p>
            {user.email}
            {user.createdAt ? ` · ${tx('Member since', 'عضو منذ')} ${formatDate(user.createdAt, language)}` : ''}
          </p>
        </div>
        {user.role === 'admin' && (
          <span className="badge ok">
            <ShieldCheck size={13} aria-hidden="true" /> {tx('Admin', 'مشرف')}
          </span>
        )}
      </div>

      <Card
        title={tx('Your details', 'بياناتك')}
        description={tx(
          'Tell us how to reach you and which V27 you drive. Your trim decides which equipment the guides show as standard for you.',
          'أخبرنا كيف نتواصل معك وأي فئة من V27 تقودها. الفئة تحدد التجهيزات التي تظهر لك كقياسية في الأدلة.',
        )}
      >
        <ProfileForm />
      </Card>
    </div>
  )
}

function ProfileForm() {
  const { t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const { user, refresh } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [country, setCountry] = useState(user?.country ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [trim, setTrim] = useState(user?.trim ?? '')
  const [colour, setColour] = useState(user?.colour ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const inEgypt = country === EGYPT

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      await api.updateProfile({
        name,
        phone: phone || undefined,
        country: country || undefined,
        city: city || undefined,
        trim: trim === 'play' || trim === 'wild' ? trim : undefined,
        colour: colour || undefined,
      })
      await refresh()
      toast(tx('Profile saved.', 'تم حفظ الملف الشخصي.'))
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form wide panel-form" onSubmit={onSubmit}>
      <div className="panel-form-grid">
        <label>
          <span>{tx('Name', 'الاسم')}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
        </label>

        <label>
          <span>{tx('Email', 'البريد الإلكتروني')}</span>
          <input value={user?.email ?? ''} disabled dir="ltr" />
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
          <small>{tx('Optional. Only admins can see it, and it is never shown on the site.', 'اختياري. المشرفون فقط يرونه ولا يظهر على الموقع إطلاقا.')}</small>
        </label>

        <label>
          <span>
            <MapPin size={15} aria-hidden="true" /> {tx('Country', 'الدولة')}
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
            <Car size={15} aria-hidden="true" /> {tx('Which V27 do you own?', 'أي V27 تملك؟')}
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
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="panel-form-actions">
        <button className="panel-button primary" type="submit" disabled={busy}>
          <Save size={16} aria-hidden="true" />
          {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save details', 'احفظ البيانات')}
        </button>
      </div>
    </form>
  )
}

export function Security() {
  const tx = useShortText()
  const { signOut } = useAuth()

  return (
    <div className="panel-grid wide-left">
      <Card title={tx('Change password', 'تغيير كلمة المرور')}>
        <PasswordForm />
      </Card>

      <Card title={tx('Signing in', 'تسجيل الدخول')}>
        <p className="panel-muted">
          {tx(
            'If you ticked “Remember me” when signing in, this browser stays signed in after it is closed. Otherwise you are signed out when the browser closes.',
            'إذا اخترت "تذكرني" عند الدخول، يبقى هذا المتصفح مسجلا بعد إغلاقه. وإلا يتم تسجيل خروجك عند إغلاق المتصفح.',
          )}
        </p>
        <p className="panel-muted">
          {tx(
            'On a shared or borrowed device, sign out when you are done.',
            'على جهاز مشترك أو مستعار، سجل الخروج عند الانتهاء.',
          )}
        </p>
        <button
          type="button"
          className="panel-button danger-soft"
          onClick={() => {
            signOut()
            window.location.hash = '#/'
          }}
        >
          <LogOut size={16} aria-hidden="true" className="flip-rtl" /> {tx('Sign out of this browser', 'سجل الخروج من هذا المتصفح')}
        </button>
      </Card>
    </div>
  )
}

function PasswordForm() {
  const { t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

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
      toast(tx('Password changed.', 'تم تغيير كلمة المرور.'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not change it.', 'تعذر التغيير.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form panel-form" onSubmit={onSubmit}>
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

      <div className="panel-form-actions">
        <button className="panel-button primary" type="submit" disabled={busy}>
          <KeyRound size={16} aria-hidden="true" />
          {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Change password', 'غيّر كلمة المرور')}
        </button>
      </div>
    </form>
  )
}
