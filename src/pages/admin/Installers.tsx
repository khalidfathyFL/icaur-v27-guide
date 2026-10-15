import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { BadgeCheck, ChevronDown, Copy, Pencil, PlugZap, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState, PageHeader } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { Req, RequiredLegend } from '../../components/RequiredMark'
import { EGYPT_GOVERNORATES } from '../../content/places'
import { CONNECTOR_LABELS, PHASE_LABELS, SERVICES, SERVICE_LABELS, installerName, kw } from '../../features/installers/labels'
import { egp } from '../../features/parts/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import {
  api,
  type ApiInstaller,
  type ApiMerchant,
  type ChargerConnector,
  type ChargerPhase,
  type InstallService,
  type InstallerInput,
  type InstallerPackage,
  type PartImage,
} from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { PhotoEditor } from './PhotoEditor'
import { MerchantAccounts } from './MerchantAccounts'
import { useAuth } from '../../auth/authContext'

/** A listing as the table has it: staff also get the merchant accounts behind it. */
type Row = ApiInstaller & { merchants?: ApiMerchant[] }

/** `null` while closed; `'new'` for the add form, or the installer being edited. */
type Editing = null | 'new' | Row

const MAX_PACKAGES = 15

export function Installers() {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [installers, setInstallers] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const { can } = useAuth()
  // Staff see every listing; a merchant sees only the ones they run. The server enforces the same split.
  const staff = can('installers.manage')

  const load = useCallback(() => {
    api
      .listInstallers(staff ? { all: true } : { mine: true })
      .then(({ installers: list }) => {
        setInstallers(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx, staff])

  useEffect(load, [load])

  async function remove(installer: ApiInstaller) {
    const name = installerName(installer, language)
    const ok = await confirm({
      title: tx(`Remove ${name}?`, `إزالة ${name}؟`),
      message: tx(
        'It disappears from the charger installers page. Its packages, photos and reviews are kept, so it can be restored.',
        'ستختفي من صفحة تركيب الشواحن. تبقى باقاتها وصورها ومراجعاتها، لذلك يمكن استعادتها.',
      ),
      confirmLabel: tx('Remove', 'إزالة'),
      tone: 'danger',
    })
    if (!ok) return

    try {
      await api.removeInstaller(installer.id)
      toast(tx('Installer removed.', 'تمت إزالة شركة التركيب.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذر الحذف.')), 'error')
    }
  }

  async function restore(installer: ApiInstaller) {
    try {
      await api.updateInstaller(installer.id, { active: true })
      toast(tx('Installer restored.', 'تمت استعادة شركة التركيب.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not restore.', 'تعذرت الاستعادة.')), 'error')
    }
  }

  const addButton = (
    <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
      <Plus size={16} aria-hidden="true" /> {tx('Add installer', 'أضف شركة تركيب')}
    </button>
  )

  return (
    <>
      {!staff && (
        <PageHeader
          description={tx(
            'The listings you run. Edit your details, photos and packages; changes go live on the site straight away and are recorded with your name.',
            'الصفحات التي تديرها. عدّل بياناتك وصورك والباقات؛ تظهر التغييرات على الموقع فورا وتسجل باسمك.',
          )}
        />
      )}
      <DataTable
        rows={installers}
        rowKey={(installer) => installer.id}
        error={error}
        searchText={(installer) =>
          `${installer.name.en} ${installer.name.ar} ${installer.packages.map((item) => `${item.name.en} ${item.name.ar} ${item.chargerBrand ?? ''}`).join(' ')}`
        }
        searchPlaceholder={tx('Search installer or package…', 'ابحث عن شركة أو باقة…')}
        actions={staff ? addButton : undefined}
        onRowClick={(installer) => setEditing(installer)}
        empty={
          <EmptyState
            icon={PlugZap}
            title={tx('No installers yet', 'لا توجد شركات تركيب بعد')}
            text={tx('Add the first company that installs home chargers, with its packages.', 'أضف أول شركة تركب الشواحن المنزلية بباقاتها.')}
            action={staff ? addButton : undefined}
          />
        }
        columns={[
          {
            key: 'name',
            header: tx('Installer', 'شركة التركيب'),
            width: 'minmax(0, 2fr)',
            render: (installer) => (
              <span className="part-row-main">
                {installer.images[0] ? (
                  <img src={installer.images[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="part-row-thumb" aria-hidden="true">
                    <PlugZap size={16} />
                  </span>
                )}
                <span className="panel-cell-main">
                  <strong>{installerName(installer, language)}</strong>
                  <small>{tx(`${installer.packages.length} package(s)`, `${installer.packages.length} باقة`)}</small>
                </span>
              </span>
            ),
          },
          {
            key: 'price',
            header: tx('From', 'يبدأ من'),
            width: '130px',
            render: (installer) => <span dir="ltr">{installer.lowestPriceEgp === null ? '—' : egp.format(installer.lowestPriceEgp)}</span>,
          },
          {
            key: 'licensed',
            header: tx('Licensed', 'مرخصة'),
            width: '100px',
            render: (installer) =>
              installer.licensed ? <span className="badge ok">{tx('Yes', 'نعم')}</span> : <span className="panel-muted">—</span>,
          },
          {
            key: 'status',
            header: tx('Status', 'الحالة'),
            width: '110px',
            render: (installer) =>
              installer.active ? (
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
                  render: (installer: Row) => (
                    <span className="panel-muted panel-clamp">
                      {installer.merchants?.length ? installer.merchants.map((merchant) => merchant.name).join(', ') : '—'}
                    </span>
                  ),
                },
              ]
            : []),
          {
            key: 'checked',
            header: tx('Checked', 'آخر تحقق'),
            width: '130px',
            render: (installer) => <span className="panel-muted">{formatDate(installer.checkedAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (installer) => (
              <span className="panel-row-actions">
                <button type="button" className="panel-icon-button" onClick={() => setEditing(installer)} aria-label={tx('Edit', 'تعديل')} title={tx('Edit', 'تعديل')}>
                  <Pencil size={15} />
                </button>
                {staff &&
                  (installer.active ? (
                    <button type="button" className="panel-icon-button danger" onClick={() => remove(installer)} aria-label={tx('Remove', 'حذف')} title={tx('Remove', 'حذف')}>
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <button type="button" className="panel-icon-button success" onClick={() => restore(installer)} aria-label={tx('Restore', 'استعادة')} title={tx('Restore', 'استعادة')}>
                      <RotateCcw size={15} />
                    </button>
                  ))}
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <InstallerForm
          key={editing === 'new' ? 'new' : editing.id}
          installer={editing === 'new' ? null : editing}
          staff={staff}
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

/** Numbers are held as typed; bilingual text as two strings. */
type PackageDraft = {
  key: string
  id?: string
  nameEn: string
  nameAr: string
  chargerBrand: string
  powerKw: string
  phase: ChargerPhase | ''
  connector: ChargerConnector | ''
  priceEgp: string
  installIncluded: '' | 'yes' | 'no'
  cableMetersIncluded: string
  extraMeterEgp: string
  warrantyYears: string
  services: InstallService[]
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
  governorates: string[]
  licensed: boolean
  packages: PackageDraft[]
  images: PartImage[]
}

const text = (value: number | undefined) => (value === undefined || value === null ? '' : String(value))
const number = (value: string) => (value.trim() === '' ? undefined : Number(value))
const blank = (value: string) => value.trim() || undefined
const pair = (en: string, ar: string) => (en.trim() || ar.trim() ? { en: en.trim(), ar: ar.trim() } : undefined)
const localKey = () => `new-${Math.random().toString(36).slice(2, 9)}`

function toPackageDraft(item: InstallerPackage | null): PackageDraft {
  return {
    key: item?.id ?? localKey(),
    id: item?.id,
    nameEn: item?.name.en ?? '',
    nameAr: item?.name.ar ?? '',
    chargerBrand: item?.chargerBrand ?? '',
    powerKw: text(item?.powerKw),
    phase: item?.phase ?? '',
    connector: item?.connector ?? '',
    priceEgp: text(item?.priceEgp),
    installIncluded: item?.installIncluded === undefined ? '' : item.installIncluded ? 'yes' : 'no',
    cableMetersIncluded: text(item?.cableMetersIncluded),
    extraMeterEgp: text(item?.extraMeterEgp),
    warrantyYears: text(item?.warrantyYears),
    services: item?.services ?? [],
    installmentsEn: item?.installments?.en ?? '',
    installmentsAr: item?.installments?.ar ?? '',
    notesEn: item?.notes?.en ?? '',
    notesAr: item?.notes?.ar ?? '',
  }
}

function toDraft(installer: ApiInstaller | null): Draft {
  return {
    nameEn: installer?.name.en ?? '',
    nameAr: installer?.name.ar ?? '',
    descriptionEn: installer?.description.en ?? '',
    descriptionAr: installer?.description.ar ?? '',
    hotline: installer?.hotline ?? '',
    phone: installer?.phone ?? '',
    whatsapp: installer?.whatsapp ?? '',
    website: installer?.website ?? '',
    email: installer?.email ?? '',
    governorates: installer?.governorates ?? [],
    licensed: installer?.licensed ?? false,
    packages: (installer?.packages ?? []).map(toPackageDraft),
    images: installer?.images ?? [],
  }
}

function toPackage(draft: PackageDraft): InstallerPackage {
  return {
    id: draft.id,
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    chargerBrand: blank(draft.chargerBrand),
    powerKw: number(draft.powerKw),
    phase: draft.phase || undefined,
    connector: draft.connector || undefined,
    priceEgp: number(draft.priceEgp),
    installIncluded: draft.installIncluded === '' ? undefined : draft.installIncluded === 'yes',
    cableMetersIncluded: number(draft.cableMetersIncluded),
    extraMeterEgp: number(draft.extraMeterEgp),
    warrantyYears: number(draft.warrantyYears),
    services: draft.services,
    installments: pair(draft.installmentsEn, draft.installmentsAr),
    notes: pair(draft.notesEn, draft.notesAr),
  }
}

function toInput(draft: Draft): InstallerInput {
  return {
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    description: { en: draft.descriptionEn.trim(), ar: draft.descriptionAr.trim() },
    hotline: blank(draft.hotline),
    phone: blank(draft.phone),
    whatsapp: blank(draft.whatsapp),
    website: blank(draft.website),
    email: blank(draft.email),
    governorates: draft.governorates,
    licensed: draft.licensed,
    packages: draft.packages.map(toPackage),
    images: draft.images,
  }
}

function InstallerForm({
  installer,
  staff,
  merchants,
  onClose,
  onSaved,
}: {
  installer: ApiInstaller | null
  /** Only staff confirm that a company is licensed. */
  staff: boolean
  /** Staff only: who runs this business on the site. */
  merchants?: ApiMerchant[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => toDraft(installer))
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  function setPackage(key: string, patch: Partial<PackageDraft>) {
    setDraft((current) => ({ ...current, packages: current.packages.map((item) => (item.key === key ? { ...item, ...patch } : item)) }))
  }

  function addPackage(from?: PackageDraft) {
    // A copy is a new package: its own key and no server id.
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

  function toggleGovernorate(name: string) {
    set('governorates', draft.governorates.includes(name) ? draft.governorates.filter((other) => other !== name) : [...draft.governorates, name])
  }

  async function markChecked() {
    if (!installer) return
    setBusy(true)
    try {
      await api.updateInstaller(installer.id, { checked: true })
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
      setError(tx('Give the installer a name in English or Arabic.', 'أضف اسما لشركة التركيب بالإنجليزية أو العربية.'))
      return
    }
    const unnamed = draft.packages.findIndex((item) => !item.nameEn.trim() && !item.nameAr.trim())
    if (unnamed !== -1) {
      setOpen((current) => new Set(current).add(draft.packages[unnamed].key))
      setError(tx(`Give package ${unnamed + 1} a name in English or Arabic.`, `أضف اسما للباقة ${unnamed + 1} بالإنجليزية أو العربية.`))
      return
    }

    setBusy(true)
    try {
      const input = toInput(draft)
      if (installer) await api.updateInstaller(installer.id, input)
      else await api.createInstaller(input)
      toast(installer ? tx('Installer updated.', 'تم تحديث شركة التركيب.') : tx('Installer added.', 'تمت إضافة شركة التركيب.'))
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
      title={installer ? tx('Edit installer', 'تعديل شركة التركيب') : tx('Add installer', 'أضف شركة تركيب')}
      subtitle={installer ? installer.name.en || installer.name.ar : undefined}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions spread">
          {installer ? (
            <button type="button" className="panel-button ghost" disabled={working} onClick={markChecked}>
              <BadgeCheck size={15} aria-hidden="true" /> {tx('Prices still correct', 'الأسعار ما زالت صحيحة')}
            </button>
          ) : (
            <span />
          )}
          <span className="panel-drawer-actions">
            <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
              {tx('Cancel', 'إلغاء')}
            </button>
            <button type="submit" form="installer-form" className="panel-button primary" disabled={working}>
              {uploading > 0
                ? tx('Uploading photos…', 'جارٍ رفع الصور…')
                : busy
                  ? tx('Saving…', 'جارٍ الحفظ…')
                  : installer
                    ? tx('Save changes', 'احفظ التغييرات')
                    : tx('Add installer', 'أضف شركة تركيب')}
            </button>
          </span>
        </div>
      }
    >
      <form id="installer-form" className="auth-form wide panel-form part-form" onSubmit={onSubmit}>
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
          {staff && (
            <label className="checkbox-row">
              <input type="checkbox" checked={draft.licensed} onChange={(e) => set('licensed', e.target.checked)} />
              <span>
                {tx('On EgyptERA’s list of licensed charging companies', 'مدرجة في قائمة جهاز تنظيم الكهرباء للشركات المرخصة')}{' '}
                <a href="https://egyptera.org/ar/EVComp.aspx" target="_blank" rel="noopener noreferrer">
                  {tx('Check the list', 'راجع القائمة')}
                </a>
              </span>
            </label>
          )}
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
          </div>
        </section>

        <section className="part-form-section">
          <h3>{tx('Where they install', 'أماكن التركيب')}</h3>
          <p className="panel-muted">{tx('Leave all unticked if they have not said.', 'اترك الكل بدون اختيار إن لم تحدد الشركة.')}</p>
          <div className="center-coverage" role="group" aria-label={tx('Governorates', 'المحافظات')}>
            {EGYPT_GOVERNORATES.map((item) => (
              <label key={item.en} className={draft.governorates.includes(item.en) ? 'selected' : undefined}>
                <input type="checkbox" checked={draft.governorates.includes(item.en)} onChange={() => toggleGovernorate(item.en)} />
                <span>{t(item)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="part-form-section">
          <h3>
            {tx('Packages', 'الباقات')} <small className="panel-muted">{`${draft.packages.length}/${MAX_PACKAGES}`}</small>
          </h3>
          {draft.packages.length === 0 && (
            <p className="panel-muted">
              {tx('No packages yet. Add each offer the company sells, e.g. "7 kW wall box with installation".', 'لا توجد باقات بعد. أضف كل عرض تبيعه الشركة، مثل "شاحن جداري 7 كيلووات مع التركيب".')}
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
          folder="installers"
          images={draft.images}
          onChange={(update) => setDraft((current) => ({ ...current, images: update(current.images) }))}
          onUploadingChange={setUploading}
          max={4}
        />

        {error && <p className="form-error">{error}</p>}
      </form>
      {installer && merchants && <MerchantAccounts kind="installers" listingId={installer.id} initial={merchants} />}
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
  const power = Number(item.powerKw)
  const bodyId = `package-${item.key}`

  function toggleService(service: InstallService) {
    onChange({ services: item.services.includes(service) ? item.services.filter((other) => other !== service) : [...item.services, service] })
  }

  const field = (label: string, key: keyof PackageDraft, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label>
      <span>{label}</span>
      <input value={item[key] as string} onChange={(e) => onChange({ [key]: e.target.value })} {...props} />
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

  const summary = [
    item.priceEgp.trim() && Number.isFinite(price) ? egp.format(price) : tx('No price yet', 'بلا سعر بعد'),
    item.powerKw.trim() && Number.isFinite(power) ? kw(power) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={open ? 'center-package open' : 'center-package'}>
      <div className="center-package-head">
        <button type="button" className="center-package-toggle" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
          <ChevronDown size={16} aria-hidden="true" />
          <span className="panel-cell-main">
            <strong>{title}</strong>
            <small>{summary}</small>
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
            <input aria-required value={item.nameEn} onChange={(e) => onChange({ nameEn: e.target.value })} maxLength={120} dir="ltr" placeholder="7 kW wall box, installed" />
          </label>
          <label>
            <span>
              {tx('Package name (Arabic)', 'اسم الباقة (بالعربية)')}
              <Req />
            </span>
            <input aria-required value={item.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} maxLength={120} dir="rtl" lang="ar" />
          </label>
        </div>

        <h4>{tx('The charger', 'الشاحن')}</h4>
        <div className="panel-form-grid">
          {field(tx('Make and model', 'الماركة والموديل'), 'chargerBrand', { maxLength: 120, dir: 'ltr' })}
          {field(tx('Power (kW)', 'القدرة (كيلووات)'), 'powerKw', numberProps(400))}
          <label>
            <span>{tx('Home supply', 'كهرباء المنزل')}</span>
            <select value={item.phase} onChange={(e) => onChange({ phase: e.target.value as ChargerPhase | '' })}>
              <option value="">—</option>
              <option value="1">{t(PHASE_LABELS['1'])}</option>
              <option value="3">{t(PHASE_LABELS['3'])}</option>
            </select>
          </label>
          <label>
            <span>{tx('Plug', 'الفيشة')}</span>
            <select value={item.connector} onChange={(e) => onChange({ connector: e.target.value as ChargerConnector | '' })}>
              <option value="">—</option>
              <option value="gbt">{t(CONNECTOR_LABELS.gbt)}</option>
              <option value="type2">{t(CONNECTOR_LABELS.type2)}</option>
            </select>
          </label>
        </div>

        <h4>{tx('Price and installation', 'السعر والتركيب')}</h4>
        <div className="panel-form-grid">
          {field(tx('Price (EGP)', 'السعر (جنيه)'), 'priceEgp', numberProps(10_000_000))}
          <label>
            <span>{tx('Installation', 'التركيب')}</span>
            <select value={item.installIncluded} onChange={(e) => onChange({ installIncluded: e.target.value as PackageDraft['installIncluded'] })}>
              <option value="">—</option>
              <option value="yes">{tx('Included in the price', 'مشمول في السعر')}</option>
              <option value="no">{tx('Charged separately', 'بتكلفة منفصلة')}</option>
            </select>
          </label>
          {field(tx('Cable included (metres)', 'الكابل المشمول (متر)'), 'cableMetersIncluded', numberProps(500, 1))}
          {field(tx('Each extra metre (EGP)', 'كل متر إضافي (جنيه)'), 'extraMeterEgp', numberProps(100_000))}
          {field(tx('Warranty (years)', 'الضمان (سنوات)'), 'warrantyYears', numberProps(15, 1))}
        </div>

        <h4>{tx('What it includes', 'ما تشمله')}</h4>
        <div className="center-coverage" role="group" aria-label={tx('Services', 'الخدمات')}>
          {SERVICES.map((service) => (
            <label key={service} className={item.services.includes(service) ? 'selected' : undefined}>
              <input type="checkbox" checked={item.services.includes(service)} onChange={() => toggleService(service)} />
              <span>{t(SERVICE_LABELS[service])}</span>
            </label>
          ))}
        </div>

        <div className="panel-form-grid">
          {field(tx('Installments (English)', 'التقسيط (بالإنجليزية)'), 'installmentsEn', { maxLength: 500, dir: 'ltr', placeholder: '12 months, no interest' })}
          {field(tx('Installments (Arabic)', 'التقسيط (بالعربية)'), 'installmentsAr', { maxLength: 500, dir: 'rtl', lang: 'ar' })}
        </div>
        <div className="panel-form-grid">
          <label>
            <span>{tx('What is not included, and notes (English)', 'ما لا تشمله والملاحظات (بالإنجليزية)')}</span>
            <textarea value={item.notesEn} onChange={(e) => onChange({ notesEn: e.target.value })} maxLength={3000} rows={3} dir="ltr" />
          </label>
          <label>
            <span>{tx('What is not included, and notes (Arabic)', 'ما لا تشمله والملاحظات (بالعربية)')}</span>
            <textarea value={item.notesAr} onChange={(e) => onChange({ notesAr: e.target.value })} maxLength={3000} rows={3} dir="rtl" lang="ar" />
          </label>
        </div>
      </div>
    </div>
  )
}
