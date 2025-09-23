import nodemailer from 'nodemailer'

let cachedTransport = null

function getTransport() {
  if (cachedTransport) return cachedTransport
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    cachedTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    })
  }
  return cachedTransport
}

export async function sendEmail({ to, subject, text, html }) {
  const transport = getTransport()
  if (!transport) {
    console.log('[MAIL MOCK - SMTP not configured] To:', to, 'Subject:', subject, '\n', text || html)
    return { success: true, mocked: true }
  }
  try {
    const info = await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    })
    console.log(`[EMAIL SUCCESS] Sent to ${to}: ${subject}`)
    return { success: true, id: info.messageId }
  } catch (e) {
    console.error('Email send failed:', e)
    // Fallback: log OTP for development when email fails
    if (subject.includes('OTP') || text?.includes('verification')) {
      console.log(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`)
      console.log(`[EMAIL FALLBACK] Content: ${text || html}`)
      return { success: true, fallback: true, error: e.message }
    }
    return { success: false, error: e.message }
  }
}

export function smtpConfigured() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  return !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)
}
