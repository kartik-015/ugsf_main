// Generic request validation helper
// Usage: wrap async route handler and pass array of checks
// Each check: { validate: () => boolean|Promise<boolean>, message: string, status?: number }
// If validate throws, it's caught and returned as 400 unless status provided
export function withValidation(handler, checks = []) {
  return async function(request, ...rest) {
    for (const check of checks) {
      try {
        const ok = await check.validate()
        if(!ok) {
          return new Response(JSON.stringify({ ok:false, error:{ code:'BAD_REQUEST', message:check.message } }), { status: check.status || 400, headers:{ 'Content-Type':'application/json' } })
        }
      } catch (err) {
        return new Response(JSON.stringify({ ok:false, error:{ code:'BAD_REQUEST', message: check.message || err.message } }), { status: check.status || 400, headers:{ 'Content-Type':'application/json' } })
      }
    }
    return handler(request, ...rest)
  }
}

// Convenience validator creators
export const requireBodyField = (body, field, label = field) => ({
  validate: () => {
    const v = body[field]
    return v !== undefined && v !== null && String(v).trim() !== ''
  },
  message: `${label} is required`
})