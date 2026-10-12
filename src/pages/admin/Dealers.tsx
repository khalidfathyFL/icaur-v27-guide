import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { EmptyState } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiDealer } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'

/** `null` while closed; `'new'` for the add form, or the dealer being edited. */
type Editing = null | 'new' | ApiDealer

export function Dealers() {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [dealers, setDealers] = useState<ApiDealer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const load = useCallback(() => {
    api
      .listDealers()
      .then(({ dealers: list }) => {
        setDealers(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx])

  useEffect(load, [load])

  async function remove(dealer: ApiDealer) {
    const ok = await confirm({
      title: tx(`Remove ${dealer.name}?`, `إزالة ${dealer.name}؟`),
      message: tx('It will no longer be listed on the Egypt page.', 'لن يظهر بعد الآن في صفحة مصر.'),
      confirmLabel: tx('Remove', 'إزالة'),
      tone: 'danger',
    })
    if (!ok) return

    try {
      await api.removeDealer(dealer.id)
      toast(tx('Dealer removed.', 'تمت إزالة الوكيل.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذر الحذف.')), 'error')
    }
  }

  const addButton = (
    <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
      <Plus size={16} aria-hidden="true" /> {tx('Add dealer', 'أضف وكيلا')}
    </button>
  )

  return (
    <>
      <DataTable
        rows={dealers}
        rowKey={(dealer) => dealer.id}
        error={error}
        searchText={(dealer) => `${dealer.name} ${dealer.area} ${dealer.phone ?? ''}`}
        searchPlaceholder={tx('Search name, area or phone…', 'ابحث بالاسم أو المنطقة أو الهاتف…')}
        actions={addButton}
        onRowClick={(dealer) => setEditing(dealer)}
        empty={
          <EmptyState
            icon={Store}
            title={tx('No dealers yet', 'لا يوجد وكلاء بعد')}
            text={tx('Add the first dealer and it will appear on the Egypt page.', 'أضف أول وكيل وسيظهر في صفحة مصر.')}
            action={addButton}
          />
        }
        columns={[
          {
            key: 'name',
            header: tx('Dealer', 'الوكيل'),
            width: 'minmax(0, 2fr)',
            render: (dealer) => (
              <span className="panel-cell-main">
                <strong>{dealer.name}</strong>
                <small>{dealer.area}</small>
              </span>
            ),
          },
          {
            key: 'phone',
            header: tx('Phone', 'الهاتف'),
            width: 'minmax(0, 1fr)',
            render: (dealer) => <span dir="ltr">{dealer.phone || '—'}</span>,
          },
          {
            key: 'price',
            header: tx('Pricing', 'التسعير'),
            width: '150px',
            render: (dealer) =>
              dealer.sellsAtListPrice ? (
                <span className="badge ok">{tx('List price', 'السعر الرسمي')}</span>
              ) : (
                <span className="badge verify">{tx('Own price', 'سعر خاص')}</span>
              ),
          },
          {
            key: 'verified',
            header: tx('Verified', 'تم التحقق'),
            width: '130px',
            render: (dealer) => <span className="panel-muted">{formatDate(dealer.verifiedAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (dealer) => (
              <span className="panel-row-actions">
                <button
                  type="button"
                  className="panel-icon-button"
                  onClick={() => setEditing(dealer)}
                  aria-label={tx('Edit', 'تعديل')}
                  title={tx('Edit', 'تعديل')}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="panel-icon-button danger"
                  onClick={() => remove(dealer)}
                  aria-label={tx('Remove', 'حذف')}
                  title={tx('Remove', 'حذف')}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <DealerForm
          key={editing === 'new' ? 'new' : editing.id}
          dealer={editing === 'new' ? null : editing}
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

function DealerForm({ dealer, onClose, onSaved }: { dealer: ApiDealer | null; onClose: () => void; onSaved: () => void }) {
  const tx = useShortText()
  const toast = useToast()
  const [name, setName] = useState(dealer?.name ?? '')
  const [area, setArea] = useState(dealer?.area ?? '')
  const [phone, setPhone] = useState(dealer?.phone ?? '')
  const [notes, setNotes] = useState(dealer?.notes ?? '')
  const [listPrice, setListPrice] = useState(dealer?.sellsAtListPrice ?? true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const input = { name, area, phone: phone || undefined, notes: notes || undefined, sellsAtListPrice: listPrice }
    try {
      if (dealer) await api.updateDealer(dealer.id, input)
      else await api.createDealer(input)
      toast(dealer ? tx('Dealer updated.', 'تم تحديث الوكيل.') : tx('Dealer added.', 'تمت إضافة الوكيل.'))
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
      busy={busy}
      title={dealer ? tx('Edit dealer', 'تعديل الوكيل') : tx('Add dealer', 'أضف وكيلا')}
      subtitle={dealer?.name}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions">
          <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
            {tx('Cancel', 'إلغاء')}
          </button>
          <button type="submit" form="dealer-form" className="panel-button primary" disabled={busy}>
            {busy ? tx('Saving…', 'جارٍ الحفظ…') : dealer ? tx('Save changes', 'احفظ التغييرات') : tx('Add dealer', 'أضف وكيلا')}
          </button>
        </div>
      }
    >
      <form id="dealer-form" className="auth-form wide panel-form" onSubmit={onSubmit}>
        <label>
          <span>{tx('Dealer name', 'اسم الوكيل')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={160} autoFocus />
        </label>
        <label>
          <span>{tx('Area', 'المنطقة')}</span>
          <input value={area} onChange={(e) => setArea(e.target.value)} required minLength={2} maxLength={160} />
        </label>
        <label>
          <span>{tx('Phone', 'الهاتف')}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={60} dir="ltr" />
        </label>
        <label>
          <span>{tx('Notes', 'ملاحظات')}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={listPrice} onChange={(e) => setListPrice(e.target.checked)} />
          <span>{tx('Sells at official list price', 'يبيع بالسعر الرسمي')}</span>
        </label>
        {error && <p className="form-error">{error}</p>}
      </form>
    </Drawer>
  )
}
