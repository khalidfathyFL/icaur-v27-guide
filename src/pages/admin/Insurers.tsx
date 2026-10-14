import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { BadgeCheck, ChevronDown, Copy, Pencil, Plus, RotateCcw, ShieldHalf, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { Req, RequiredLegend } from '../../components/RequiredMark'
import { COVERS, COVER_LABELS, insurerName, pct } from '../../features/insurance/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiInsurer, type InsuranceCover, type InsurancePlan, type InsurerInput, type PartImage } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { PhotoEditor } from './PhotoEditor'

/** `null` while closed; `'new'` for the add form, or the insurer being edited. */
type Editing = null | 'new' | ApiInsurer

const MAX_PLANS = 15

export function Insurers() {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [insurers, setInsurers] = useState<ApiInsurer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const load = useCallback(() => {
    api
      .listInsurers({ all: true })
      .then(({ insurers: list }) => {
        setInsurers(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx])

  useEffect(load, [load])

  async function remove(insurer: ApiInsurer) {
    const name = insurerName(insurer, language)
    const ok = await confirm({
      title: tx(`Remove ${name}?`, `إزالة ${name}؟`),
      message: tx(
        'It disappears from the insurance page. Its plans, photos and reviews are kept, so it can be restored.',
        'ستختفي من صفحة التأمين. تبقى خططها وصورها ومراجعاتها، لذلك يمكن استعادتها.',
      ),
      confirmLabel: tx('Remove', 'إزالة'),
      tone: 'danger',
    })
    if (!ok) return

    try {
      await api.removeInsurer(insurer.id)
      toast(tx('Insurer removed.', 'تمت إزالة شركة التأمين.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذر الحذف.')), 'error')
    }
  }

  async function restore(insurer: ApiInsurer) {
    try {
      await api.updateInsurer(insurer.id, { active: true })
      toast(tx('Insurer restored.', 'تمت استعادة شركة التأمين.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not restore.', 'تعذرت الاستعادة.')), 'error')
    }
  }

  const addButton = (
    <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
      <Plus size={16} aria-hidden="true" /> {tx('Add insurer', 'أضف شركة تأمين')}
    </button>
  )

  return (
    <>
      <DataTable
        rows={insurers}
        rowKey={(insurer) => insurer.id}
        error={error}
        searchText={(insurer) => `${insurer.name.en} ${insurer.name.ar} ${insurer.plans.map((plan) => `${plan.name.en} ${plan.name.ar}`).join(' ')}`}
        searchPlaceholder={tx('Search insurer or plan…', 'ابحث عن شركة أو خطة…')}
        actions={addButton}
        onRowClick={(insurer) => setEditing(insurer)}
        empty={
          <EmptyState
            icon={ShieldHalf}
            title={tx('No insurers yet', 'لا توجد شركات تأمين بعد')}
            text={tx('Add the first insurance company with its plans.', 'أضف أول شركة تأمين بخططها.')}
            action={addButton}
          />
        }
        columns={[
          {
            key: 'name',
            header: tx('Insurer', 'شركة التأمين'),
            width: 'minmax(0, 2fr)',
            render: (insurer) => (
              <span className="part-row-main">
                {insurer.images[0] ? (
                  <img src={insurer.images[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="part-row-thumb" aria-hidden="true">
                    <ShieldHalf size={16} />
                  </span>
                )}
                <span className="panel-cell-main">
                  <strong>{insurerName(insurer, language)}</strong>
                  <small>{tx(`${insurer.plans.length} plan(s)`, `${insurer.plans.length} خطة`)}</small>
                </span>
              </span>
            ),
          },
          {
            key: 'rate',
            header: tx('From', 'يبدأ من'),
            width: '110px',
            render: (insurer) => <span dir="ltr">{insurer.lowestRatePct === null ? '—' : `${pct(insurer.lowestRatePct)} / yr`}</span>,
          },
          {
            key: 'cashback',
            header: tx('Cashback', 'استرداد نقدي'),
            width: '110px',
            render: (insurer) => <span dir="ltr">{insurer.bestCashbackPct === null ? '—' : pct(insurer.bestCashbackPct)}</span>,
          },
          {
            key: 'status',
            header: tx('Status', 'الحالة'),
            width: '110px',
            render: (insurer) =>
              insurer.active ? (
                <span className="badge ok">{tx('Listed', 'معروض')}</span>
              ) : (
                <span className="badge no">{tx('Removed', 'محذوف')}</span>
              ),
          },
          {
            key: 'checked',
            header: tx('Checked', 'آخر تحقق'),
            width: '130px',
            render: (insurer) => <span className="panel-muted">{formatDate(insurer.checkedAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (insurer) => (
              <span className="panel-row-actions">
                <button type="button" className="panel-icon-button" onClick={() => setEditing(insurer)} aria-label={tx('Edit', 'تعديل')} title={tx('Edit', 'تعديل')}>
                  <Pencil size={15} />
                </button>
                {insurer.active ? (
                  <button type="button" className="panel-icon-button danger" onClick={() => remove(insurer)} aria-label={tx('Remove', 'حذف')} title={tx('Remove', 'حذف')}>
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button type="button" className="panel-icon-button success" onClick={() => restore(insurer)} aria-label={tx('Restore', 'استعادة')} title={tx('Restore', 'استعادة')}>
                    <RotateCcw size={15} />
                  </button>
                )}
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <InsurerForm
          key={editing === 'new' ? 'new' : editing.id}
          insurer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}

/* ---------- the form ---------- */

/** Numbers are held as typed; bilingual text as two strings. */
type PlanDraft = {
  key: string
  id?: string
  nameEn: string
  nameAr: string
  ratePct: string
  minPremiumEgp: string
  covers: InsuranceCover[]
  agencyRepairYears: string
  cashbackPct: string
  cashbackConditionEn: string
  cashbackConditionAr: string
  noClaimsDiscountPct: string
  deductiblePct: string
  deductibleEgp: string
  maxCarAgeYears: string
  installmentsEn: string
  installmentsAr: string
  notesEn: string
  notesAr: string
}

type Draft = {
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  hotline: string
  phone: string
  whatsapp: string
  website: string
  email: string
  branches: string
  plans: PlanDraft[]
  images: PartImage[]
}

const text = (value: number | undefined) => (value === undefined || value === null ? '' : String(value))
const number = (value: string) => (value.trim() === '' ? undefined : Number(value))
const blank = (value: string) => value.trim() || undefined
const pair = (en: string, ar: string) => (en.trim() || ar.trim() ? { en: en.trim(), ar: ar.trim() } : undefined)
const localKey = () => `new-${Math.random().toString(36).slice(2, 9)}`

function toPlanDraft(plan: InsurancePlan | null): PlanDraft {
  return {
    key: plan?.id ?? localKey(),
    id: plan?.id,
    nameEn: plan?.name.en ?? '',
    nameAr: plan?.name.ar ?? '',
    ratePct: text(plan?.ratePct),
    minPremiumEgp: text(plan?.minPremiumEgp),
    covers: plan?.covers ?? [],
    agencyRepairYears: text(plan?.agencyRepairYears),
    cashbackPct: text(plan?.cashbackPct),
    cashbackConditionEn: plan?.cashbackCondition?.en ?? '',
    cashbackConditionAr: plan?.cashbackCondition?.ar ?? '',
    noClaimsDiscountPct: text(plan?.noClaimsDiscountPct),
    deductiblePct: text(plan?.deductiblePct),
    deductibleEgp: text(plan?.deductibleEgp),
    maxCarAgeYears: text(plan?.maxCarAgeYears),
    installmentsEn: plan?.installments?.en ?? '',
    installmentsAr: plan?.installments?.ar ?? '',
    notesEn: plan?.notes?.en ?? '',
    notesAr: plan?.notes?.ar ?? '',
  }
}

function toDraft(insurer: ApiInsurer | null): Draft {
  return {
    nameEn: insurer?.name.en ?? '',
    nameAr: insurer?.name.ar ?? '',
    descriptionEn: insurer?.description.en ?? '',
    descriptionAr: insurer?.description.ar ?? '',
    hotline: insurer?.hotline ?? '',
    phone: insurer?.phone ?? '',
    whatsapp: insurer?.whatsapp ?? '',
    website: insurer?.website ?? '',
    email: insurer?.email ?? '',
    branches: insurer?.branches ?? '',
    plans: (insurer?.plans ?? []).map(toPlanDraft),
    images: insurer?.images ?? [],
  }
}

function toPlan(draft: PlanDraft): InsurancePlan {
  return {
    id: draft.id,
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    ratePct: number(draft.ratePct),
    minPremiumEgp: number(draft.minPremiumEgp),
    covers: draft.covers,
    agencyRepairYears: number(draft.agencyRepairYears),
    cashbackPct: number(draft.cashbackPct),
    cashbackCondition: pair(draft.cashbackConditionEn, draft.cashbackConditionAr),
    noClaimsDiscountPct: number(draft.noClaimsDiscountPct),
    deductiblePct: number(draft.deductiblePct),
    deductibleEgp: number(draft.deductibleEgp),
    maxCarAgeYears: number(draft.maxCarAgeYears),
    installments: pair(draft.installmentsEn, draft.installmentsAr),
    notes: pair(draft.notesEn, draft.notesAr),
  }
}

function toInput(draft: Draft): InsurerInput {
  return {
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    description: { en: draft.descriptionEn.trim(), ar: draft.descriptionAr.trim() },
    hotline: blank(draft.hotline),
    phone: blank(draft.phone),
    whatsapp: blank(draft.whatsapp),
    website: blank(draft.website),
    email: blank(draft.email),
    branches: blank(draft.branches),
    plans: draft.plans.map(toPlan),
    images: draft.images,
  }
}

function InsurerForm({ insurer, onClose, onSaved }: { insurer: ApiInsurer | null; onClose: () => void; onSaved: () => void }) {
  const tx = useShortText()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => toDraft(insurer))
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  function setPlan(key: string, patch: Partial<PlanDraft>) {
    setDraft((current) => ({ ...current, plans: current.plans.map((plan) => (plan.key === key ? { ...plan, ...patch } : plan)) }))
  }

  function addPlan(from?: PlanDraft) {
    // A copy is a new plan: its own key and no server id.
    const plan = from ? { ...from, key: localKey(), id: undefined, nameEn: from.nameEn && `${from.nameEn} (copy)` } : toPlanDraft(null)
    setDraft((current) => ({ ...current, plans: [...current.plans, plan] }))
    setOpen((current) => new Set(current).add(plan.key))
  }

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function markChecked() {
    if (!insurer) return
    setBusy(true)
    try {
      await api.updateInsurer(insurer.id, { checked: true })
      toast(tx('Marked as checked today.', 'تم تسجيل التحقق اليوم.'))
      onSaved()
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')))
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!draft.nameEn.trim() && !draft.nameAr.trim()) {
      setError(tx('Give the insurer a name in English or Arabic.', 'أضف اسما لشركة التأمين بالإنجليزية أو العربية.'))
      return
    }
    const unnamed = draft.plans.findIndex((plan) => !plan.nameEn.trim() && !plan.nameAr.trim())
    if (unnamed !== -1) {
      setOpen((current) => new Set(current).add(draft.plans[unnamed].key))
      setError(tx(`Give plan ${unnamed + 1} a name in English or Arabic.`, `أضف اسما للخطة ${unnamed + 1} بالإنجليزية أو العربية.`))
      return
    }

    setBusy(true)
    try {
      const input = toInput(draft)
      if (insurer) await api.updateInsurer(insurer.id, input)
      else await api.createInsurer(input)
      toast(insurer ? tx('Insurer updated.', 'تم تحديث شركة التأمين.') : tx('Insurer added.', 'تمت إضافة شركة التأمين.'))
      onSaved()
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')))
    } finally {
      setBusy(false)
    }
  }

  const working = busy || uploading > 0

  return (
    <Drawer
      open
      size="lg"
      busy={busy}
      title={insurer ? tx('Edit insurer', 'تعديل شركة التأمين') : tx('Add insurer', 'أضف شركة تأمين')}
      subtitle={insurer ? insurer.name.en || insurer.name.ar : undefined}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions spread">
          {insurer ? (
            <button type="button" className="panel-button ghost" disabled={working} onClick={markChecked}>
              <BadgeCheck size={15} aria-hidden="true" /> {tx('Plans still correct', 'الخطط ما زالت صحيحة')}
            </button>
          ) : (
            <span />
          )}
          <span className="panel-drawer-actions">
            <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
              {tx('Cancel', 'إلغاء')}
            </button>
            <button type="submit" form="insurer-form" className="panel-button primary" disabled={working}>
              {uploading > 0
                ? tx('Uploading photos…', 'جارٍ رفع الصور…')
                : busy
                  ? tx('Saving…', 'جارٍ الحفظ…')
                  : insurer
                    ? tx('Save changes', 'احفظ التغييرات')
                    : tx('Add insurer', 'أضف شركة تأمين')}
            </button>
          </span>
        </div>
      }
    >
      <form id="insurer-form" className="auth-form wide panel-form part-form" onSubmit={onSubmit}>
        <RequiredLegend bilingual />

        <section className="part-form-section">
          <h3>{tx('The company', 'الشركة')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>
                {tx('Name (English)', 'الاسم (بالإنجليزية)')}
                <Req />
              </span>
              <input aria-required value={draft.nameEn} onChange={(e) => set('nameEn', e.target.value)} maxLength={160} dir="ltr" autoFocus />
            </label>
            <label>
              <span>
                {tx('Name (Arabic)', 'الاسم (بالعربية)')}
                <Req />
              </span>
              <input aria-required value={draft.nameAr} onChange={(e) => set('nameAr', e.target.value)} maxLength={160} dir="rtl" lang="ar" />
              <small>{tx('English, Arabic or both.', 'بالإنجليزية أو العربية أو كلتيهما.')}</small>
            </label>
          </div>
          <label>
            <span>{tx('About the company (English)', 'عن الشركة (بالإنجليزية)')}</span>
            <textarea value={draft.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} maxLength={5000} rows={2} dir="ltr" />
          </label>
          <label>
            <span>{tx('About the company (Arabic)', 'عن الشركة (بالعربية)')}</span>
            <textarea value={draft.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} maxLength={5000} rows={2} dir="rtl" lang="ar" />
          </label>
        </section>

        <section className="part-form-section">
          <h3>{tx('Contact', 'التواصل')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Hotline', 'الخط الساخن')}</span>
              <input value={draft.hotline} onChange={(e) => set('hotline', e.target.value)} maxLength={20} dir="ltr" inputMode="tel" placeholder="19xxx" />
            </label>
            <label>
              <span>{tx('Phone', 'الهاتف')}</span>
              <input value={draft.phone} onChange={(e) => set('phone', e.target.value)} maxLength={32} dir="ltr" inputMode="tel" />
            </label>
            <label>
              <span>WhatsApp</span>
              <input value={draft.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} maxLength={32} dir="ltr" inputMode="tel" />
            </label>
            <label>
              <span>{tx('Website', 'الموقع')}</span>
              <input type="url" value={draft.website} onChange={(e) => set('website', e.target.value)} maxLength={1000} dir="ltr" placeholder="https://" />
            </label>
            <label>
              <span>{tx('Email', 'البريد')}</span>
              <input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} maxLength={200} dir="ltr" />
            </label>
            <label>
              <span>{tx('Branches', 'الفروع')}</span>
              <input value={draft.branches} onChange={(e) => set('branches', e.target.value)} maxLength={300} placeholder={tx('e.g. Cairo, Giza, Alexandria', 'مثل: القاهرة، الجيزة، الإسكندرية')} />
            </label>
          </div>
        </section>

        <section className="part-form-section">
          <h3>
            {tx('Plans', 'الخطط')} <small className="panel-muted">{`${draft.plans.length}/${MAX_PLANS}`}</small>
          </h3>
          {draft.plans.length === 0 && (
            <p className="panel-muted">{tx('No plans yet. Add each policy the company sells, e.g. "Gold – all risks".', 'لا توجد خطط بعد. أضف كل وثيقة تبيعها الشركة، مثل "الذهبية – شامل".')}</p>
          )}
          {draft.plans.map((plan, index) => (
            <PlanEditor
              key={plan.key}
              plan={plan}
              index={index}
              open={open.has(plan.key)}
              onToggle={() => toggle(plan.key)}
              onChange={(patch) => setPlan(plan.key, patch)}
              onDuplicate={draft.plans.length < MAX_PLANS ? () => addPlan(plan) : undefined}
              onRemove={() => set('plans', draft.plans.filter((other) => other.key !== plan.key))}
            />
          ))}
          {draft.plans.length < MAX_PLANS && (
            <button type="button" className="panel-button small" onClick={() => addPlan()}>
              <Plus size={14} aria-hidden="true" /> {tx('Add plan', 'أضف خطة')}
            </button>
          )}
        </section>

        <PhotoEditor
          folder="insurers"
          images={draft.images}
          onChange={(update) => setDraft((current) => ({ ...current, images: update(current.images) }))}
          onUploadingChange={setUploading}
          max={4}
        />

        {error && <p className="form-error">{error}</p>}
      </form>
    </Drawer>
  )
}

function PlanEditor({
  plan,
  index,
  open,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
}: {
  plan: PlanDraft
  index: number
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<PlanDraft>) => void
  onDuplicate?: () => void
  onRemove: () => void
}) {
  const { t } = useLanguage()
  const tx = useShortText()
  const title = plan.nameEn || plan.nameAr || tx(`Plan ${index + 1}`, `الخطة ${index + 1}`)
  const rate = Number(plan.ratePct)
  const bodyId = `plan-${plan.key}`

  function toggleCover(cover: InsuranceCover) {
    onChange({ covers: plan.covers.includes(cover) ? plan.covers.filter((other) => other !== cover) : [...plan.covers, cover] })
  }

  const field = (label: string, key: keyof PlanDraft, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label>
      <span>{label}</span>
      <input value={plan[key] as string} onChange={(e) => onChange({ [key]: e.target.value })} {...props} />
    </label>
  )
  const numberProps = (max: number, step: number | 'any' = 'any'): InputHTMLAttributes<HTMLInputElement> => ({
    type: 'number',
    min: 0,
    max,
    step,
    dir: 'ltr',
    inputMode: 'decimal',
  })

  return (
    <div className={open ? 'center-package open' : 'center-package'}>
      <div className="center-package-head">
        <button type="button" className="center-package-toggle" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
          <ChevronDown size={16} aria-hidden="true" />
          <span className="panel-cell-main">
            <strong>{title}</strong>
            <small>
              {plan.ratePct.trim() && Number.isFinite(rate) ? tx(`${pct(rate)} a year`, `${pct(rate)} سنويا`) : tx('No rate yet', 'بلا نسبة بعد')}
              {plan.cashbackPct.trim() ? ` · ${tx('cashback', 'استرداد')} ${plan.cashbackPct}%` : ''}
            </small>
          </span>
        </button>
        <span className="panel-row-actions">
          {onDuplicate && (
            <button type="button" className="panel-icon-button" onClick={onDuplicate} aria-label={tx('Duplicate plan', 'كرر الخطة')} title={tx('Duplicate plan', 'كرر الخطة')}>
              <Copy size={14} />
            </button>
          )}
          <button type="button" className="panel-icon-button danger" onClick={onRemove} aria-label={tx('Remove plan', 'احذف الخطة')} title={tx('Remove plan', 'احذف الخطة')}>
            <X size={14} />
          </button>
        </span>
      </div>

      <div id={bodyId} className="center-package-body" hidden={!open}>
        <div className="panel-form-grid">
          <label>
            <span>
              {tx('Plan name (English)', 'اسم الخطة (بالإنجليزية)')}
              <Req />
            </span>
            <input aria-required value={plan.nameEn} onChange={(e) => onChange({ nameEn: e.target.value })} maxLength={120} dir="ltr" placeholder="Gold – all risks" />
          </label>
          <label>
            <span>
              {tx('Plan name (Arabic)', 'اسم الخطة (بالعربية)')}
              <Req />
            </span>
            <input aria-required value={plan.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} maxLength={120} dir="rtl" lang="ar" />
          </label>
        </div>

        <h4>{tx('Price', 'السعر')}</h4>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Yearly rate (% of car value)', 'النسبة السنوية (% من قيمة السيارة)')}</span>
            <input {...numberProps(20)} value={plan.ratePct} onChange={(e) => onChange({ ratePct: e.target.value })} placeholder="2.25" />
            <small>{tx('The page works out the yearly cost for Play and Wild from this.', 'تحسب الصفحة التكلفة السنوية لفئتي Play وWild من هذه النسبة.')}</small>
          </label>
          {field(tx('Minimum premium (EGP)', 'الحد الأدنى للقسط (جنيه)'), 'minPremiumEgp', numberProps(10_000_000))}
        </div>

        <h4>{tx('What it covers', 'ما تغطيه')}</h4>
        <div className="center-coverage" role="group" aria-label={tx('Covers', 'التغطيات')}>
          {COVERS.map((cover) => (
            <label key={cover} className={plan.covers.includes(cover) ? 'selected' : undefined}>
              <input type="checkbox" checked={plan.covers.includes(cover)} onChange={() => toggleCover(cover)} />
              <span>{t(COVER_LABELS[cover])}</span>
            </label>
          ))}
        </div>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Agency repair for the first … years', 'الإصلاح بالتوكيل لأول … سنوات')}</span>
            <input {...numberProps(15, 1)} value={plan.agencyRepairYears} onChange={(e) => onChange({ agencyRepairYears: e.target.value })} />
            <small>{tx('0 means repairs are never at the agency.', '0 يعني أن الإصلاح لا يتم بالتوكيل.')}</small>
          </label>
        </div>

        <h4>{tx('Cashback and discounts', 'الاسترداد النقدي والخصومات')}</h4>
        <div className="panel-form-grid">
          {field(tx('Cashback (% of premium)', 'الاسترداد النقدي (% من القسط)'), 'cashbackPct', numberProps(100))}
          {field(tx('No-claims discount on renewal (%)', 'خصم عدم المطالبة عند التجديد (%)'), 'noClaimsDiscountPct', numberProps(100))}
          {field(tx('When cashback is paid (English)', 'متى يُصرف الاسترداد (بالإنجليزية)'), 'cashbackConditionEn', { maxLength: 500, dir: 'ltr', placeholder: 'No claims during the year' })}
          {field(tx('When cashback is paid (Arabic)', 'متى يُصرف الاسترداد (بالعربية)'), 'cashbackConditionAr', { maxLength: 500, dir: 'rtl', lang: 'ar', placeholder: 'عدم وجود مطالبات خلال السنة' })}
        </div>

        <h4>{tx('Deductible and terms', 'نسبة التحمل والشروط')}</h4>
        <div className="panel-form-grid">
          {field(tx('Deductible (% of each claim)', 'نسبة التحمل (% من كل مطالبة)'), 'deductiblePct', numberProps(100))}
          {field(tx('Deductible (EGP per claim)', 'التحمل (جنيه لكل مطالبة)'), 'deductibleEgp', numberProps(10_000_000))}
          {field(tx('Oldest car accepted (years)', 'أقصى عمر للسيارة (سنوات)'), 'maxCarAgeYears', numberProps(40, 1))}
          {field(tx('Installments (English)', 'التقسيط (بالإنجليزية)'), 'installmentsEn', { maxLength: 500, dir: 'ltr', placeholder: '12 months, no interest' })}
          {field(tx('Installments (Arabic)', 'التقسيط (بالعربية)'), 'installmentsAr', { maxLength: 500, dir: 'rtl', lang: 'ar' })}
        </div>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Offers, exclusions and notes (English)', 'العروض والاستثناءات والملاحظات (بالإنجليزية)')}</span>
            <textarea value={plan.notesEn} onChange={(e) => onChange({ notesEn: e.target.value })} maxLength={3000} rows={3} dir="ltr" />
          </label>
          <label>
            <span>{tx('Offers, exclusions and notes (Arabic)', 'العروض والاستثناءات والملاحظات (بالعربية)')}</span>
            <textarea value={plan.notesAr} onChange={(e) => onChange({ notesAr: e.target.value })} maxLength={3000} rows={3} dir="rtl" lang="ar" />
          </label>
        </div>
      </div>
    </div>
  )
}
