// Lightweight client-side validation mirroring server rules
// Supports both normal (23dit015) and D-prefix (d25dit079) email formats
export const studentEmailPattern = /^(d?\d{2})(cs|ce|it|me|ec|cie|dcs|dce|dit)\d{3}@charusat\.edu\.in$/i
export function deriveFromStudentEmail(email){
  const m = email.match(studentEmailPattern)
  if(!m) return null
  const yyRaw = m[1]; const dep = m[2].toUpperCase()
  const deptMap = { CS:'CSE', CE:'CE', IT:'IT', ME:'ME', EC:'EC', CIE:'CIVIL', DCS:'CSE', DCE:'CE', DIT:'IT' }
  let institute = 'DEPSTAR'
  let department = deptMap[dep]
  if(!department) return null
  // Handle D-prefix: extract numeric year digits only
  const hasPrefix = yyRaw.toLowerCase().startsWith('d')
  const yearDigits = hasPrefix ? yyRaw.slice(1) : yyRaw
  const admissionYear = 2000 + parseInt(yearDigits, 10)
  // Build roll number preserving original prefix
  const localPart = email.split('@')[0]
  const rollNumber = localPart.toUpperCase()
  return { admissionYear, department, institute, rollNumber }
}
export const phonePattern = /^\+91[1-9]\d{9}$/
export function validatePhoneRuntime(v){ return phonePattern.test((v||'').trim()) }
export function validateNameRuntime(n){ return /^[A-Za-z][A-Za-z\s'.-]{0,98}[A-Za-z]$/.test((n||'').trim()) }
export function passwordStrength(p){
  if(!p) return { score:0, label:'Empty' }
  let score = 0
  if(p.length>=8) score++
  if(/[A-Z]/.test(p)) score++
  if(/[a-z]/.test(p)) score++
  if(/\d/.test(p)) score++
  if(/[^A-Za-z0-9]/.test(p)) score++
  const labels = ['Very Weak','Weak','Fair','Good','Strong','Excellent']
  return { score, label: labels[score] || 'Unknown' }
}
export function wordCount(text){ if(!text) return 0; return text.trim().split(/\s+/).filter(Boolean).length }
export function semicolonListValid(str){ if(!str) return true; return !(/[,|]/.test(str)) }