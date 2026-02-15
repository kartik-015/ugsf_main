/**
 * Security utilities for EvalProX
 * - XSS sanitization
 * - Input validation / NoSQL injection prevention
 * - Rate limiting (in-memory for single-server)
 * - Data encryption helpers
 */

// ─── XSS Sanitization ──────────────────────────────────────────
// Strip HTML tags and dangerous characters from user input
export function sanitizeString(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    // Remove potential JS event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove script tags even if partially encoded
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
}

// Recursively sanitize all string values in an object
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeString(obj)
  if (Array.isArray(obj)) return obj.map(sanitizeObject)
  if (typeof obj === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      // Block MongoDB operator injection ($gt, $ne, $or, etc.)
      if (key.startsWith('$')) continue
      result[sanitizeString(key)] = sanitizeObject(value)
    }
    return result
  }
  return obj
}

// ─── NoSQL Injection Prevention ─────────────────────────────────
// Strip MongoDB operators from query parameters
export function sanitizeQuery(params) {
  if (typeof params !== 'object' || params === null) return params
  const clean = {}
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('$')) continue // Block MongoDB operators
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check for nested operators
      const hasOperator = Object.keys(value).some(k => k.startsWith('$'))
      if (hasOperator) {
        clean[key] = String(value) // Flatten to string
      } else {
        clean[key] = sanitizeQuery(value)
      }
    } else {
      clean[key] = typeof value === 'string' ? sanitizeString(value) : value
    }
  }
  return clean
}

// ─── Rate Limiting (in-memory, per-IP) ──────────────────────────
const rateLimitStore = new Map()
const CLEANUP_INTERVAL = 60_000 // 1 minute

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > entry.windowMs) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Check if a request is rate-limited
 * @param {string} identifier - IP or user identifier
 * @param {object} options - { maxRequests: number, windowMs: number }
 * @returns {{ limited: boolean, remaining: number, retryAfter: number }}
 */
export function checkRateLimit(identifier, options = {}) {
  const { maxRequests = 100, windowMs = 60_000 } = options
  const now = Date.now()
  const key = identifier

  let entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now, windowMs }
    rateLimitStore.set(key, entry)
  }

  entry.count++

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000)
    return { limited: true, remaining: 0, retryAfter }
  }

  return { limited: false, remaining: maxRequests - entry.count, retryAfter: 0 }
}

// ─── API Rate Limiter Wrapper ───────────────────────────────────
export function withRateLimit(handler, options = {}) {
  const { maxRequests = 60, windowMs = 60_000 } = options

  return async function(request, ...rest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const { limited, remaining, retryAfter } = checkRateLimit(ip, { maxRequests, windowMs })

    if (limited) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const response = await handler(request, ...rest)

    // Add rate limit headers to response
    if (response instanceof Response) {
      const newHeaders = new Headers(response.headers)
      newHeaders.set('X-RateLimit-Limit', String(maxRequests))
      newHeaders.set('X-RateLimit-Remaining', String(remaining))
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    }

    return response
  }
}

// ─── Input Validation Helpers ───────────────────────────────────
export function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(id)
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Security Headers ──────────────────────────────────────────
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

// ─── CSRF Token Helpers ─────────────────────────────────────────
import crypto from 'crypto'

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function verifyCSRFToken(token, storedToken) {
  if (!token || !storedToken) return false
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedToken)
  )
}

// ─── Data Encryption (AES-256-GCM) ─────────────────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'fallback-key-change-in-production-32ch'

function getKey() {
  // Derive a 32-byte key from the secret
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
}

export function encryptData(plaintext) {
  const key = getKey()
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plaintext, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')

  // Return iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptData(encryptedString) {
  try {
    const [ivHex, authTagHex, ciphertext] = encryptedString.split(':')
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')

    return decrypted
  } catch {
    return null // Return null on decryption failure
  }
}
