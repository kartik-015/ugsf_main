import crypto from 'crypto'

export function generateOTP(length = 6) {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) otp += digits[Math.floor(Math.random() * 10)]
  return otp
}

export function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export function createOTPRecord(ttlMinutes = 10) {
  const otp = generateOTP()
  const hash = hashOTP(otp)
  const expires = Date.now() + ttlMinutes * 60 * 1000
  return { otp, hash, expires }
}
