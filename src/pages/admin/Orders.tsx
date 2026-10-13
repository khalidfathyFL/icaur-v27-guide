import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MessageCircle, Phone, ShoppingBag } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { DetailList, EmptyState, FilterSelect } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_LABELS,
  hasUnpriced,
  lineTotal,
} from '../../features/orders/labels'
import { SOURCE_LABELS, egp, partName, priceOrAsk, whatsappLink } from '../../features/parts/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiOrder, type OrderStatus, type PaymentStatus } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { useOpenRecord } from './useOpenRecord'

type Filter = OrderStatus | 'open' | 'all'

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
const PAYMENTS = Object.keys(PAYMENT_LABELS) as PaymentStatus[]

/** Accessory requests from users, for whoever orders and delivers them. */
export function Orders({ params, onChanged }: { params: URLSearchParams; onChanged: () => void }) {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const record = useOpenRecord('/admin/orders', params)
  const [filter, setFilter] = useState<Filter>(record.openId ? 'all' : 'open')
  const [orders, setOrders] = useState<ApiOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .orderQueue(filter)
      .then(({ orders: list }) => {
        setOrders(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [filter, tx])

  useEffect(load, [load])

  const selected = orders?.find((order) => order.id === record.openId) ?? null

  return (
    <>
      <DataTable
        rows={orders}
        rowKey={(order) => order.id}
        error={error}
        searchText={(order) =>
          `${order.number} ${order.contact.name} ${order.contact.phone} ${order.contact.city} ${order.userEmail ?? ''} ${order.items.map((item) => `${item.name.en} ${item.name.ar}`).join(' ')}`
        }
        searchPlaceholder={tx('Search number, name, phone or accessory…', 'ابحث بالرقم أو الاسم أو الهاتف أو الإكسسوار…')}
        filters={
          <FilterSelect<Filter>
            label={tx('Show', 'عرض')}
            value={filter}
            onChange={(next) => {
              setOrders(null)
              setFilter(next)
            }}
            options={[
              { value: 'open', label: tx('Still open', 'المفتوحة') },
              ...STATUSES.map((status) => ({ value: status, label: t(ORDER_STATUS_LABELS[status]) })),
              { value: 'all', label: tx('Everything', 'الكل') },
            ]}
          />
        }
        onRowClick={(order) => record.open(order.id)}
        empty={
          <EmptyState
            icon={ShoppingBag}
            title={filter === 'open' ? tx('No open requests', 'لا توجد طلبات مفتوحة') : tx('Nothing here', 'لا يوجد شيء')}
            text={tx('Requests users send from their request list show up here.', 'الطلبات التي يرسلها المستخدمون تظهر هنا.')}
          />
        }
        columns={[
          {
            key: 'number',
            header: tx('Request', 'الطلب'),
            width: 'minmax(0, 2fr)',
            render: (order) => (
              <span className="panel-cell-main">
                <strong>
                  <span dir="ltr">{order.number}</span> · {order.contact.name}
                </strong>
                <small>
                  {order.contact.city} · {tx(`${order.items.length} line(s)`, `${order.items.length} بند`)}
                </small>
              </span>
            ),
          },
          {
            key: 'total',
            header: tx('Total', 'الإجمالي'),
            width: '130px',
            render: (order) => (
              <span dir="ltr" title={order.finalTotalEgp === undefined ? tx('Estimate', 'تقدير') : tx('Agreed', 'متفق عليه')}>
                {order.finalTotalEgp === undefined ? '≈ ' : ''}
                {egp.format(order.finalTotalEgp ?? order.estimatedTotalEgp)}
              </span>
            ),
          },
          {
            key: 'payment',
            header: tx('Payment', 'الدفع'),
            width: '120px',
            render: (order) => <span className="panel-muted">{t(PAYMENT_LABELS[order.payment.status])}</span>,
          },
          {
            key: 'status',
            header: tx('Status', 'الحالة'),
            width: '120px',
            render: (order) => <span className={`badge ${ORDER_STATUS_TONE[order.status]}`}>{t(ORDER_STATUS_LABELS[order.status])}</span>,
          },
          {
            key: 'date',
            header: tx('Sent', 'أُرسل'),
            width: '120px',
            render: (order) => <span className="panel-muted">{formatDate(order.createdAt, language)}</span>,
          },
        ]}
      />

      {selected && (
        <OrderDrawer
          key={`${selected.id}-${selected.updatedAt}`}
          order={selected}
          onClose={record.close}
          onSaved={() => {
            load()
            onChanged()
          }}
        />
      )}
    </>
  )
}

function OrderDrawer({ order, onClose, onSaved }: { order: ApiOrder; onClose: () => void; onSaved: () => void }) {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [statusNote, setStatusNote] = useState('')
  const [payment, setPayment] = useState<PaymentStatus>(order.payment.status)
  const [paid, setPaid] = useState(order.payment.amountEgp === undefined ? '' : String(order.payment.amountEgp))
  const [paymentNote, setPaymentNote] = useState(order.payment.note ?? '')
  const [finalTotal, setFinalTotal] = useState(order.finalTotalEgp === undefined ? '' : String(order.finalTotalEgp))
  const [staffNote, setStaffNote] = useState(order.staffNote ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { contact } = order

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.updateOrder(order.id, {
        status,
        statusNote: statusNote.trim() || undefined,
        payment: { status: payment, amountEgp: paid.trim() ? Number(paid) : undefined, note: paymentNote.trim() || undefined },
        finalTotalEgp: finalTotal.trim() ? Number(finalTotal) : null,
        staffNote: staffNote.trim(),
      })
      toast(tx(`${order.number} saved.`, `تم حفظ ${order.number}.`))
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
      title={tx(`Request ${order.number}`, `الطلب ${order.number}`)}
      subtitle={`${contact.name} · ${formatDate(order.createdAt, language, true)}`}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions">
          <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
            {tx('Close', 'إغلاق')}
          </button>
          <button type="submit" form="order-form" className="panel-button primary" disabled={busy}>
            {busy ? tx('Saving…', 'جارٍ الحفظ…') : tx('Save', 'احفظ')}
          </button>
        </div>
      }
    >
      <section className="panel-preview">
        <p className="panel-preview-label">{tx('Customer', 'العميل')}</p>
        <DetailList
          rows={[
            { label: tx('Name', 'الاسم'), value: contact.name },
            {
              label: tx('Phone', 'الهاتف'),
              value: (
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                  <Phone size={13} aria-hidden="true" /> {contact.phone}
                </a>
              ),
            },
            {
              label: 'WhatsApp',
              value: (
                <a href={whatsappLink(contact.whatsapp ?? contact.phone)} target="_blank" rel="noopener noreferrer" dir="ltr">
                  <MessageCircle size={13} aria-hidden="true" /> {contact.whatsapp ?? contact.phone}
                </a>
              ),
            },
            { label: tx('Email', 'البريد'), value: order.userEmail },
            { label: tx('City', 'المدينة'), value: contact.city },
            { label: tx('Address', 'العنوان'), value: contact.address },
            { label: tx('Their note', 'ملاحظته'), value: order.note },
          ]}
        />
      </section>

      <section className="panel-preview">
        <p className="panel-preview-label">{tx('What they want', 'ما يريده')}</p>
        <table className="order-items">
          <tbody>
            {order.items.map((item) => (
              <tr key={item.partId}>
                <td>
                  <a href={`#/accessories/${item.slug}`} target="_blank" rel="noopener noreferrer">
                    {partName(item, language)}
                  </a>
                  <small>
                    × {item.quantity} · {t(SOURCE_LABELS[item.source])}
                    {item.fitting ? ` · ${tx('wants fitting', 'يريد التركيب')}` : ''}
                    {item.fitting && item.installEgp === undefined ? ` (${tx('unpriced', 'غير مسعّر')})` : ''}
                    {item.note ? ` · “${item.note}”` : ''}
                  </small>
                </td>
                <td dir="ltr">
                  {item.unitPriceEgp === undefined ? (
                    <strong>{tx('No price yet', 'بلا سعر بعد')}</strong>
                  ) : (
                    <>
                      {egp.format(item.unitPriceEgp)} × {item.quantity}
                      <br />
                      <strong>{priceOrAsk(lineTotal(item), tx)}</strong>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{tx('Estimate when sent', 'التقدير عند الإرسال')}</th>
              <td dir="ltr">{egp.format(order.estimatedTotalEgp)}</td>
            </tr>
          </tfoot>
        </table>
        {hasUnpriced(order) && (
          <p className="panel-callout">
            {tx(
              'Some items or fitting have no listed price; include them in the agreed total.',
              'بعض القطع أو التركيب بلا سعر مدرج؛ أضفها إلى الإجمالي المتفق عليه.',
            )}
          </p>
        )}
      </section>

      <form id="order-form" className="auth-form wide panel-form part-form" onSubmit={onSubmit}>
        <section className="part-form-section">
          <h3>{tx('Progress', 'التقدم')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Status', 'الحالة')}</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {t(ORDER_STATUS_LABELS[key])}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{tx('Agreed total (EGP)', 'الإجمالي المتفق عليه (جنيه)')}</span>
              <input type="number" min={1} step="any" value={finalTotal} onChange={(e) => setFinalTotal(e.target.value)} dir="ltr" placeholder={String(order.estimatedTotalEgp)} />
              <small>{tx('Shown to the customer instead of the estimate.', 'يظهر للعميل بدلا من التقدير.')}</small>
            </label>
          </div>
          <label>
            <span>{tx('Message to the customer (optional)', 'رسالة للعميل (اختياري)')}</span>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder={tx('e.g. Arrives Thursday; fitting Saturday at 2pm', 'مثلا: يصل الخميس؛ التركيب السبت الساعة 2')}
            />
            <small>{tx('Added to the history the customer sees, with the status.', 'يضاف إلى السجل الذي يراه العميل مع الحالة.')}</small>
          </label>
        </section>

        <section className="part-form-section">
          <h3>{tx('Payment', 'الدفع')}</h3>
          <div className="panel-form-grid">
            <label>
              <span>{tx('Payment', 'الدفع')}</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)}>
                {PAYMENTS.map((key) => (
                  <option key={key} value={key}>
                    {t(PAYMENT_LABELS[key])}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{tx('Amount received (EGP)', 'المبلغ المستلم (جنيه)')}</span>
              <input type="number" min={1} step="any" value={paid} onChange={(e) => setPaid(e.target.value)} dir="ltr" />
            </label>
            <label>
              <span>{tx('How they paid', 'طريقة الدفع')}</span>
              <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} maxLength={300} placeholder={tx('InstaPay, cash on delivery…', 'إنستاباي، نقدا عند الاستلام…')} />
            </label>
          </div>
        </section>

        <section className="part-form-section">
          <h3>{tx('Staff note', 'ملاحظة داخلية')}</h3>
          <label>
            <span>{tx('Only order handlers see this', 'يراها المسؤولون عن الطلبات فقط')}</span>
            <textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)} maxLength={2000} rows={3} placeholder={tx('Supplier, tracking number, cost…', 'المورد، رقم الشحنة، التكلفة…')} />
          </label>
        </section>

        {error && <p className="form-error">{error}</p>}
      </form>

      <section className="panel-preview">
        <p className="panel-preview-label">{tx('History', 'السجل')}</p>
        <ol className="order-history">
          {[...order.history].reverse().map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <strong>{t(ORDER_STATUS_LABELS[event.status])}</strong>
              <time dateTime={event.at}>
                {formatDate(event.at, language, true)} · {event.by}
              </time>
              {event.note && <p>{event.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </Drawer>
  )
}
