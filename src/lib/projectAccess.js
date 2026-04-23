import User from '@/models/User'
import { ROLES } from '@/lib/roles'

export function normalizeDepartment(department) {
  return String(department || '').trim().toUpperCase()
}

export async function getDepartmentStudentIds(department) {
  const normalizedDepartment = normalizeDepartment(department)
  if (!normalizedDepartment) return []

  const students = await User.find({ role: ROLES.STUDENT, department: normalizedDepartment }).select('_id').lean()
  return students.map(student => student._id)
}

export function projectMatchesDepartment(project, department) {
  const normalizedDepartment = normalizeDepartment(department)
  if (!normalizedDepartment || !project) return false

  if (normalizeDepartment(project.department) === normalizedDepartment) {
    return true
  }

  return (project.members || []).some(member => {
    const memberDepartment = member?.student?.department || member?.student?.departmentName || member?.student?.departmentCode
    return normalizeDepartment(memberDepartment) === normalizedDepartment
  })
}

export function canViewProject(project, sessionUser) {
  if (!project || !sessionUser) return false

  const role = sessionUser.role
  const userId = String(sessionUser.id || '')

  if ([ROLES.ADMIN, ROLES.MAIN_ADMIN, ROLES.PRINCIPAL].includes(role)) {
    return true
  }

  if (role === ROLES.STUDENT) {
    return (project.members || []).some(member => String(member.student?._id || member.student) === userId)
  }

  if (role === ROLES.GUIDE) {
    return String(project.internalGuide?._id || project.internalGuide || '') === userId
  }

  if ([ROLES.HOD, ROLES.PROJECT_COORDINATOR].includes(role)) {
    return projectMatchesDepartment(project, sessionUser.department)
  }

  return false
}