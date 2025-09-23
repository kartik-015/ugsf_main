# Validation & OTP Flow Documentation

Comprehensive overview of input validation (server + client) and the email OTP verification pipeline used during user registration.

---
## 1. Server-Side Validation (`src/lib/validation.js`)

Implemented Rules:
- **Name**: `/^[A-Za-z][A-Za-z\s'.-]{0,98}[A-Za-z]$/` (2–100 chars, letters + space/apostrophe/period/hyphen, must start & end with a letter)
- **Phone (+91)**: `/^\+91[1-9]\d{9}$/` (must begin with +91, total 13 chars incl. plus, first digit after +91 non‑zero)
- **Roll Number**: `/^\d{2}[A-Z]{2,3}\d{3}$/` examples: `23CSE001`, `23IT002`, `23DIT010`
- **Student Email** format: `yydeprol@charusat.edu.in`
  - `yy` → last two digits of admission year (expanded to four digits)
  - `dep` → department code (validated against accepted list)
  - `rol` → 3+ digit or alphanumeric roll segment (normalized uppercase)
- **Semicolon Lists**: Multi-value inputs must use `;` as delimiter; empty tokens rejected.
- **Word Limit**: Project / description fields capped at 200 words (server double-check + client counter).

Derived Student Fields (auto-populated & immutable via Mongoose pre-save for role=student):
- `admissionYear`
- `department`
- `institute`
- `academicInfo.rollNumber`

Utility Exports:
- `validateName(name)`
- `validatePhone(phone)`
- `parseStudentEmail(email)` → `{ admissionYear, department, institute, rollNumber } | null`
- `validateSemicolonList(str)` → `{ ok: boolean, values?: string[], error?: string }`
- `enforceWordLimit(text, maxWords)` (truncates / reports if over limit)

Usage Example:
```js
import { validateName, validatePhone, parseStudentEmail } from '@/lib/validation'
if (!validateName(input.name)) return bad('Invalid name')
if (!validatePhone(input.phone)) return bad('Invalid phone number')
const parsed = parseStudentEmail(input.email)
if (!parsed) return bad('Invalid student email format')
```

---
## 2. Client Runtime Validation (`src/lib/clientValidation.js`)
Mirrors server regex for instant feedback:
- Live name & phone indicators (success/error state as user types)
- Student email parsing & dynamic badge showing derived year/department/roll
- Password strength meter (length, digits, symbols, casing variety)
- Semicolon list helper (splits, trims, flags duplicates/empties)
- Word count badge + disable submit when > 200 words

Prevents unnecessary round trips while keeping server authoritative.

---
## 3. Semicolon Multi-Value Rule
Any user-entered multi-select style field (interests, teammate emails, domains) must be separated strictly with `;`.
Examples:
```
good: web;mobile;ai
bad: web, mobile, ai   # comma separated
bad: web|mobile        # pipe separated
```
Server returns 400 if pattern not respected.

---
## 4. OTP Email Verification Flow

Goal: Confirm email ownership before granting full platform capabilities.

### Lifecycle
1. **Register** (`POST /api/auth/register`)
	- Create user with `isEmailVerified=false`
	- Generate OTP (numeric, default length 6) via `createOTPRecord()` → `{ otp, hash, expires }` (10‑minute TTL)
	- Store `hash` in `emailVerificationOTP`, set `emailVerificationExpires`
	- Initialize counters: `emailVerificationResendCount=0`, `emailVerificationAttemptCount=0`, set `emailVerificationLastSent`
	- Send email (SMTP transport or console mock if not configured)
2. **Verify** (`POST /api/auth/verify-email`)
	- Checks required fields, expiry, lockout state
	- Hashes provided OTP with `hashOTP()` & compares
	- On success: sets `isEmailVerified=true`, clears OTP fields & resets attempt counter
3. **Resend** (`POST /api/auth/resend-otp`)
	- Silently returns success if user doesn’t exist (avoid enumeration)
	- Enforces cooldown: 60s (`COOLDOWN_MS`)
	- Enforces max resends: 5 (`MAX_RESENDS`)
	- Generates and stores new OTP hash + expiry, increments `emailVerificationResendCount`
4. **Lockout** (Verify endpoint)
	- `MAX_ATTEMPTS=5` invalid attempts allowed within 10‑minute window (`LOCK_MINUTES`)
	- After 5 invalid attempts, returns 429 until window passes or new OTP issued

### Stored Fields (User Schema)
| Field | Purpose |
|-------|---------|
| `isEmailVerified` | Final verified flag |
| `emailVerificationOTP` | SHA-256 hash of OTP |
| `emailVerificationExpires` | Expiration Date of OTP |
| `emailVerificationResendCount` | Count of resend requests |
| `emailVerificationLastSent` | Timestamp for cooldown & lock window base |
| `emailVerificationAttemptCount` | Invalid verification attempts |

### Security
- Hash-only storage (no plaintext OTP persistence)
- Cooldown + max resend reduce spam & enumeration risk
- Attempt lockout throttles brute force guessing
- Non-disclosing responses on resend for nonexistent users

---
## 5. Environment Variables
Add to `.env.local` (keep secrets out of version control):
```
# Mongo
MONGODB_URI=mongodb://127.0.0.1:27017/student-portal

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate_random_hex>

# SMTP (optional; enables real email sending)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_SECURE=false          # true if using port 465
MAIL_FROM="Portal <no-reply@example.com>"
```
Generate a secret:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

When SMTP vars are absent, mailer falls back to console mock: `[MAIL MOCK - SMTP not configured]`.

---
## 6. Policy Constants & Adjustments
| Location | Constant | Meaning |
|----------|----------|---------|
| `src/app/api/auth/resend-otp/route.js` | `COOLDOWN_MS` | Milliseconds before another resend allowed |
| same | `MAX_RESENDS` | Max resend requests per user (unless code changed) |
| `src/app/api/auth/verify-email/route.js` | `MAX_ATTEMPTS` | Invalid verify attempts before lockout |
| same | `LOCK_MINUTES` | Lock window duration |
| `src/lib/otp.js` | TTL in `createOTPRecord(ttlMinutes)` | OTP expiry minutes |

---
## 7. Failure Mode Reference
| Scenario | Status | Body (example) |
|----------|--------|----------------|
| Missing email/otp (verify) | 400 | `{ error: 'Email and OTP required' }` |
| User not found (verify) | 404 | `{ error: 'User not found' }` |
| OTP not generated | 400 | `{ error: 'OTP not generated' }` |
| OTP expired | 400 | `{ error: 'OTP expired' }` |
| Too many attempts | 429 | `{ error: 'Too many attempts. Please request a new OTP or wait.' }` |
| Invalid OTP | 400 | `{ error: 'Invalid OTP' }` |
| Resend cooldown | 429 | `{ error: 'Cooldown active', retryIn: <ms> }` |
| Max resends | 429 | `{ error: 'Max resends reached' }` |

---
## 8. Testing Strategy (Planned)
1. `hashOTP` deterministic outputs
2. Happy path: register → verify success
3. Expired OTP: manually set `emailVerificationExpires` to past
4. Invalid OTP attempts accumulate, lockout at 5 (status 429)
5. Resend cooldown enforced (second call <60s returns 429)
6. Max resend threshold returns 429

---
## 9. Developer Tips
- Use `/api/health` to confirm DB + SMTP readiness
- Prefer `127.0.0.1` over `localhost` on Windows to avoid IPv6 binding quirks
- Keep OTP & auth tests isolated—use a separate test DB or in-memory server
- After adjusting constants, update tests to lock expected behaviors

---
## 10. Recent Related Endpoints
- `GET /api/projects/summary` — Guide allocation summary
- `GET /api/projects/group-details?groupId=...` — Group/member detail
- `POST /api/auth/resend-otp` — OTP resend with cooldown
- `POST /api/auth/verify-email` — OTP validation & lockout

---
## 11. Changelog
- v1.1 (2025-09-23): Expanded with OTP flow, env vars, policies, failure matrix
- v1.0 (earlier): Initial validation rules

