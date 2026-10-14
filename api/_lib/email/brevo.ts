/**
 * The one place that talks to Brevo. Its transactional endpoint is a plain
 * HTTPS call, so there is no SDK to bundle into the function.
 *
 * https://developers.brevo.com/reference/sendtransacemail
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export type OutgoingEmail = {
  to: { email: string; name?: string }
  subject: string
  html: string
  text: string
  /** One-click unsubscribe, for anything that is not a direct reply to the reader's own action. */
  unsubscribeUrl?: string
  /** Shown in Brevo's logs, so a send can be traced back to what caused it. */
  tags?: string[]
}

export const emailConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM)

export class BrevoError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'BrevoError'
  }

  /** Brevo answers 402 or 429 once the day's allowance is spent; trying again today will not help. */
  get quotaExhausted(): boolean {
    return this.status === 402 || this.status === 429
  }
}

export async function sendViaBrevo(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) throw new Error('BREVO_API_KEY and EMAIL_FROM must be set to send email.')

  const headers: Record<string, string> = {}
  if (email.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${email.unsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: from, name: process.env.EMAIL_FROM_NAME ?? 'iCAUR V27' },
      ...(process.env.EMAIL_REPLY_TO ? { replyTo: { email: process.env.EMAIL_REPLY_TO } } : {}),
      to: [email.to],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      headers,
      tags: email.tags,
    }),
  })

  if (!response.ok) {
    // Brevo's message names the problem (unverified sender, bad key) and never echoes the key.
    const detail = await response.text().catch(() => '')
    throw new BrevoError(response.status, `Brevo refused the email (${response.status}): ${detail.slice(0, 300)}`)
  }
}
