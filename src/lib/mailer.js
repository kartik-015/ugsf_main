import nodemailer from 'nodemailer'

// ─── Gmail via App Password (best for Vercel — sends to ANY email) ─────────
function createGmailTransport() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',          // nodemailer's built-in Gmail preset
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD, // 16-char App Password, NOT your normal password
    },
  })
}

// ─── Generic SMTP fallback (e.g. Zoho, Brevo, local) ─────────────────────────
function createSmtpTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

// ─── Unified send ─────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, text, html }) {
  // 1. Gmail App Password (primary for Vercel production)
  const gmailTransport = createGmailTransport()
  if (gmailTransport) {
    try {
      const from = process.env.MAIL_FROM || `EvalProX <${process.env.GMAIL_USER}>`
      const info = await gmailTransport.sendMail({ from, to, subject, text, html })
      console.log(`[GMAIL SUCCESS] Sent to ${to}: ${subject}`)
      return { success: true, id: info.messageId }
    } catch (e) {
      console.error('[GMAIL ERROR]', e.message)
      // Fall through to SMTP
    }
  }

  // 2. Generic SMTP fallback
  const smtpTransport = createSmtpTransport()
  if (smtpTransport) {
    try {
      const from = process.env.MAIL_FROM || process.env.SMTP_USER
      const info = await smtpTransport.sendMail({ from, to, subject, text, html })
      console.log(`[SMTP SUCCESS] Sent to ${to}: ${subject}`)
      return { success: true, id: info.messageId }
    } catch (e) {
      console.error('[SMTP ERROR]', e.message)
      return { success: false, error: e.message }
    }
  }

  // 3. Nothing configured
  console.warn('[MAIL NOT CONFIGURED] Add GMAIL_USER + GMAIL_APP_PASSWORD in Vercel env vars.')
  console.log(`[MAIL MOCK] To: ${to} | Subject: ${subject} | Body: ${text || html}`)
  return { success: false, mocked: true, error: 'No email provider configured' }
}

export function emailProviderConfigured() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  return !!(
    (GMAIL_USER && GMAIL_APP_PASSWORD) ||
    (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)
  )
}
