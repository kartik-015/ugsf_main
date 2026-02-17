// Utility function to calculate current semester based on admission year
// Academic year runs July–June:
//   Odd semester  (Jul–Dec): same calendar year as academic-year start
//   Even semester (Jan–Jun): next calendar year, but same academic year
//
// Examples for admissionYear = 2023:
//   Jul 2023–Dec 2023 → Year 1, Sem 1  (yearDiff 0, odd)
//   Jan 2024–Jun 2024 → Year 1, Sem 2  (yearDiff 1, even)
//   Jul 2024–Dec 2024 → Year 2, Sem 3  (yearDiff 1, odd)
//   Jan 2025–Jun 2025 → Year 2, Sem 4  (yearDiff 2, even)
//   Jul 2025–Dec 2025 → Year 3, Sem 5  (yearDiff 2, odd)
//   Jan 2026–Jun 2026 → Year 3, Sem 6  (yearDiff 3, even)
//   Jul 2026–Dec 2026 → Year 4, Sem 7  (yearDiff 3, odd)
//   Jan 2027–Jun 2027 → Year 4, Sem 8  (yearDiff 4, even)
export function calculateCurrentSemester(admissionYear) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12

  const yearDiff = currentYear - admissionYear

  // Jan-June = even semester (of the academic year that started previous July)
  const isEvenSemester = currentMonth <= 6

  let semester
  if (isEvenSemester) {
    semester = yearDiff * 2       // e.g. yearDiff 3 → sem 6
  } else {
    semester = yearDiff * 2 + 1   // e.g. yearDiff 2 → sem 5
  }

  // Clamp to valid range
  if (semester < 1) semester = 1
  if (semester > 8) semester = 8

  return semester
}

// Get academic year description
export function getAcademicYear(admissionYear) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const yearDiff = currentYear - admissionYear
  const isEvenSemester = currentMonth <= 6

  // In Jan-Jun the academic year actually started the previous July,
  // so the "year of study" is yearDiff (not yearDiff+1).
  const yearOfStudy = isEvenSemester ? yearDiff : yearDiff + 1

  if (yearOfStudy <= 0) return 'Future'
  if (yearOfStudy === 1) return '1st Year'
  if (yearOfStudy === 2) return '2nd Year'
  if (yearOfStudy === 3) return '3rd Year'
  if (yearOfStudy === 4) return '4th Year'
  return 'Graduated'
}
