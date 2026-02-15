import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHS = ['/', '/register', '/api/auth', '/favicon.ico']

// In-memory rate limiting for middleware (per IP)
const rateLimitMap = new Map<string, { count: number; start: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 200 // max requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now })
    return false
  }
  entry.count++
  if (entry.count > RATE_LIMIT_MAX) return true
  return false
}

// Cleanup stale entries every 2 minutes
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    rateLimitMap.forEach((v, k) => {
      if (now - v.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(k)
    })
  }
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 120_000)
  }
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const { pathname } = url

  // Rate limiting check
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.ip
    || 'unknown'

  if (isRateLimited(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    )
  }

  // Block suspicious query patterns (NoSQL injection attempts)
  const searchStr = url.search
  if (searchStr && /\$[a-zA-Z]+/.test(searchStr)) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Allow public (exact or prefix for auth routes)
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not logged in: block protected
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const isOnboarded = token.isOnboarded
  // Cookie-based fast path (covers immediate post-onboarding before JWT refresh)
  let cookieOnboardedMatches = false
  try {
    const c = req.cookies.get('onboarded')?.value
    if (c && token?.sub && c === token.sub) cookieOnboardedMatches = true
  } catch {}
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  // If not onboarded, force /onboarding (allow its APIs)
  if (!isOnboarded && !cookieOnboardedMatches) {
    if (!isOnboardingRoute && !pathname.startsWith('/api/onboarding') && !pathname.startsWith('/api/user/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  } else {
    // If onboarded and tries to access root or onboarding -> send to dashboard
    if (pathname === '/' || isOnboardingRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  const response = NextResponse.next()

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|images|assets|favicon.ico).*)'
  ]
}