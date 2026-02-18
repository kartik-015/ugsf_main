// ================= General Validation Utilities ================= //
// Name: letters, spaces and limited punctuation, 2-100 chars
export const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{0,98}[A-Za-z]$/
// Phone: 10-digit Indian mobile number
export const PHONE_REGEX = /^[6-9]\d{9}$/
// Roll number: optional D prefix + 2 digits (year) + 2-3 letters (dept) + 3 digits sequence (e.g. 23CSE001, 23DIT002, D25DIT079)
export const ROLL_REGEX = /^D?\d{2}[A-Z]{2,3}\d{3}$/i
// Student email pattern: optional 'd' prefix + yy + dep(2/3) + rol(3) @charusat.edu.in
export const STUDENT_EMAIL_REGEX = /^(d?\d{2})([a-zA-Z]{2,3})(\d{3})@charusat\.edu\.in$/i

// Department / Institute resolution maps
const DEPT_MAP = { CS:'CSE', CE:'CE', IT:'IT', ME:'ME', EC:'EC', CIE:'CIVIL', DCS:'CSE', DCE:'CE', DIT:'IT' }

export function parseStudentEmail(email){
  if(!email) return null
  const m = email.trim().match(STUDENT_EMAIL_REGEX)
  if(!m) return null
  const [, yyRaw, depRaw, roll] = m
  const depUpper = depRaw.toUpperCase()
  
  // Determine institute & canonical department
  let institute = 'DEPSTAR'
  let department = DEPT_MAP[depUpper]
  if (!department) {
    return null // Unknown department code
  }
  
  // Handle D-prefix (e.g. d25dit079) - extract year digits only
  const hasPrefix = yyRaw.toLowerCase().startsWith('d')
  const yearDigits = hasPrefix ? yyRaw.slice(1) : yyRaw
  // D-prefix = direct second year (lateral entry), so effective admission is 1 year earlier
  const admissionYear = 2000 + parseInt(yearDigits, 10) - (hasPrefix ? 1 : 0)
  const rollNumber = `${yyRaw}${depUpper}${roll}`.toUpperCase()
  return { admissionYear, department, institute, rollNumber }
}

export function validateName(name){
  if(!name) return false
  return NAME_REGEX.test(name.trim())
}

export function validatePhone(phone){
  if(!phone) return false
  return PHONE_REGEX.test(phone.trim())
}

export function validateRollNumber(roll){
  if(!roll) return false
  return ROLL_REGEX.test(roll.trim())
}

export function validateStudentEmail(email){
  return !!parseStudentEmail(email)
}

export function validateSemicolonList(str){
  if(!str) return { ok:true, values:[] }
  if(/[,|]/.test(str)) return { ok:false, error:'Use semicolons (;) to separate multiple values' }
  const values = str.split(';').map(s=>s.trim()).filter(Boolean)
  if(values.some(v=>v.includes(' ' ) && v.split(' ').length>5)){
    // Soft heuristic: very long phrases maybe misuse; ignore for now
  }
  return { ok:true, values }
}

// Ensure student by roll exists (and return it) - late import to avoid circular deps in tests
export async function ensureStudentExists(rollNumber){
  if(!validateRollNumber(rollNumber)) {
    throw new Error('Invalid roll number format')
  }
  const { default: User } = await import('@/models/User')
  const student = await User.findOne({ role: 'student', 'academicInfo.rollNumber': rollNumber.toUpperCase() })
  if(!student){
    throw new Error('Student with provided roll number not found')
  }
  return student
}
export function enforceWordLimit(text, limit=200){
  if(!text) return { ok:true, words:0 }
  const words = text.trim().split(/\s+/)
  if(words.length>limit) return { ok:false, error:`Exceeds word limit (${words.length}/${limit})` }
  return { ok:true, words:words.length }
}
export function parseMultiValue(str){
  if(!str) return []
  return str.split(';').map(s=>s.trim()).filter(Boolean)
}