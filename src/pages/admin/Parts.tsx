import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BadgeCheck, Package, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState, FilterSelect, PageHeader } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import type { Trim } from '../../content/types'
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_TONE,
  CATEGORIES,
  CATEGORY_LABELS,
  SOURCE_LABELS,
  SUBCATEGORY_SUGGESTIONS,
  egp,
  partName,
  priceOrAsk,
} from '../../features/parts/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { useAuth } from '../../auth/authContext'
import {
  api,
  type ApiPart,
  type ImportCurrency,
  type PartAvailability,
  type PartCategory,
  type PartImage,
  type PartInput,
  type PartSource,
} from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { PhotoEditor } from './PhotoEditor'
import { Req, RequiredLegend } from '../../components/RequiredMark'

/** `null` while closed; `'new'` for the add form, or the part being edited. */
type Editing = null | 'new' | ApiPart

const MAX_SUPPLIERS = 5

export function Parts() {
  const { language, t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [parts, setParts] = useState<ApiPart[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [category, setCategory] = useState<PartCategory | 'all'>('all')
  const [source, setSource] = useState<PartSource | 'all'>('all')

  const { can } = useAuth()
  // Staff see every part; a contributor only the ones they added. The server enforces the same split.
  const staff = can('parts.manage')

  const load = useCallback(() => {
    api
      .listParts(staff ? { all: true } : { mine: true })
      .then(({ parts: list }) => {
        setParts(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx, staff])

  useEffect(load, [load])

  const shown = useMemo(
    () =>
      parts?.filter(
        (part) => (category === 'all' || part.category === category) && (source === 'all' || part.source === source),
      ) ?? null,
    [parts, category, source],
  )

  async function remove(part: ApiPart) {
    const name = partName(part, language)
    const ok = await confirm({
      title: tx(`Remove ${name}?`, `إزالة ${name}؟`),
      message: tx(
        'It disappears from the catalog. Its photos and reviews are kept, so it can be restored.',
        'سيختفي من الدليل. تبقى صوره ومراجعاته، لذلك يمكن استعادته.',
      ),
      confirmLabel: tx('Remove', 'إزالة'),
      tone: 'danger',
    })
    if (!ok) return

    try {
      await api.removePart(part.id)
      toast(tx('Accessory removed.', 'تمت إزالة الإكسسوار.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذر الحذف.')), 'error')
    }
  }

  async function restore(part: ApiPart) {
    try {
      await api.updatePart(part.id, { active: true })
      toast(tx('Accessory restored.', 'تمت استعادة الإكسسوار.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not restore.', 'تعذرت الاستعادة.')), 'error')
    }
  }

  const addButton = (
    <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
      <Plus size={16} aria-hidden="true" /> {tx('Add accessory', 'أضف إكسسوارا')}
    </button>
  )

  return (
    <>
      {!staff && (
        <PageHeader
          description={tx(
            'The accessories you added. You can add new ones and edit these; accessories other people added are not yours to change.',
            'الإكسسوارات التي أضفتها. يمكنك إضافة إكسسوارات جديدة وتعديل هذه؛ أما ما أضافه غيرك فلا يمكنك تعديله.',
          )}
        />
      )}
      <DataTable
        rows={shown}
        rowKey={(part) => part.id}
        error={error}
        searchText={(part) =>
          `${part.name.en} ${part.name.ar} ${part.subcategory ?? ''} ${part.suppliers.map((s) => s.name).join(' ')}`
        }
        searchPlaceholder={tx('Search name, type or supplier…', 'ابحث بالاسم أو النوع أو المورد…')}
        filters={
          <>
            <FilterSelect<PartCategory | 'all'>
              label={tx('Category', 'الفئة')}
              value={category}
              onChange={setCategory}
              options={[
                { value: 'all', label: tx('All categories', 'كل الفئات') },
                ...CATEGORIES.map((key) => ({ value: key, label: t(CATEGORY_LABELS[key]) })),
              ]}
            />
            <FilterSelect<PartSource | 'all'>
              label={tx('Source', 'المصدر')}
              value={source}
              onChange={setSource}
              options={[
                { value: 'all', label: tx('Local and import', 'محلي واستيراد') },
                { value: 'local', label: t(SOURCE_LABELS.local) },
                { value: 'china', label: t(SOURCE_LABELS.china) },
              ]}
            />
          </>
        }
        actions={addButton}
        onRowClick={(part) => setEditing(part)}
        empty={
          <EmptyState
            icon={Package}
            title={tx('No accessories yet', 'لا توجد إكسسوارات بعد')}
            text={tx(
              'Add the first accessory or protection part and it will appear in the public catalog.',
              'أضف أول إكسسوار أو قطعة حماية وستظهر في الدليل العام.',
            )}
            action={addButton}
          />
        }
        columns={[
          {
            key: 'name',
            header: tx('Accessory', 'الإكسسوار'),
            width: 'minmax(0, 2.4fr)',
            render: (part) => (
              <span className="part-row-main">
                {part.images[0] ? (
                  <img src={part.images[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="part-row-thumb" aria-hidden="true">
                    <Package size={16} />
                  </span>
                )}
                <span className="panel-cell-main">
                  <strong>{partName(part, language)}</strong>
                  <small>
                    {t(CATEGORY_LABELS[part.category])}
                    {part.subcategory ? ` · ${part.subcategory}` : ''}
                  </small>
                </span>
              </span>
            ),
          },
          {
            key: 'source',
            header: tx('Source', 'المصدر'),
            width: '140px',
            render: (part) => (
              <span className={`badge part-source ${part.source}`}>{t(SOURCE_LABELS[part.source])}</span>
            ),
          },
          {
            key: 'price',
            header: tx('Total cost', 'التكلفة الكلية'),
            width: '130px',
            render: (part) => <span dir="ltr">{priceOrAsk(part.landedEgp, tx)}</span>,
          },
          {
            key: 'availability',
            header: tx('Availability', 'التوفر'),
            width: '130px',
            render: (part) =>
              part.active ? (
                <span className={`badge ${AVAILABILITY_TONE[part.availability]}`}>
                  {t(AVAILABILITY_LABELS[part.availability])}
                </span>
              ) : (
                <span className="badge no">{tx('Removed', 'محذوف')}</span>
              ),
          },
          {
            key: 'checked',
            header: tx('Price checked', 'آخر تحقق من السعر'),
            width: '130px',
            render: (part) => <span className="panel-muted">{formatDate(part.priceCheckedAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (part) => (
              <span className="panel-row-actions">
                <button
                  type="button"
                  className="panel-icon-button"
                  onClick={() => setEditing(part)}
                  aria-label={tx('Edit', 'تعديل')}
                  title={tx('Edit', 'تعديل')}
                >
                  <Pencil size={15} />
                </button>
                {staff &&
                  (part.active ? (
                    <button
                      type="button"
                      className="panel-icon-button danger"
                      onClick={() => remove(part)}
                      aria-label={tx('Remove', 'حذف')}
                      title={tx('Remove', 'حذف')}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="panel-icon-button success"
                      onClick={() => restore(part)}
                      aria-label={tx('Restore', 'استعادة')}
                      title={tx('Restore', 'استعادة')}
                    >
                      <RotateCcw size={15} />
                    </button>
                  ))}
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <PartForm
          key={editing === 'new' ? 'new' : editing.id}
          part={editing === 'new' ? null : editing}
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

type SupplierDraft = { name: string; kind: 'shop' | 'online'; city: string; phone: string; whatsapp: string; url: string }

/** Numbers are held as the text typed, so a half-typed "1." is not rewritten under the cursor. */
type Draft = {
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  category: PartCategory
  subcategory: string
  source: PartSource
  trims: Trim[]
  amountEgp: string
  installEgp: string
  originalAmount: string
  originalCurrency: ImportCurrency
  shippingEgp: string
  customsEgp: string
  availability: PartAvailability
  leadMin: string
  leadMax: string
  suppliers: SupplierDraft[]
  material: string
  color: string
  dimensions: string
  weightKg: string
  warrantyMonths: string
  importNotesEn: string
  importNotesAr: string
  images: PartImage[]
}

const text = (value: number | undefined) => (value === undefined || value === null ? '' : String(value))
const number = (value: string) => (value.trim() === '' ? undefined : Number(value))

function toDraft(part: ApiPart | null): Draft {
  return {
    nameEn: part?.name.en ?? '',
    nameAr: part?.name.ar ?? '',
    descriptionEn: part?.description.en ?? '',
    descriptionAr: part?.description.ar ?? '',
    category: part?.category ?? 'protection',
    subcategory: part?.subcategory ?? '',
    source: part?.source ?? 'local',
    trims: part?.specs.fitsTrims ?? [],
    amountEgp: text(part?.price.amountEgp),
    installEgp: text(part?.price.installEgp),
    originalAmount: text(part?.price.originalAmount),
    originalCurrency: part?.price.originalCurrency ?? 'CNY',
    shippingEgp: text(part?.price.shippingEgp),
    customsEgp: text(part?.price.customsEgp),
    availability: part?.availability ?? 'in_stock',
    leadMin: text(part?.leadTimeDays?.min),
    leadMax: text(part?.leadTimeDays?.max),
    suppliers: (part?.suppliers ?? []).map((supplier) => ({
      name: supplier.name,
      kind: supplier.kind,
      city: supplier.city ?? '',
      phone: supplier.phone ?? '',
      whatsapp: supplier.whatsapp ?? '',
      url: supplier.url ?? '',
    })),
    material: part?.specs.material ?? '',
    color: part?.specs.color ?? '',
    dimensions: part?.specs.dimensions ?? '',
    weightKg: text(part?.specs.weightKg),
    warrantyMonths: text(part?.specs.warrantyMonths),
    importNotesEn: part?.specs.importNotes?.en ?? '',
    importNotesAr: part?.specs.importNotes?.ar ?? '',
    images: part?.images ?? [],
  }
}

function toInput(draft: Draft): PartInput {
  const isImport = draft.source === 'china'
  const blank = (value: string) => value.trim() || undefined
  const leadMin = number(draft.leadMin)
  const leadMax = number(draft.leadMax)

  return {
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    description: { en: draft.descriptionEn.trim(), ar: draft.descriptionAr.trim() },
    category: draft.category,
    subcategory: blank(draft.subcategory),
    source: draft.source,
    price: {
      amountEgp: Number(draft.amountEgp),
      installEgp: number(draft.installEgp),
      ...(isImport
        ? {
            originalAmount: number(draft.originalAmount),
            originalCurrency: draft.originalAmount.trim() ? draft.originalCurrency : undefined,
            shippingEgp: number(draft.shippingEgp),
            customsEgp: number(draft.customsEgp),
          }
        : {}),
    },
    availability: draft.availability,
    // One end filled in means a fixed lead time.
    leadTimeDays:
      leadMin === undefined && leadMax === undefined
        ? undefined
        : { min: leadMin ?? leadMax ?? 0, max: leadMax ?? leadMin ?? 0 },
    suppliers: draft.suppliers
      .filter((supplier) => supplier.name.trim())
      .map((supplier) => ({
        name: supplier.name.trim(),
        kind: supplier.kind,
        city: blank(supplier.city),
        phone: blank(supplier.phone),
        whatsapp: blank(supplier.whatsapp),
        url: blank(supplier.url),
      })),
    specs: {
      material: blank(draft.material),
      color: blank(draft.color),
      dimensions: blank(draft.dimensions),
      weightKg: number(draft.weightKg),
      warrantyMonths: number(draft.warrantyMonths),
      fitsTrims: draft.trims,
      importNotes:
        isImport && (draft.importNotesEn.trim() || draft.importNotesAr.trim())
          ? { en: draft.importNotesEn.trim(), ar: draft.importNotesAr.trim() }
          : undefined,
    },
    images: draft.images,
  }
}

/** The figure buyers actually compare: item, shipping, customs and fitting. */
function draftTotal(draft: Draft): number | null {
  const amount = Number(draft.amountEgp)
  if (!draft.amountEgp.trim() || !Number.isFinite(amount)) return null
  const extra = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0)
  const importCosts = draft.source === 'china' ? extra(draft.shippingEgp) + extra(draft.customsEgp) : 0
  return amount + importCosts + extra(draft.installEgp)
}

function PartForm({ part, onClose, onSaved }: { part: ApiPart | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => toDraft(part))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const isImport = draft.source === 'china'
  const total = draftTotal(draft)

  function setSupplier(index: number, patch: Partial<SupplierDraft>) {
    setDraft((current) => ({
      ...current,
      suppliers: current.suppliers.map((supplier, at) => (at === index ? { ...supplier, ...patch } : supplier)),
    }))
  }

  async function markPriceChecked() {
    if (!part) return
    setBusy(true)
    try {
      await api.updatePart(part.id, { priceChecked: true })
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
      setError(tx('Give the accessory a name in English, Arabic or both.', 'أضف اسما للإكسسوار بالإنجليزية أو العربية أو كلتيهما.'))
      return
    }

    setBusy(true)
    try {
      const input = toInput(draft)
      if (part) await api.updatePart(part.id, input)
      else await api.createPart(input)
      toast(part ? tx('Accessory updated.', 'تم تحديث الإكسسوار.') : tx('Accessory added.', 'تمت إضافة الإكسسوار.'))
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
      title={part ? tx('Edit accessory', 'تعديل الإكسسوار') : tx('Add accessory', 'أضف إكسسوارا')}
      subtitle={part ? part.name.en || part.name.ar : undefined}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions spread">
          {part ? (
            <button type="button" className="panel-button ghost" disabled={working} onClick={markPriceChecked}>
              <BadgeCheck size={15} aria-hidden="true" /> {tx('Price still correct', 'السعر ما زال صحيحا')}
            </button>
          ) : (
            <span />
          )}
          <span className="panel-drawer-actions">
            <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
              {tx('Cancel', 'إلغاء')}
            </button>
            <button type="submit" form="part-form" className="panel-button primary" disabled={working}>
              {uploading > 0
                ? tx('Uploading photos…', 'جارٍ رفع الصور…')
                : busy
                  ? tx('Saving…', 'جارٍ الحفظ…')
                  : part
                    ? tx('Save changes', 'احفظ التغييرات')
                    : tx('Add accessory', 'أضف إكسسوارا')}
            </button>
          </span>
        </div>
      }
    >
      <form id="part-form" className="auth-form wide panel-form part-form" onSubmit={onSubmit}>
        <RequiredLegend bilingual />
        <section className="part-form-section">
          <h3>{tx('Basics', 'الأساسيات')}</h3>
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
            <label>
              <span>{tx('Category', 'الفئة')}</span>
              <select value={draft.category} onChange={(e) => set('category', e.target.value as PartCategory)}>
                {CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {t(CATEGORY_LABELS[key])}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{tx('Type', 'النوع')}</span>
              <input
                value={draft.subcategory}
                onChange={(e) => set('subcategory', e.target.value)}
                maxLength={80}
                list="part-subcategories"
                placeholder={tx('e.g. PPF, Skid plate', 'مثل: PPF، واقي أسفل المحرك')}
              />
              <datalist id="part-subcategories">
                {SUBCATEGORY_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
          </div>
          <label>
            <span>{tx('Description (English)', 'الوصف (بالإنجليزية)')}</span>
            <textarea value={draft.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} maxLength={5000} rows={3} dir="ltr" />
          </label>
          <label>
            <span>{tx('Description (Arabic)', 'الوصف (بالعربية)')}</span>
            <textarea value={draft.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} maxLength={5000} rows={3} dir="rtl" lang="ar" />
          </label>
          <div className="panel-form-grid">
            <div className="auth-choice">
              <span>{tx('Where it comes from', 'المصدر')}</span>
              <div className="segmented">
                {(['local', 'china'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={draft.source === value ? 'selected' : undefined}
                    aria-pressed={draft.source === value}
                    onClick={() => set('source', value)}
                  >
                    {t(SOURCE_LABELS[value])}
                  </button>
                ))}
              </div>
            </div>
            <div className="auth-choice">
              <span>{tx('Fits', 'يناسب')}</span>
              <div className="part-trims">
                {(['play', 'wild'] as const).map((trim) => (
                  <label key={trim} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.trims.includes(trim)}
                      onChange={(e) =>
                        set('trims', e.target.checked ? [...draft.trims, trim] : draft.trims.filter((item) => item !== trim))
                      }
                    />
                    <span>{trim === 'play' ? 'Play' : 'Wild'}</span>
                  </label>
                ))}
              </div>
              <small className="panel-muted">{tx('Leave both unticked if it fits either trim.', 'اتركهما بدون تحديد إذا كان يناسب الفئتين.')}</small>
            </div>
          </div>
        </section>

        <section className="part-form-section">
          <h3>{tx('Price', 'السعر')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{isImport ? tx('Item price in EGP', 'سعر القطعة بالجنيه') : tx('Price (EGP)', 'السعر (جنيه)')}</span>
              <input type="number" inputMode="decimal" min={1} step="any" value={draft.amountEgp} onChange={(e) => set('amountEgp', e.target.value)} dir="ltr" />
              <small>
                {isImport ? tx('The seller price converted to pounds. ', 'سعر البائع محولا إلى الجنيه. ') : ''}
                {tx('Leave empty to show "Price on request".', 'اتركه فارغا ليظهر "السعر عند الطلب".')}
              </small>
            </label>
            <label>
              <span>{tx('Installation (EGP)', 'التركيب (جنيه)')}</span>
              <input type="number" inputMode="decimal" min={0} step="any" value={draft.installEgp} onChange={(e) => set('installEgp', e.target.value)} dir="ltr" />
              <small>{tx('Leave empty if it is fitted for free or DIY.', 'اتركه فارغا إذا كان التركيب مجانيا أو ذاتيا.')}</small>
            </label>
            {isImport && (
              <>
                <label>
                  <span>{tx('Seller price', 'سعر البائع')}</span>
                  <span className="part-money">
                    <input type="number" inputMode="decimal" min={0} step="any" value={draft.originalAmount} onChange={(e) => set('originalAmount', e.target.value)} dir="ltr" />
                    <select
                      value={draft.originalCurrency}
                      onChange={(e) => set('originalCurrency', e.target.value as ImportCurrency)}
                      aria-label={tx('Currency', 'العملة')}
                    >
                      <option value="CNY">CNY ¥</option>
                      <option value="USD">USD $</option>
                    </select>
                  </span>
                </label>
                <label>
                  <span>{tx('Shipping to Egypt (EGP)', 'الشحن إلى مصر (جنيه)')}</span>
                  <input type="number" inputMode="decimal" min={0} step="any" value={draft.shippingEgp} onChange={(e) => set('shippingEgp', e.target.value)} dir="ltr" />
                </label>
                <label>
                  <span>{tx('Customs and fees (EGP)', 'الجمارك والرسوم (جنيه)')}</span>
                  <input type="number" inputMode="decimal" min={0} step="any" value={draft.customsEgp} onChange={(e) => set('customsEgp', e.target.value)} dir="ltr" />
                </label>
              </>
            )}
          </div>
          <p className="part-total">
            <span>{tx('Total on the car', 'التكلفة الكلية على السيارة')}</span>
            <strong dir="ltr">{total === null ? '—' : egp.format(total)}</strong>
          </p>
        </section>

        <section className="part-form-section">
          <h3>{tx('Availability', 'التوفر')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Status', 'الحالة')}</span>
              <select value={draft.availability} onChange={(e) => set('availability', e.target.value as PartAvailability)}>
                {(Object.keys(AVAILABILITY_LABELS) as PartAvailability[]).map((key) => (
                  <option key={key} value={key}>
                    {t(AVAILABILITY_LABELS[key])}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{tx('Lead time, shortest (days)', 'مدة التوريد، الأقصر (أيام)')}</span>
              <input type="number" min={0} max={365} value={draft.leadMin} onChange={(e) => set('leadMin', e.target.value)} dir="ltr" />
            </label>
            <label>
              <span>{tx('Lead time, longest (days)', 'مدة التوريد، الأطول (أيام)')}</span>
              <input type="number" min={0} max={365} value={draft.leadMax} onChange={(e) => set('leadMax', e.target.value)} dir="ltr" />
            </label>
          </div>
        </section>

        <section className="part-form-section">
          <h3>{tx('Where to buy', 'أين تشتري')}</h3>
          {draft.suppliers.length === 0 && (
            <p className="panel-muted">{tx('No suppliers yet.', 'لا يوجد موردون بعد.')}</p>
          )}
          {draft.suppliers.map((supplier, index) => (
            <div className="part-supplier" key={index}>
              <div className="panel-form-grid">
                <label>
                  <span>
                    {tx('Supplier name', 'اسم المورد')}
                    <Req />
                  </span>
                  <input value={supplier.name} onChange={(e) => setSupplier(index, { name: e.target.value })} required minLength={2} maxLength={160} />
                </label>
                <label>
                  <span>{tx('Type', 'النوع')}</span>
                  <select value={supplier.kind} onChange={(e) => setSupplier(index, { kind: e.target.value as 'shop' | 'online' })}>
                    <option value="shop">{tx('Shop', 'محل')}</option>
                    <option value="online">{tx('Online store', 'متجر إلكتروني')}</option>
                  </select>
                </label>
                <label>
                  <span>{tx('City', 'المدينة')}</span>
                  <input value={supplier.city} onChange={(e) => setSupplier(index, { city: e.target.value })} maxLength={120} />
                </label>
                <label>
                  <span>{tx('Phone', 'الهاتف')}</span>
                  <input value={supplier.phone} onChange={(e) => setSupplier(index, { phone: e.target.value })} maxLength={32} dir="ltr" inputMode="tel" />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input value={supplier.whatsapp} onChange={(e) => setSupplier(index, { whatsapp: e.target.value })} maxLength={32} dir="ltr" inputMode="tel" />
                </label>
                <label>
                  <span>{tx('Link', 'الرابط')}</span>
                  <input
                    type="url"
                    value={supplier.url}
                    onChange={(e) => setSupplier(index, { url: e.target.value })}
                    maxLength={1000}
                    dir="ltr"
                    placeholder={isImport ? 'https://aliexpress.com/…' : 'https://'}
                  />
                </label>
              </div>
              <button
                type="button"
                className="panel-button ghost small"
                onClick={() => set('suppliers', draft.suppliers.filter((_, at) => at !== index))}
              >
                <X size={14} aria-hidden="true" /> {tx('Remove supplier', 'احذف المورد')}
              </button>
            </div>
          ))}
          {draft.suppliers.length < MAX_SUPPLIERS && (
            <button
              type="button"
              className="panel-button small"
              onClick={() =>
                set('suppliers', [
                  ...draft.suppliers,
                  { name: '', kind: isImport ? 'online' : 'shop', city: '', phone: '', whatsapp: '', url: '' },
                ])
              }
            >
              <Plus size={14} aria-hidden="true" /> {tx('Add supplier', 'أضف موردا')}
            </button>
          )}
        </section>

        <section className="part-form-section">
          <h3>{tx('Specifications', 'المواصفات')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Material', 'الخامة')}</span>
              <input value={draft.material} onChange={(e) => set('material', e.target.value)} maxLength={160} />
            </label>
            <label>
              <span>{tx('Colour / finish', 'اللون / التشطيب')}</span>
              <input value={draft.color} onChange={(e) => set('color', e.target.value)} maxLength={120} />
            </label>
            <label>
              <span>{tx('Dimensions', 'الأبعاد')}</span>
              <input value={draft.dimensions} onChange={(e) => set('dimensions', e.target.value)} maxLength={160} />
            </label>
            <label>
              <span>{tx('Weight (kg)', 'الوزن (كجم)')}</span>
              <input type="number" min={0} max={2000} step="any" value={draft.weightKg} onChange={(e) => set('weightKg', e.target.value)} dir="ltr" />
            </label>
            <label>
              <span>{tx('Warranty (months)', 'الضمان (شهور)')}</span>
              <input type="number" min={0} max={240} value={draft.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} dir="ltr" />
            </label>
          </div>
          {isImport && (
            <>
              <label>
                <span>{tx('Import notes (English)', 'ملاحظات الاستيراد (بالإنجليزية)')}</span>
                <textarea
                  value={draft.importNotesEn}
                  onChange={(e) => set('importNotesEn', e.target.value)}
                  maxLength={2000}
                  rows={2}
                  dir="ltr"
                  placeholder={tx('Customs, shipping route, what to check on arrival…', 'الجمارك، طريقة الشحن، ما يجب فحصه عند الوصول…')}
                />
              </label>
              <label>
                <span>{tx('Import notes (Arabic)', 'ملاحظات الاستيراد (بالعربية)')}</span>
                <textarea value={draft.importNotesAr} onChange={(e) => set('importNotesAr', e.target.value)} maxLength={2000} rows={2} dir="rtl" lang="ar" />
              </label>
            </>
          )}
        </section>

        <PhotoEditor
          folder="parts"
          images={draft.images}
          onChange={(update) => setDraft((current) => ({ ...current, images: update(current.images) }))}
          onUploadingChange={setUploading}
        />

        {error && <p className="form-error">{error}</p>}
      </form>
    </Drawer>
  )
}
