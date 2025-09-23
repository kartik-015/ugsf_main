import { deriveFromStudentEmail, passwordStrength, semicolonListValid, wordCount, validatePhoneRuntime, validateNameRuntime, studentEmailPattern } from '@/lib/clientValidation'

describe('clientValidation utilities', () => {
  test('deriveFromStudentEmail valid CSPIT pattern', () => {
    const r = deriveFromStudentEmail('23cs001@charusat.edu.in')
    expect(r).toBeTruthy()
    expect(r.department).toBe('CSE')
    expect(r.institute).toBe('CSPIT')
    expect(r.rollNumber).toBe('23CS001')
  })

  test('deriveFromStudentEmail valid DEPSTAR pattern', () => {
    const r = deriveFromStudentEmail('24dcs123@charusat.edu.in')
    expect(r).toBeTruthy()
    expect(r.department).toBe('CSE')
    expect(r.institute).toBe('DEPSTAR')
    expect(r.rollNumber).toBe('24DCS123')
  })

  test('deriveFromStudentEmail invalid pattern', () => {
    const r = deriveFromStudentEmail('x3cs001@charusat.edu.in')
    expect(r).toBeNull()
  })

  test('studentEmailPattern regex basic', () => {
    expect(studentEmailPattern.test('23cs001@charusat.edu.in')).toBe(true)
    expect(studentEmailPattern.test('23cs001@other.edu.in')).toBe(false)
  })

  test('passwordStrength scoring', () => {
    expect(passwordStrength('a').score).toBeLessThan(2)
    expect(passwordStrength('Abcdef12').score).toBeGreaterThanOrEqual(3)
    expect(passwordStrength('Abcdef12!').score).toBeGreaterThanOrEqual(4)
  })

  test('semicolonListValid', () => {
    expect(semicolonListValid('one;two;three')).toBe(true)
    expect(semicolonListValid('one,two')).toBe(false)
  })

  test('wordCount', () => {
    expect(wordCount('one two  three')).toBe(3)
    expect(wordCount('')).toBe(0)
  })

  test('validatePhoneRuntime', () => {
    expect(validatePhoneRuntime('+919876543210')).toBe(true)
    expect(validatePhoneRuntime('+910123456789')).toBe(false)
  })

  test('validateNameRuntime', () => {
    expect(validateNameRuntime('John Doe')).toBe(true)
    expect(validateNameRuntime('1John')).toBe(false)
  })
})
