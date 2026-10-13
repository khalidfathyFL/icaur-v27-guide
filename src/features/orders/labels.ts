import type { Localized } from '../../content/types'
import type { ApiCartLine, ApiOrder, OrderStatus, PaymentStatus } from '../../lib/api'

/** Wording shared by the request list, My orders and the admin screen. */

export const ORDER_STATUS_LABELS: Record<OrderStatus, Localized> = {
  new: { en: 'Sent', ar: 'تم الإرسال' },
  confirmed: { en: 'Confirmed', ar: 'تم التأكيد' },
  ordered: { en: 'Ordered', ar: 'تم الطلب' },
  arrived: { en: 'Arrived', ar: 'وصل' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
}

/** What each status means to the customer waiting on it. */
export const ORDER_STATUS_HINTS: Record<OrderStatus, Localized> = {
  new: { en: 'We have your request and will call you to confirm the price.', ar: 'وصلنا طلبك وسنتصل بك لتأكيد السعر.' },
  confirmed: { en: 'Price and details agreed. We are placing the order.', ar: 'تم الاتفاق على السعر والتفاصيل. جارٍ تنفيذ الطلب.' },
  ordered: { en: 'Ordered from the supplier. Waiting for it to arrive.', ar: 'تم الطلب من المورد. في انتظار الوصول.' },
  arrived: { en: 'It has arrived. We will arrange delivery or fitting with you.', ar: 'وصل الطلب. سنرتب معك التسليم أو التركيب.' },
  delivered: { en: 'Delivered. Enjoy it, and review it if you can.', ar: 'تم التسليم. استمتع به، وقيّمه إن استطعت.' },
  cancelled: { en: 'This request was cancelled.', ar: 'تم إلغاء هذا الطلب.' },
}

/** The order statuses move through, for the progress bar. */
export const ORDER_STEPS: OrderStatus[] = ['new', 'confirmed', 'ordered', 'arrived', 'delivered']

/** Badge tone for the existing `.badge` styles. */
export const ORDER_STATUS_TONE: Record<OrderStatus, 'ok' | 'verify' | 'no' | 'export' | 'likely'> = {
  new: 'verify',
  confirmed: 'export',
  ordered: 'likely',
  arrived: 'export',
  delivered: 'ok',
  cancelled: 'no',
}

export const PAYMENT_LABELS: Record<PaymentStatus, Localized> = {
  unpaid: { en: 'Not paid', ar: 'غير مدفوع' },
  deposit: { en: 'Deposit paid', ar: 'تم دفع عربون' },
  paid: { en: 'Paid', ar: 'مدفوع' },
}

/**
 * Item, shipping and customs for every unit, plus fitting once per line when
 * asked for. Null when the accessory has no price yet.
 */
export function lineTotal(line: {
  quantity: number
  fitting: boolean
  unitPriceEgp?: number | null
  installEgp?: number
}): number | null {
  if (line.unitPriceEgp === undefined || line.unitPriceEgp === null) return null
  return line.unitPriceEgp * line.quantity + (line.fitting ? (line.installEgp ?? 0) : 0)
}

export function cartEstimate(lines: ApiCartLine[]): number {
  return lines.reduce(
    (sum, line) =>
      line.part
        ? sum + (lineTotal({ ...line, unitPriceEgp: line.part.unitPriceEgp, installEgp: line.part.installEgp }) ?? 0)
        : sum,
    0,
  )
}

/** Something on the request has no price yet: an item, or fitting that was asked for. */
export const hasUnpriced = (order: Pick<ApiOrder, 'items'>) =>
  order.items.some((item) => item.unitPriceEgp === undefined || (item.fitting && item.installEgp === undefined))

/** The same, for the request list before it is sent. */
export const cartHasUnpriced = (lines: ApiCartLine[]) =>
  lines.some(
    (line) => line.part && (line.part.unitPriceEgp === null || (line.fitting && line.part.installEgp === undefined)),
  )
