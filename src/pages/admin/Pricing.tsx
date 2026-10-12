import { useCallback, useEffect, useState } from 'react'
import { BadgeDollarSign, Save } from 'lucide-react'
import { Card, PageHeader } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiPricing } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { TRIMS } from '../../vehicle/trimContext'
import type { Trim } from '../../content/types'

export function Pricing() {
  const tx = useShortText()
  const toast = useToast()
  const [pricing, setPricing] = useState<ApiPricing[] | null>(null)

  const load = useCallback(() => {
    api
      .listPricing()
      .then(({ pricing: list }) => setPricing(list))
      .catch((caught) => {
        setPricing([])
        toast(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.')), 'error')
      })
  }, [toast, tx])

  useEffect(load, [load])

  async function save(trim: Trim, priceEgp: number, note: string) {
    try {
      await api.savePricing({ trim, priceEgp, note: note || undefined })
      toast(tx('Price saved.', 'تم حفظ السعر.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    }
  }

  return (
    <>
      <PageHeader
        description={tx(
          'A price set here overrides the launch figure committed in the site content. Leave it empty to keep using the committed price.',
          'السعر المحدد هنا يحل محل سعر الإطلاق المحفوظ في محتوى الموقع. اتركه فارغا للاستمرار بالسعر المحفوظ.',
        )}
      />

      <div className="panel-grid two">
        {TRIMS.map((option) => {
          const current = pricing?.find((entry) => entry.trim === option.value)
          return (
            <PricingCard
              key={`${option.value}-${current?.updatedAt ?? 'unset'}`}
              trim={option.value}
              label={option.label}
              current={current}
              loading={pricing === null}
              onSave={save}
            />
          )
        })}
      </div>
    </>
  )
}

function PricingCard({
  trim,
  label,
  current,
  loading,
  onSave,
}: {
  trim: Trim
  label: string
  current?: ApiPricing
  loading: boolean
  onSave: (trim: Trim, priceEgp: number, note: string) => Promise<void>
}) {
  const { language } = useLanguage()
  const tx = useShortText()
  const [price, setPrice] = useState(String(current?.priceEgp ?? ''))
  const [note, setNote] = useState(current?.note ?? '')
  const [busy, setBusy] = useState(false)

  return (
    <Card
      title={
        <>
          <BadgeDollarSign size={18} aria-hidden="true" /> {label}
        </>
      }
      description={
        current
          ? tx(`Updated ${formatDate(current.updatedAt, language)}`, `آخر تحديث ${formatDate(current.updatedAt, language)}`)
          : tx('Using the price in the site content', 'يستخدم السعر الموجود في محتوى الموقع')
      }
    >
      <form
        className="auth-form wide panel-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          await onSave(trim, Number(price), note)
          setBusy(false)
        }}
      >
        <label>
          <span>{tx('List price (EGP)', 'السعر الرسمي (جنيه)')}</span>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            min={1}
            required
            disabled={loading}
            dir="ltr"
          />
        </label>
        <label>
          <span>{tx('Note', 'ملاحظة')}</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            disabled={loading}
            placeholder={tx('e.g. Price from 1 October', 'مثال: السعر من 1 أكتوبر')}
          />
        </label>
        <button type="submit" className="panel-button primary" disabled={busy || loading || !price}>
          <Save size={16} aria-hidden="true" /> {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save price', 'احفظ السعر')}
        </button>
      </form>
    </Card>
  )
}
