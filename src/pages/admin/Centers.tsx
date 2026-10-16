import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BadgeCheck, ChevronDown, Copy, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState, FilterSelect, PageHeader } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import {
  BRAND_SUGGESTIONS,
  COVERAGE_AREAS,
  COVERAGE_LABELS,
  MATERIAL_SUGGESTIONS,
  SERVICES,
  SERVICE_LABELS,
  centerName,
} from '../../features/centers/labels'
import { egp } from '../../features/parts/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import {
  api,
  type ApiMerchant,
  type ApiCenter,
  type CenterInput,
  type CenterPackage,
  type CoverageArea,
  type PartImage,
  type ProtectionService,
} from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { PhotoEditor } from './PhotoEditor'
import { MerchantAccounts } from './MerchantAccounts'
import { useAuth } from '../../auth/authContext'
import { Req, RequiredLegend } from '../../components/RequiredMark'

/** A listing as the table has it: staff also get the merchant accounts behind it. */
type Row = ApiCenter & { merchants?: ApiMerchant[] }

/** `null` while closed; `'new'` for the add form, or the center being edited. */
type Editing = null | 'new' | Row

const MAX_PACKAGES = 20

export function Centers() {
  const { language, t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [centers, setCenters] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [service, setService] = useState<ProtectionService | 'all'>('all')

  const { can } = useAuth()
  // Staff see every listing; a merchant sees only the ones they run, and a
  // contributor the ones they added. The server enforces the same split.
  const staff = can('centers.manage')
  const contributor = can('centers.add')
  const canAdd = staff || contributor

  const load = useCallback(() => {
    api
      .listCenters(staff ? { all: true } : { mine: true })
      .then(({ centers: list }) => {
        setCenters(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx, staff])

  useEffect(load, [load])

  const shown = useMemo(
    () => centers?.filter((center) => service === 'all' || center.services.includes(service)) ?? null,
    [centers, service],
  )

  async function remove(center: ApiCenter) {
    const name = centerName(center, language)
    const ok = await confirm({
      title: tx(`Remove ${name}?`, `إزالة ${name}؟`),
      message: tx(
        'It disappears from the protection page. Its packages, photos and reviews are kept, so it can be restored.',
        'سيختفي من صفحة الحماية. تبقى باقاته وصوره ومراجعاته، لذلك يمكن استعادته.',
      ),
      confirmLabel: tx('Remove', 'إزالة'),
      tone: 'danger',
    })
    if (!ok) return

    try {
      await api.removeCenter(center.id)
      toast(tx('Center removed.', 'تمت إزالة المركز.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذر الحذف.')), 'error')
    }
  }

  async function restore(center: ApiCenter) {
    try {
      await api.updateCenter(center.id, { active: true })
      toast(tx('Center restored.', 'تمت استعادة المركز.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not restore.', 'تعذرت الاستعادة.')), 'error')
    }
  }

  const addButton = (
    <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
      <Plus size={16} aria-hidden="true" /> {tx('Add center', 'أضف مركزا')}
    </button>
  )

  return (
    <>
      {!staff && (
        <PageHeader
          description={
            contributor
              ? tx(
                  'The protection centers you added, and any you run. You can add new ones and edit these; ones other people added are not yours to change.',
                  'مراكز الحماية التي أضفتها والتي تديرها. يمكنك إضافة جديد وتعديل هذه؛ أما ما أضافه غيرك فلا يمكنك تعديله.',
                )
              : tx(
                  'The listings you run. Edit your details, photos and packages; changes go live on the site straight away and are recorded with your name.',
                  'الصفحات التي تديرها. عدّل بياناتك وصورك والباقات؛ تظهر التغييرات على الموقع فورا وتسجل باسمك.',
                )
          }
        />
      )}
      <DataTable
        rows={shown}
        rowKey={(center) => center.id}
        error={error}
        searchText={(center) =>
          `${center.name.en} ${center.name.ar} ${center.city} ${center.area ?? ''} ${center.packages.map((item) => `${item.name.en} ${item.brand ?? ''}`).join(' ')}`
        }
        searchPlaceholder={tx('Search name, city, package or brand…', 'ابحث بالاسم أو المدينة أو الباقة أو الماركة…')}
        filters={
          <FilterSelect<ProtectionService | 'all'>
            label={tx('Service', 'الخدمة')}
            value={service}
            onChange={setService}
            options={[
              { value: 'all', label: tx('All services', 'كل الخدمات') },
              ...SERVICES.map((key) => ({ value: key, label: t(SERVICE_LABELS[key]) })),
            ]}
          />
        }
        actions={canAdd ? addButton : undefined}
        onRowClick={(center) => setEditing(center)}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={tx('No protection centers yet', 'لا توجد مراكز حماية بعد')}
            text={tx(
              'Add the first center with its packages and it will appear on the protection page.',
              'أضف أول مركز بباقاته وسيظهر في صفحة الحماية.',
            )}
            action={canAdd ? addButton : undefined}
          />
        }
        columns={[
          {
            key: 'name',
            header: tx('Center', 'المركز'),
            width: 'minmax(0, 2.2fr)',
            render: (center) => (
              <span className="part-row-main">
                {center.images[0] ? (
                  <img src={center.images[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="part-row-thumb" aria-hidden="true">
                    <ShieldCheck size={16} />
                  </span>
                )}
                <span className="panel-cell-main">
                  <strong>{centerName(center, language)}</strong>
                  <small>
                    {center.city}
                    {center.area ? ` · ${center.area}` : ''}
                  </small>
                </span>
              </span>
            ),
          },
          {
            key: 'packages',
            header: tx('Packages', 'الباقات'),
            width: '110px',
            render: (center) => <span>{center.packages.length}</span>,
          },
          {
            key: 'from',
            header: tx('From', 'يبدأ من'),
            width: '130px',
            render: (center) => <span dir="ltr">{center.fromPriceEgp === null ? '—' : egp.format(center.fromPriceEgp)}</span>,
          },
          {
            key: 'status',
            header: tx('Status', 'الحالة'),
            width: '110px',
            render: (center) =>
              center.active ? (
                <span className="badge ok">{tx('Listed', 'معروض')}</span>
              ) : (
                <span className="badge no">{tx('Removed', 'محذوف')}</span>
              ),
          },
          ...(staff
            ? [
                {
                  key: 'merchants',
                  header: tx('Merchant', 'التاجر'),
                  width: '150px',
                  render: (center: Row) => (
                    <span className="panel-muted panel-clamp">
                      {center.merchants?.length ? center.merchants.map((merchant) => merchant.name).join(', ') : '—'}
                    </span>
                  ),
                },
              ]
            : []),
          {
            key: 'checked',
            header: tx('Checked', 'آخر تحقق'),
            width: '130px',
            render: (center) => <span className="panel-muted">{formatDate(center.checkedAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (center) => (
              <span className="panel-row-actions">
                <button
                  type="button"
                  className="panel-icon-button"
                  onClick={() => setEditing(center)}
                  aria-label={tx('Edit', 'تعديل')}
                  title={tx('Edit', 'تعديل')}
                >
                  <Pencil size={15} />
                </button>
                {staff &&
                  (center.active ? (
                  <button
                    type="button"
                    className="panel-icon-button danger"
                    onClick={() => remove(center)}
                    aria-label={tx('Remove', 'حذف')}
                    title={tx('Remove', 'حذف')}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="panel-icon-button success"
                    onClick={() => restore(center)}
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
        <CenterForm
          key={editing === 'new' ? 'new' : editing.id}
          center={editing === 'new' ? null : editing}
          merchants={staff && editing !== 'new' ? (editing.merchants ?? []) : undefined}
          onClose={() => {
            setEditing(null)
            // Merchant accounts save on their own, so the table may be out of date.
            if (staff) load()
          }}
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

/** Numbers are held as typed, so a half-typed "1." is not rewritten under the cursor. */
type PackageDraft = {
  /** Server id, or a local key for a package not saved yet. */
  key: string
  id?: string
  nameEn: string
  nameAr: string
  service: ProtectionService
  coverage: CoverageArea[]
  priceEgp: string
  wildPriceEgp: string
  durationMin: string
  durationMax: string
  brand: string
  product: string
  materialType: string
  thicknessMil: string
  selfHealing: '' | 'yes' | 'no'
  warrantyYears: string
  inclusions: string
  notesEn: string
  notesAr: string
}

type Draft = {
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  city: string
  area: string
  address: string
  mapUrl: string
  phone: string
  whatsapp: string
  website: string
  instagram: string
  hours: string
  packages: PackageDraft[]
  images: PartImage[]
}

const text = (value: number | undefined) => (value === undefined || value === null ? '' : String(value))
const number = (value: string) => (value.trim() === '' ? undefined : Number(value))
const blank = (value: string) => value.trim() || undefined
const localKey = () => `new-${Math.random().toString(36).slice(2, 9)}`

function toPackageDraft(item: CenterPackage | null): PackageDraft {
  return {
    key: item?.id ?? localKey(),
    id: item?.id,
    nameEn: item?.name.en ?? '',
    nameAr: item?.name.ar ?? '',
    service: item?.service ?? 'ppf',
    coverage: item?.coverage ?? [],
    priceEgp: text(item?.priceEgp),
    wildPriceEgp: text(item?.wildPriceEgp),
    durationMin: text(item?.durationDays?.min),
    durationMax: text(item?.durationDays?.max),
    brand: item?.brand ?? '',
    product: item?.product ?? '',
    materialType: item?.materialType ?? '',
    thicknessMil: text(item?.thicknessMil),
    selfHealing: item?.selfHealing === undefined ? '' : item.selfHealing ? 'yes' : 'no',
    warrantyYears: text(item?.warrantyYears),
    // One inclusion per line is easier to edit than a list of inputs.
    inclusions: (item?.inclusions ?? []).join('\n'),
    notesEn: item?.notes?.en ?? '',
    notesAr: item?.notes?.ar ?? '',
  }
}

function toDraft(center: ApiCenter | null): Draft {
  return {
    nameEn: center?.name.en ?? '',
    nameAr: center?.name.ar ?? '',
    descriptionEn: center?.description.en ?? '',
    descriptionAr: center?.description.ar ?? '',
    city: center?.city ?? '',
    area: center?.area ?? '',
    address: center?.address ?? '',
    mapUrl: center?.mapUrl ?? '',
    phone: center?.phone ?? '',
    whatsapp: center?.whatsapp ?? '',
    website: center?.website ?? '',
    instagram: center?.instagram ?? '',
    hours: center?.hours ?? '',
    packages: (center?.packages ?? []).map(toPackageDraft),
    images: center?.images ?? [],
  }
}

function toPackage(draft: PackageDraft): CenterPackage {
  const min = number(draft.durationMin)
  const max = number(draft.durationMax)
  return {
    id: draft.id,
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    service: draft.service,
    coverage: draft.coverage,
    priceEgp: Number(draft.priceEgp),
    wildPriceEgp: number(draft.wildPriceEgp),
    durationDays: min === undefined && max === undefined ? undefined : { min: min ?? max ?? 0, max: max ?? min ?? 0 },
    brand: blank(draft.brand),
    product: blank(draft.product),
    materialType: blank(draft.materialType),
    thicknessMil: number(draft.thicknessMil),
    selfHealing: draft.selfHealing === '' ? undefined : draft.selfHealing === 'yes',
    warrantyYears: number(draft.warrantyYears),
    inclusions: draft.inclusions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    notes:
      draft.notesEn.trim() || draft.notesAr.trim() ? { en: draft.notesEn.trim(), ar: draft.notesAr.trim() } : undefined,
  }
}

function toInput(draft: Draft): CenterInput {
  return {
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    description: { en: draft.descriptionEn.trim(), ar: draft.descriptionAr.trim() },
    city: draft.city.trim(),
    area: blank(draft.area),
    address: blank(draft.address),
    mapUrl: blank(draft.mapUrl),
    phone: blank(draft.phone),
    whatsapp: blank(draft.whatsapp),
    website: blank(draft.website),
    instagram: blank(draft.instagram),
    hours: blank(draft.hours),
    packages: draft.packages.map(toPackage),
    images: draft.images,
  }
}

function CenterForm({
  center,
  merchants,
  onClose,
  onSaved,
}: {
  center: ApiCenter | null
  /** Staff only: who runs this business on the site. */
  merchants?: ApiMerchant[]
  onClose: () => void
  onSaved: () => void
}) {
  const tx = useShortText()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => toDraft(center))
  // New packages start open; saved ones start folded so a long list stays scannable.
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  function setPackage(key: string, patch: Partial<PackageDraft>) {
    setDraft((current) => ({
      ...current,
      packages: current.packages.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }))
  }

  function addPackage(from?: PackageDraft) {
    // A copy is a new package: it gets its own key and no server id.
    const item = from ? { ...from, key: localKey(), id: undefined, nameEn: from.nameEn && `${from.nameEn} (copy)` } : toPackageDraft(null)
    setDraft((current) => ({ ...current, packages: [...current.packages, item] }))
    setOpen((current) => new Set(current).add(item.key))
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
    if (!center) return
    setBusy(true)
    try {
      await api.updateCenter(center.id, { checked: true })
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
      setError(tx('Give the center a name in English, Arabic or both.', 'أضف اسما للمركز بالإنجليزية أو العربية أو كلتيهما.'))
      return
    }
    // Checked here rather than with `required`: a folded package is hidden, and
    // the browser cannot point at a field it cannot show.
    const problem = draft.packages.findIndex((item) => !item.nameEn.trim() && !item.nameAr.trim())
    if (problem !== -1) {
      setOpen((current) => new Set(current).add(draft.packages[problem].key))
      setError(tx(`Give package ${problem + 1} a name in English or Arabic.`, `أضف اسما للباقة ${problem + 1} بالإنجليزية أو العربية.`))
      return
    }

    setBusy(true)
    try {
      const input = toInput(draft)
      if (center) await api.updateCenter(center.id, input)
      else await api.createCenter(input)
      toast(center ? tx('Center updated.', 'تم تحديث المركز.') : tx('Center added.', 'تمت إضافة المركز.'))
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
      title={center ? tx('Edit protection center', 'تعديل مركز الحماية') : tx('Add protection center', 'أضف مركز حماية')}
      subtitle={center ? center.name.en || center.name.ar : undefined}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions spread">
          {center ? (
            <button type="button" className="panel-button ghost" disabled={working} onClick={markChecked}>
              <BadgeCheck size={15} aria-hidden="true" /> {tx('Packages still correct', 'الباقات ما زالت صحيحة')}
            </button>
          ) : (
            <span />
          )}
          <span className="panel-drawer-actions">
            <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
              {tx('Cancel', 'إلغاء')}
            </button>
            <button type="submit" form="center-form" className="panel-button primary" disabled={working}>
              {uploading > 0
                ? tx('Uploading photos…', 'جارٍ رفع الصور…')
                : busy
                  ? tx('Saving…', 'جارٍ الحفظ…')
                  : center
                    ? tx('Save changes', 'احفظ التغييرات')
                    : tx('Add center', 'أضف مركزا')}
            </button>
          </span>
        </div>
      }
    >
      <form id="center-form" className="auth-form wide panel-form part-form" onSubmit={onSubmit}>
        <RequiredLegend bilingual />
        <section className="part-form-section">
          <h3>{tx('The center', 'المركز')}</h3>
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
              <span>{tx('City', 'المدينة')}</span>
              <input value={draft.city} onChange={(e) => set('city', e.target.value)} maxLength={80} placeholder={tx('e.g. Cairo', 'مثل: القاهرة')} />
            </label>
            <label>
              <span>{tx('Area', 'المنطقة')}</span>
              <input value={draft.area} onChange={(e) => set('area', e.target.value)} maxLength={120} placeholder={tx('e.g. New Cairo, 5th Settlement', 'مثل: التجمع الخامس')} />
            </label>
          </div>
          <label>
            <span>{tx('Address', 'العنوان')}</span>
            <input value={draft.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
          </label>
          <label>
            <span>{tx('About the center (English)', 'عن المركز (بالإنجليزية)')}</span>
            <textarea value={draft.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} maxLength={5000} rows={3} dir="ltr" />
          </label>
          <label>
            <span>{tx('About the center (Arabic)', 'عن المركز (بالعربية)')}</span>
            <textarea value={draft.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} maxLength={5000} rows={3} dir="rtl" lang="ar" />
          </label>
        </section>

        <section className="part-form-section">
          <h3>{tx('Contact', 'التواصل')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Phone', 'الهاتف')}</span>
              <input value={draft.phone} onChange={(e) => set('phone', e.target.value)} maxLength={32} dir="ltr" inputMode="tel" />
            </label>
            <label>
              <span>WhatsApp</span>
              <input value={draft.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} maxLength={32} dir="ltr" inputMode="tel" />
            </label>
            <label>
              <span>{tx('Map link', 'رابط الخريطة')}</span>
              <input type="url" value={draft.mapUrl} onChange={(e) => set('mapUrl', e.target.value)} maxLength={1000} dir="ltr" placeholder="https://maps.google.com/…" />
            </label>
            <label>
              <span>{tx('Working hours', 'مواعيد العمل')}</span>
              <input value={draft.hours} onChange={(e) => set('hours', e.target.value)} maxLength={200} placeholder={tx('e.g. Sat–Thu 10am–10pm', 'مثل: السبت–الخميس 10ص–10م')} />
            </label>
            <label>
              <span>{tx('Website', 'الموقع')}</span>
              <input type="url" value={draft.website} onChange={(e) => set('website', e.target.value)} maxLength={1000} dir="ltr" placeholder="https://" />
            </label>
            <label>
              <span>Instagram / Facebook</span>
              <input type="url" value={draft.instagram} onChange={(e) => set('instagram', e.target.value)} maxLength={1000} dir="ltr" placeholder="https://instagram.com/…" />
            </label>
          </div>
        </section>

        <section className="part-form-section">
          <h3>
            {tx('Packages', 'الباقات')} <small className="panel-muted">{`${draft.packages.length}/${MAX_PACKAGES}`}</small>
          </h3>
          {draft.packages.length === 0 && (
            <p className="panel-muted">
              {tx('No packages yet. Add each offer the center sells, e.g. "Full front PPF".', 'لا توجد باقات بعد. أضف كل عرض يقدمه المركز، مثل "PPF للواجهة كاملة".')}
            </p>
          )}
          {draft.packages.map((item, index) => (
            <PackageEditor
              key={item.key}
              item={item}
              index={index}
              open={open.has(item.key)}
              onToggle={() => toggle(item.key)}
              onChange={(patch) => setPackage(item.key, patch)}
              onDuplicate={draft.packages.length < MAX_PACKAGES ? () => addPackage(item) : undefined}
              onRemove={() => set('packages', draft.packages.filter((other) => other.key !== item.key))}
            />
          ))}
          {draft.packages.length < MAX_PACKAGES && (
            <button type="button" className="panel-button small" onClick={() => addPackage()}>
              <Plus size={14} aria-hidden="true" /> {tx('Add package', 'أضف باقة')}
            </button>
          )}
        </section>

        <PhotoEditor
          folder="centers"
          images={draft.images}
          onChange={(update) => setDraft((current) => ({ ...current, images: update(current.images) }))}
          onUploadingChange={setUploading}
        />

        {error && <p className="form-error">{error}</p>}
      </form>
      {center && merchants && <MerchantAccounts kind="centers" listingId={center.id} initial={merchants} />}
      {/* Once per form: every package's brand and material fields point here. */}
      <datalist id="center-brands">
        {BRAND_SUGGESTIONS.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <datalist id="center-materials">
        {MATERIAL_SUGGESTIONS.map((material) => (
          <option key={material} value={material} />
        ))}
      </datalist>
    </Drawer>
  )
}

function PackageEditor({
  item,
  index,
  open,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
}: {
  item: PackageDraft
  index: number
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<PackageDraft>) => void
  onDuplicate?: () => void
  onRemove: () => void
}) {
  const { t } = useLanguage()
  const tx = useShortText()
  const title = item.nameEn || item.nameAr || tx(`Package ${index + 1}`, `الباقة ${index + 1}`)
  const price = Number(item.priceEgp)
  const bodyId = `package-${item.key}`

  function toggleArea(area: CoverageArea) {
    onChange({ coverage: item.coverage.includes(area) ? item.coverage.filter((other) => other !== area) : [...item.coverage, area] })
  }

  return (
    <div className={open ? 'center-package open' : 'center-package'}>
      <div className="center-package-head">
        <button type="button" className="center-package-toggle" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
          <ChevronDown size={16} aria-hidden="true" />
          <span className="panel-cell-main">
            <strong>{title}</strong>
            <small>
              {t(SERVICE_LABELS[item.service])}
              {item.priceEgp.trim() && Number.isFinite(price) ? ` · ${egp.format(price)}` : ''}
            </small>
          </span>
        </button>
        <span className="panel-row-actions">
          {onDuplicate && (
            <button type="button" className="panel-icon-button" onClick={onDuplicate} aria-label={tx('Duplicate package', 'كرر الباقة')} title={tx('Duplicate package', 'كرر الباقة')}>
              <Copy size={14} />
            </button>
          )}
          <button type="button" className="panel-icon-button danger" onClick={onRemove} aria-label={tx('Remove package', 'احذف الباقة')} title={tx('Remove package', 'احذف الباقة')}>
            <X size={14} />
          </button>
        </span>
      </div>

      <div id={bodyId} className="center-package-body" hidden={!open}>
        <div className="panel-form-grid">
          <label>
            <span>
              {tx('Package name (English)', 'اسم الباقة (بالإنجليزية)')}
              <Req />
            </span>
            <input aria-required value={item.nameEn} onChange={(e) => onChange({ nameEn: e.target.value })} maxLength={120} dir="ltr" placeholder="Full front PPF" />
          </label>
          <label>
            <span>
              {tx('Package name (Arabic)', 'اسم الباقة (بالعربية)')}
              <Req />
            </span>
            <input aria-required value={item.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} maxLength={120} dir="rtl" lang="ar" />
          </label>
          <label>
            <span>{tx('Service', 'الخدمة')}</span>
            <select value={item.service} onChange={(e) => onChange({ service: e.target.value as ProtectionService })}>
              {SERVICES.map((key) => (
                <option key={key} value={key}>
                  {t(SERVICE_LABELS[key])}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h4>{tx('Price and time', 'السعر والمدة')}</h4>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Price (EGP)', 'السعر (جنيه)')}</span>
            <input type="number" inputMode="decimal" min={1} step="any" value={item.priceEgp} onChange={(e) => onChange({ priceEgp: e.target.value })} dir="ltr" />
          </label>
          <label>
            <span>{tx('Wild price, if different (EGP)', 'سعر Wild إن اختلف (جنيه)')}</span>
            <input type="number" inputMode="decimal" min={1} step="any" value={item.wildPriceEgp} onChange={(e) => onChange({ wildPriceEgp: e.target.value })} dir="ltr" />
          </label>
          <label>
            <span>{tx('Days at the center, shortest', 'أيام البقاء في المركز، الأقل')}</span>
            <input type="number" min={0} max={60} step={0.5} value={item.durationMin} onChange={(e) => onChange({ durationMin: e.target.value })} dir="ltr" />
          </label>
          <label>
            <span>{tx('Days at the center, longest', 'أيام البقاء في المركز، الأكثر')}</span>
            <input type="number" min={0} max={60} step={0.5} value={item.durationMax} onChange={(e) => onChange({ durationMax: e.target.value })} dir="ltr" />
          </label>
        </div>

        <h4>{tx('What it covers', 'ما تغطيه')}</h4>
        <div className="center-coverage" role="group" aria-label={tx('Coverage', 'التغطية')}>
          {COVERAGE_AREAS.map((area) => (
            <label key={area} className={item.coverage.includes(area) ? 'selected' : undefined}>
              <input type="checkbox" checked={item.coverage.includes(area)} onChange={() => toggleArea(area)} />
              <span>{t(COVERAGE_LABELS[area])}</span>
            </label>
          ))}
        </div>

        <h4>{tx('Material and warranty', 'الخامة والضمان')}</h4>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Brand', 'الماركة')}</span>
            <input value={item.brand} onChange={(e) => onChange({ brand: e.target.value })} maxLength={80} list="center-brands" dir="ltr" />
          </label>
          <label>
            <span>{tx('Product', 'المنتج')}</span>
            <input value={item.product} onChange={(e) => onChange({ product: e.target.value })} maxLength={120} dir="ltr" placeholder="e.g. Ultimate Plus" />
          </label>
          <label>
            <span>{tx('Material type', 'نوع الخامة')}</span>
            <input value={item.materialType} onChange={(e) => onChange({ materialType: e.target.value })} maxLength={80} list="center-materials" dir="ltr" />
          </label>
          <label>
            <span>{tx('Thickness (mil)', 'السُمك (ميل)')}</span>
            <input type="number" min={0} max={100} step="any" value={item.thicknessMil} onChange={(e) => onChange({ thicknessMil: e.target.value })} dir="ltr" />
          </label>
          <label>
            <span>{tx('Self-healing', 'ذاتي الالتئام')}</span>
            <select value={item.selfHealing} onChange={(e) => onChange({ selfHealing: e.target.value as PackageDraft['selfHealing'] })}>
              <option value="">{tx('Not stated', 'غير محدد')}</option>
              <option value="yes">{tx('Yes', 'نعم')}</option>
              <option value="no">{tx('No', 'لا')}</option>
            </select>
          </label>
          <label>
            <span>{tx('Warranty (years)', 'الضمان (سنوات)')}</span>
            <input type="number" min={0} max={30} step="any" value={item.warrantyYears} onChange={(e) => onChange({ warrantyYears: e.target.value })} dir="ltr" />
          </label>
        </div>

        <h4>{tx('Included and notes', 'المشمول والملاحظات')}</h4>
        <label>
          <span>{tx('What is included, one per line', 'ما يشمله، سطر لكل بند')}</span>
          <textarea
            value={item.inclusions}
            onChange={(e) => onChange({ inclusions: e.target.value })}
            rows={3}
            placeholder={tx('Paint correction\nTwo follow-up washes\nCertificate of warranty', 'تصحيح الطلاء\nغسيلتان للمتابعة\nشهادة ضمان')}
          />
        </label>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Notes (English)', 'ملاحظات (بالإنجليزية)')}</span>
            <textarea value={item.notesEn} onChange={(e) => onChange({ notesEn: e.target.value })} maxLength={2000} rows={2} dir="ltr" />
          </label>
          <label>
            <span>{tx('Notes (Arabic)', 'ملاحظات (بالعربية)')}</span>
            <textarea value={item.notesAr} onChange={(e) => onChange({ notesAr: e.target.value })} maxLength={2000} rows={2} dir="rtl" lang="ar" />
          </label>
        </div>
      </div>

    </div>
  )
}
