import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MapPin, Pencil, Plus, RefreshCw, RotateCcw, Trash2, Undo2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState, PageHeader } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { Req, RequiredLegend } from '../../components/RequiredMark'
import { STATION_CONNECTORS, STATION_CONNECTOR_LABELS, stationMaxKw, stationName } from '../../features/charging/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiStation, type StationConnector, type StationInput, type StationSync } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'

/** `null` while closed; `'new'` for the add form, or the station being edited. */
type Editing = null | 'new' | ApiStation

export function Stations() {
  const { language, t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [stations, setStations] = useState<ApiStation[] | null>(null)
  const [sync, setSync] = useState<StationSync | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(() => {
    api
      .listStations({ all: true })
      .then(({ stations: list, sync: state }) => {
        setStations(list)
        setSync(state ?? null)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx])

  useEffect(load, [load])

  async function runSync() {
    setSyncing(true)
    try {
      const { result } = await api.syncStations()
      toast(
        tx(
          `Imported ${result.fetched}: ${result.added} new, ${result.updated} updated, ${result.keptEdited} kept as you edited them.`,
          `تم استيراد ${result.fetched}: ${result.added} جديدة، ${result.updated} محدثة، ${result.keptEdited} بقيت كما عدلتها.`,
        ),
      )
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('The import failed.', 'فشل الاستيراد.')), 'error')
      load()
    } finally {
      setSyncing(false)
    }
  }

  async function remove(station: ApiStation) {
    const name = stationName(station, language)
    const ok = await confirm({
      title: tx(`Remove ${name}?`, `إزالة ${name}؟`),
      message: tx('It disappears from the map, and the daily import will not bring it back.', 'ستختفي من الخريطة، ولن يعيدها الاستيراد اليومي.'),
      confirmLabel: tx('Remove', 'إزالة'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.removeStation(station.id)
      toast(tx('Station removed.', 'تمت إزالة المحطة.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذر الحذف.')), 'error')
    }
  }

  async function restore(station: ApiStation) {
    try {
      await api.updateStation(station.id, { active: true })
      toast(tx('Station restored.', 'تمت استعادة المحطة.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not restore.', 'تعذرت الاستعادة.')), 'error')
    }
  }

  const actions = (
    <>
      <button type="button" className="panel-button" onClick={runSync} disabled={syncing || sync?.configured === false}>
        <RefreshCw size={16} aria-hidden="true" /> {syncing ? tx('Importing…', 'جارٍ الاستيراد…') : tx('Import now', 'استورد الآن')}
      </button>
      <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
        <Plus size={16} aria-hidden="true" /> {tx('Add station', 'أضف محطة')}
      </button>
    </>
  )

  return (
    <>
      <PageHeader
        description={
          sync?.configured === false
            ? tx(
                'The Open Charge Map import is off: set OCM_API_KEY on the server to turn it on. Stations added here still show on the map.',
                'استيراد Open Charge Map متوقف: أضف OCM_API_KEY على السيرفر لتشغيله. المحطات المضافة هنا تظهر على الخريطة.',
              )
            : [
                tx(
                  'Stations come from Open Charge Map once a day. Anything you edit or remove here is kept as you left it.',
                  'تأتي المحطات من Open Charge Map مرة يوميا. أي محطة تعدلها أو تحذفها هنا تبقى كما تركتها.',
                ),
                sync?.syncedAt ? tx(`Last import: ${formatDate(sync.syncedAt, language)}.`, `آخر استيراد: ${formatDate(sync.syncedAt, language)}.`) : '',
                sync?.lastError ? tx(`Last attempt failed: ${sync.lastError}`, `فشلت آخر محاولة: ${sync.lastError}`) : '',
              ]
                .filter(Boolean)
                .join(' ')
        }
      />
      <DataTable
        rows={stations}
        rowKey={(station) => station.id}
        error={error}
        searchText={(station) => `${station.name.en} ${station.name.ar} ${station.operator ?? ''} ${station.city ?? ''} ${station.address ?? ''}`}
        searchPlaceholder={tx('Search station, operator or city…', 'ابحث عن محطة أو مشغل أو مدينة…')}
        actions={actions}
        onRowClick={(station) => setEditing(station)}
        empty={
          <EmptyState
            icon={MapPin}
            title={tx('No stations yet', 'لا توجد محطات بعد')}
            text={tx('Import them from Open Charge Map, or add one by hand.', 'استوردها من Open Charge Map أو أضف واحدة يدويا.')}
            action={actions}
          />
        }
        pageSize={25}
        columns={[
          {
            key: 'name',
            header: tx('Station', 'المحطة'),
            width: 'minmax(0, 2fr)',
            render: (station) => (
              <span className="panel-cell-main">
                <strong>{stationName(station, language)}</strong>
                <small>{[station.operator, station.city].filter(Boolean).join(' · ') || '—'}</small>
              </span>
            ),
          },
          {
            key: 'plugs',
            header: tx('Plugs', 'الفيش'),
            width: 'minmax(0, 1.2fr)',
            render: (station) => {
              const max = stationMaxKw(station)
              return (
                <span className="panel-muted panel-clamp">
                  {station.connectors.map((type) => t(STATION_CONNECTOR_LABELS[type])).join(', ') || '—'}
                  {max !== null ? ` · ${max} kW` : ''}
                </span>
              )
            },
          },
          {
            key: 'source',
            header: tx('Source', 'المصدر'),
            width: '140px',
            render: (station) =>
              station.source === 'manual' ? (
                <span className="badge">{tx('Added here', 'أضيفت هنا')}</span>
              ) : station.adminEdited ? (
                <span className="badge">{tx('Imported, edited', 'مستوردة ومعدلة')}</span>
              ) : (
                <span className="panel-muted">Open Charge Map</span>
              ),
          },
          {
            key: 'status',
            header: tx('Status', 'الحالة'),
            width: '110px',
            render: (station) =>
              !station.active ? (
                <span className="badge no">{tx('Removed', 'محذوفة')}</span>
              ) : station.operational ? (
                <span className="badge ok">{tx('On map', 'على الخريطة')}</span>
              ) : (
                <span className="badge">{tx('Out of order', 'معطلة')}</span>
              ),
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (station) => (
              <span className="panel-row-actions">
                <button type="button" className="panel-icon-button" onClick={() => setEditing(station)} aria-label={tx('Edit', 'تعديل')} title={tx('Edit', 'تعديل')}>
                  <Pencil size={15} />
                </button>
                {station.active ? (
                  <button type="button" className="panel-icon-button danger" onClick={() => remove(station)} aria-label={tx('Remove', 'حذف')} title={tx('Remove', 'حذف')}>
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button type="button" className="panel-icon-button success" onClick={() => restore(station)} aria-label={tx('Restore', 'استعادة')} title={tx('Restore', 'استعادة')}>
                    <RotateCcw size={15} />
                  </button>
                )}
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <StationForm
          key={editing === 'new' ? 'new' : editing.id}
          station={editing === 'new' ? null : editing}
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

type ConnectionDraft = { key: string; type: StationConnector; powerKw: string; count: string }

type Draft = {
  nameEn: string
  nameAr: string
  operator: string
  city: string
  address: string
  lat: string
  lng: string
  connections: ConnectionDraft[]
  pricePerKwh: string
  priceNote: string
  hours: string
  phone: string
  operational: boolean
}

const text = (value: number | undefined) => (value === undefined || value === null ? '' : String(value))
const number = (value: string) => (value.trim() === '' ? undefined : Number(value))
const blank = (value: string) => value.trim() || undefined
const localKey = () => `new-${Math.random().toString(36).slice(2, 9)}`

function toDraft(station: ApiStation | null): Draft {
  return {
    nameEn: station?.name.en ?? '',
    nameAr: station?.name.ar ?? '',
    operator: station?.operator ?? '',
    city: station?.city ?? '',
    address: station?.address ?? '',
    lat: text(station?.lat),
    lng: text(station?.lng),
    connections: (station?.connections ?? []).map((connection) => ({
      key: localKey(),
      type: connection.type,
      powerKw: text(connection.powerKw),
      count: text(connection.count),
    })),
    pricePerKwh: text(station?.pricePerKwh),
    priceNote: station?.priceNote ?? '',
    hours: station?.hours ?? '',
    phone: station?.phone ?? '',
    operational: station?.operational ?? true,
  }
}

function toInput(draft: Draft): StationInput {
  return {
    name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    operator: blank(draft.operator),
    city: blank(draft.city),
    address: blank(draft.address),
    lat: Number(draft.lat),
    lng: Number(draft.lng),
    connections: draft.connections.map((connection) => ({
      type: connection.type,
      powerKw: number(connection.powerKw),
      count: number(connection.count),
    })),
    pricePerKwh: number(draft.pricePerKwh),
    priceNote: blank(draft.priceNote),
    hours: blank(draft.hours),
    phone: blank(draft.phone),
    operational: draft.operational,
  }
}

/** "30.0444, 31.2357" as Google Maps copies it, or a maps link with "@lat,lng". */
function parseCoordinates(value: string): { lat: string; lng: string } | null {
  const match = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(value)
  return match?.[1] && match[2] ? { lat: match[1], lng: match[2] } : null
}

function StationForm({ station, onClose, onSaved }: { station: ApiStation | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => toDraft(station))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  function setConnection(key: string, patch: Partial<ConnectionDraft>) {
    set('connections', draft.connections.map((connection) => (connection.key === key ? { ...connection, ...patch } : connection)))
  }

  async function handBack() {
    if (!station) return
    setBusy(true)
    try {
      await api.updateStation(station.id, { adminEdited: false })
      toast(tx('The next import will refresh it from Open Charge Map.', 'سيحدّثها الاستيراد القادم من Open Charge Map.'))
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
      setError(tx('Give the station a name in English or Arabic.', 'أضف اسما للمحطة بالإنجليزية أو العربية.'))
      return
    }
    if (!Number.isFinite(Number(draft.lat)) || !Number.isFinite(Number(draft.lng)) || !draft.lat.trim() || !draft.lng.trim()) {
      setError(tx('Add the location: paste the coordinates from Google Maps.', 'أضف الموقع: الصق الإحداثيات من Google Maps.'))
      return
    }

    setBusy(true)
    try {
      const input = toInput(draft)
      if (station) await api.updateStation(station.id, input)
      else await api.createStation(input)
      toast(station ? tx('Station updated.', 'تم تحديث المحطة.') : tx('Station added.', 'تمت إضافة المحطة.'))
      onSaved()
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open
      size="lg"
      busy={busy}
      title={station ? tx('Edit station', 'تعديل المحطة') : tx('Add station', 'أضف محطة')}
      subtitle={station ? station.name.en || station.name.ar : undefined}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions spread">
          {station?.source === 'ocm' && station.adminEdited ? (
            <button type="button" className="panel-button ghost" disabled={busy} onClick={handBack}>
              <Undo2 size={15} aria-hidden="true" /> {tx('Use Open Charge Map’s version', 'استخدم نسخة Open Charge Map')}
            </button>
          ) : (
            <span />
          )}
          <span className="panel-drawer-actions">
            <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
              {tx('Cancel', 'إلغاء')}
            </button>
            <button type="submit" form="station-form" className="panel-button primary" disabled={busy}>
              {busy ? tx('Saving…', 'جارٍ الحفظ…') : station ? tx('Save changes', 'احفظ التغييرات') : tx('Add station', 'أضف محطة')}
            </button>
          </span>
        </div>
      }
    >
      <form id="station-form" className="auth-form wide panel-form part-form" onSubmit={onSubmit}>
        <RequiredLegend bilingual />
        {station?.source === 'ocm' && !station.adminEdited && (
          <p className="panel-muted">
            {tx(
              'Imported from Open Charge Map. Saving your changes keeps them: the daily import will no longer update this station.',
              'مستوردة من Open Charge Map. حفظ تعديلاتك يثبتها: لن يحدّث الاستيراد اليومي هذه المحطة بعد ذلك.',
            )}
          </p>
        )}

        <section className="part-form-section">
          <h3>{tx('The station', 'المحطة')}</h3>
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
            </label>
            <label>
              <span>{tx('Operator', 'المشغل')}</span>
              <input value={draft.operator} onChange={(e) => set('operator', e.target.value)} maxLength={120} placeholder="Infinity, Elsewedy Plug…" />
            </label>
            <label>
              <span>{tx('City', 'المدينة')}</span>
              <input value={draft.city} onChange={(e) => set('city', e.target.value)} maxLength={80} />
            </label>
          </div>
          <label>
            <span>{tx('Address', 'العنوان')}</span>
            <input value={draft.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
          </label>
        </section>

        <section className="part-form-section">
          <h3>
            {tx('Location', 'الموقع')}
            <Req />
          </h3>
          <label>
            <span>{tx('Paste from Google Maps', 'الصق من Google Maps')}</span>
            <input
              dir="ltr"
              placeholder="30.0444, 31.2357"
              onChange={(e) => {
                const found = parseCoordinates(e.target.value)
                if (found) setDraft((current) => ({ ...current, ...found }))
              }}
            />
            <small>{tx('Right-click the spot in Google Maps and click the coordinates to copy them.', 'اضغط بزر الماوس الأيمن على المكان في Google Maps ثم اضغط على الإحداثيات لنسخها.')}</small>
          </label>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Latitude', 'خط العرض')}</span>
              <input type="number" step="any" min={21} max={32.5} value={draft.lat} onChange={(e) => set('lat', e.target.value)} dir="ltr" />
            </label>
            <label>
              <span>{tx('Longitude', 'خط الطول')}</span>
              <input type="number" step="any" min={24} max={37.5} value={draft.lng} onChange={(e) => set('lng', e.target.value)} dir="ltr" />
            </label>
          </div>
        </section>

        <section className="part-form-section">
          <h3>{tx('Plugs', 'الفيش')}</h3>
          {draft.connections.map((connection) => (
            <div className="panel-form-grid" key={connection.key}>
              <label>
                <span>{tx('Type', 'النوع')}</span>
                <select value={connection.type} onChange={(e) => setConnection(connection.key, { type: e.target.value as StationConnector })}>
                  {STATION_CONNECTORS.map((type) => (
                    <option key={type} value={type}>
                      {t(STATION_CONNECTOR_LABELS[type])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{tx('Power (kW)', 'القدرة (كيلووات)')}</span>
                <input type="number" step="any" min={0} max={1000} value={connection.powerKw} onChange={(e) => setConnection(connection.key, { powerKw: e.target.value })} dir="ltr" />
              </label>
              <label>
                <span>{tx('How many', 'العدد')}</span>
                <span className="panel-row-actions">
                  <input type="number" step={1} min={1} max={100} value={connection.count} onChange={(e) => setConnection(connection.key, { count: e.target.value })} dir="ltr" />
                  <button
                    type="button"
                    className="panel-icon-button danger"
                    onClick={() => set('connections', draft.connections.filter((other) => other.key !== connection.key))}
                    aria-label={tx('Remove plug', 'احذف الفيشة')}
                    title={tx('Remove plug', 'احذف الفيشة')}
                  >
                    <X size={14} />
                  </button>
                </span>
              </label>
            </div>
          ))}
          <button
            type="button"
            className="panel-button small"
            onClick={() => set('connections', [...draft.connections, { key: localKey(), type: 'gbt-dc', powerKw: '', count: '' }])}
          >
            <Plus size={14} aria-hidden="true" /> {tx('Add plug', 'أضف فيشة')}
          </button>
        </section>

        <section className="part-form-section">
          <h3>{tx('Price and access', 'السعر والدخول')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Price per kWh (EGP)', 'السعر لكل كيلووات ساعة (جنيه)')}</span>
              <input type="number" step="any" min={0} max={1000} value={draft.pricePerKwh} onChange={(e) => set('pricePerKwh', e.target.value)} dir="ltr" />
            </label>
            <label>
              <span>{tx('Price note', 'ملاحظة السعر')}</span>
              <input value={draft.priceNote} onChange={(e) => set('priceNote', e.target.value)} maxLength={300} placeholder={tx('e.g. free for hotel guests', 'مثل: مجانا لنزلاء الفندق')} />
            </label>
            <label>
              <span>{tx('Hours', 'المواعيد')}</span>
              <input value={draft.hours} onChange={(e) => set('hours', e.target.value)} maxLength={300} placeholder="24/7" />
            </label>
            <label>
              <span>{tx('Phone', 'الهاتف')}</span>
              <input value={draft.phone} onChange={(e) => set('phone', e.target.value)} maxLength={32} dir="ltr" inputMode="tel" />
            </label>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={draft.operational} onChange={(e) => set('operational', e.target.checked)} />
            <span>{tx('Working', 'تعمل')}</span>
          </label>
        </section>

        {error && <p className="form-error">{error}</p>}
      </form>
    </Drawer>
  )
}
