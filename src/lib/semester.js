// Utility function to calculate current semester based on admission year
export function calculateCurrentSemester(admissionYear) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12
  
  const yearDiff = currentYear - admissionYear
  
  // Determine if we're in odd semester (July-Dec) or even semester (Jan-June)
  const isEvenSemester = currentMonth <= 6 // Jan-June = Even semester
  
  let baseSemester
  if (yearDiff === 0) {
    // 1st year
    baseSemester = isEvenSemester ? 2 : 1
  } else if (yearDiff === 1) {
    // 2nd year
    baseSemester = isEvenSemester ? 4 : 3
  } else if (yearDiff === 2) {
    // 3rd year
    baseSemester = isEvenSemester ? 6 : 5
  } else if (yearDiff === 3) {
    // 4th year
    baseSemester = isEvenSemester ? 8 : 7
  } else if (yearDiff >= 4) {
    // Graduated or beyond 4th year
    baseSemester = 8
  } else {
    // Future admission (negative yearDiff)
    baseSemester = 1
  }
  
  return baseSemester
}

// Get academic year description
export function getAcademicYear(admissionYear) {
  const currentYear = new Date().getFullYear()
  const yearDiff = currentYear - admissionYear
  
  if (yearDiff === 0) return '1st Year'
  if (yearDiff === 1) return '2nd Year'
  if (yearDiff === 2) return '3rd Year'
  if (yearDiff === 3) return '4th Year'
  if (yearDiff >= 4) return 'Graduated'
  return 'Future'
}
