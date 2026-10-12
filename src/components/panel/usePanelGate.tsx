import type { ReactNode } from 'react'
import { useShortText } from '../../i18n/languageContext'
import { PanelGate } from './PanelGate'

/**
 * The checks every panel route runs first. Returns the gate to render, or
 * null when the person is signed in and the panel can render.
 */
export function usePanelGate({
  apiConfigured,
  loading,
  signedIn,
  returnTo,
}: {
  apiConfigured: boolean
  loading: boolean
  signedIn: boolean
  returnTo: string
}): ReactNode | null {
  const tx = useShortText()

  if (!apiConfigured) {
    return (
      <PanelGate
        title={tx('Not available in this build', 'غير متاح في هذه النسخة')}
        text={tx(
          'This copy of the site was built without an API address, so accounts are switched off. The guides, specs and comparison all still work.',
          'تم بناء هذه النسخة بدون عنوان API، لذلك الحسابات معطلة. الأدلة والمواصفات والمقارنة تعمل كالمعتاد.',
        )}
        actions={
          <a className="panel-button primary" href="#/guides">
            {tx('Back to guides', 'ارجع إلى الأدلة')}
          </a>
        }
      />
    )
  }

  if (loading) return <PanelGate loading title={tx('Loading…', 'جارٍ التحميل…')} />

  if (!signedIn) {
    return (
      <PanelGate
        title={tx('Sign in to continue', 'سجل الدخول للمتابعة')}
        text={tx(
          'Your panel keeps your posts, corrections and profile in one place.',
          'لوحتك تجمع مقالاتك وتصحيحاتك وملفك الشخصي في مكان واحد.',
        )}
        actions={
          <>
            <a className="panel-button primary" href={`#/signin?next=${encodeURIComponent(returnTo)}`}>
              {tx('Sign in', 'تسجيل الدخول')}
            </a>
            <a className="panel-button ghost" href="#/">
              {tx('Back to the site', 'العودة للموقع')}
            </a>
          </>
        }
      />
    )
  }

  return null
}
