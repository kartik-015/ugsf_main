// Central role & permission constants
export const ROLES = {
  MAIN_ADMIN: 'mainadmin',
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  HOD: 'hod',
  PROJECT_COORDINATOR: 'project_coordinator',
  GUIDE: 'guide',
  STUDENT: 'student'
}

export const ADMIN_ROLES = [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR]
export const STAFF_ROLES = [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.GUIDE]
export const MANAGEMENT_ROLES = [ROLES.MAIN_ADMIN, ROLES.ADMIN]
export const DEPARTMENT_HEADS = [ROLES.HOD, ROLES.PROJECT_COORDINATOR]

export function isAdmin(role) { return ADMIN_ROLES.includes(role) }
export function isStaff(role) { return STAFF_ROLES.includes(role) }
export function isManagement(role) { return MANAGEMENT_ROLES.includes(role) }
export function isDepartmentHead(role) { return DEPARTMENT_HEADS.includes(role) }
