import { useCallback, useEffect, useState } from 'react'
import { ShoppingBag, X } from 'lucide-react'
import { EmptyState } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import {
  ORDER_STATUS_HINTS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  ORDER_STEPS,
  PAYMENT_LABELS,
  hasUnpriced,
  lineTotal,
} from '../../features/orders/labels'
import { egp, partName, priceOrAsk } from '../../features/parts/labels'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiOrder } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { currentHashRoute, splitRoute } from '../../lib/useHashRoute'

/** The user's sent requests, newest first, with where each one has got to. */
export function MyOrders() {
  const tx = useShortText()
  const [orders, setOrders] = useState<ApiOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A link from the request list (`?id=`) opens the request just sent.
  const [focus] = useState(() => splitRoute(currentHashRoute()).params.get('id'))

  const load = useCallback(() => {
    api
      .myOrders()
      .then(({ orders: list }) => {
        setOrders(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx])

  useEffect(load, [load])

  if (error) return <p className="form-error">{error}</p>
  if (orders === null) return <p className="panel-muted">{tx('Loading…', 'جارٍ التحميل…')}</p>

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={tx('No requests yet', 'لا توجد طلبات بعد')}
        text={tx('Add accessories to your request list and send it; it will show up here.', 'أضف إكسسوارات إلى قائمة طلبك وأرسلها؛ ستظهر هنا.')}
        action={
          <a className="panel-button primary" href="#/accessories">
            {tx('Browse accessories', 'تصفح الإكسسوارات')}
          </a>
        }
      />
    )
  }

  return (
    <div className="order-list">
      {focus && orders.some((order) => order.id === focus && order.status === 'new') && (
        <p className="panel-callout order-sent">
          {tx('Request sent. We will call you to confirm the price.', 'تم إرسال الطلب. سنتصل بك لتأكيد السعر.')}
        </p>
      )}
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} startOpen={order.id === focus || orders.length === 1} onChanged={load} />
      ))}
    </div>
  )
}

function OrderCard({ order, startOpen, onChanged }: { order: ApiOrder; startOpen: boolean; onChanged: () => void }) {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [open, setOpen] = useState(startOpen)
  const [busy, setBusy] = useState(false)
  const step = ORDER_STEPS.indexOf(order.status)
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0)

  async function cancel() {
    const ok = await confirm({
      title: tx(`Cancel request ${order.number}?`, `إلغاء الطلب ${order.number}؟`),
      message: tx('Nobody has started on it yet, so nothing is lost.', 'لم يبدأ أحد في تنفيذه بعد، فلن يضيع شيء.'),
      confirmLabel: tx('Cancel request', 'ألغِ الطلب'),
      tone: 'danger',
    })
    if (!ok) return

    setBusy(true)
    try {
      await api.cancelOrder(order.id)
      toast(tx('Request cancelled.', 'تم إلغاء الطلب.'))
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not cancel.', 'تعذر الإلغاء.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel-card order-card">
      <button type="button" className="order-card-head" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="panel-cell-main">
          <strong dir="ltr">{order.number}</strong>
          <small>
            {formatDate(order.createdAt, language)} · {tx(`${units} item(s)`, `${units} قطعة`)}
          </small>
        </span>
        <span className="order-card-total" dir="ltr">
          {egp.format(order.finalTotalEgp ?? order.estimatedTotalEgp)}
        </span>
        <span className={`badge ${ORDER_STATUS_TONE[order.status]}`}>{t(ORDER_STATUS_LABELS[order.status])}</span>
      </button>

      {open && (
        <div className="order-card-body">
          {order.status !== 'cancelled' && (
            <ol className="order-steps" aria-label={tx('Progress', 'التقدم')}>
              {ORDER_STEPS.map((status, index) => (
                <li key={status} className={index < step ? 'done' : index === step ? 'current' : undefined}>
                  {t(ORDER_STATUS_LABELS[status])}
                </li>
              ))}
            </ol>
          )}
          <p className="panel-muted">{t(ORDER_STATUS_HINTS[order.status])}</p>

          <table className="order-items">
            <tbody>
              {order.items.map((item) => (
                <tr key={item.partId}>
                  <td>
                    <a href={`#/accessories/${item.slug}`}>{partName(item, language)}</a>
                    <small>
                      × {item.quantity}
                      {item.fitting ? ` · ${tx('fitted', 'مع التركيب')}` : ''}
                      {item.note ? ` · ${item.note}` : ''}
                    </small>
                  </td>
                  <td dir="ltr">{priceOrAsk(lineTotal(item), tx)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{order.finalTotalEgp !== undefined ? tx('Agreed total', 'الإجمالي المتفق عليه') : tx('Estimate', 'التقدير')}</th>
                <td dir="ltr">{egp.format(order.finalTotalEgp ?? order.estimatedTotalEgp)}</td>
              </tr>
            </tfoot>
          </table>
          {order.finalTotalEgp === undefined && hasUnpriced(order) && (
            <p className="panel-muted">
              {tx('Items or fitting without a listed price are priced when we confirm.', 'القطع أو التركيب بلا سعر مدرج تُسعّر عند التأكيد.')}
            </p>
          )}
          <p className="panel-muted">
            {tx('Payment', 'الدفع')}: {t(PAYMENT_LABELS[order.payment.status])}
            {order.payment.amountEgp !== undefined ? ` · ${egp.format(order.payment.amountEgp)}` : ''}
          </p>

          <ol className="order-history">
            {[...order.history].reverse().map((event, index) => (
              <li key={`${event.at}-${index}`}>
                <strong>{t(ORDER_STATUS_LABELS[event.status])}</strong>
                <time dateTime={event.at}>{formatDate(event.at, language, true)}</time>
                {event.note && <p>{event.note}</p>}
              </li>
            ))}
          </ol>

          {order.status === 'new' && (
            <button type="button" className="panel-button danger-soft small" onClick={cancel} disabled={busy}>
              <X size={14} aria-hidden="true" /> {tx('Cancel request', 'ألغِ الطلب')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
