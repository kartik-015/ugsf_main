import { ROLES } from './roles'

// Roles that can perform write operations
const WRITE_ROLES = [
  ROLES.MAIN_ADMIN,
  ROLES.ADMIN,
  ROLES.HOD,
  ROLES.PROJECT_COORDINATOR,
  ROLES.GUIDE,
  ROLES.STUDENT
]

// Principal is read-only across all modules
export function canWrite(role) {
  return WRITE_ROLES.includes(role)
}

export function assertCanWrite(role) {
  if (!canWrite(role)) {
    throw new Error('This role does not have write permissions')
  }
}

// Check if a role can view a specific module
export function canAccessModule(role, module) {
  const moduleAccess = {
    dashboard: [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR, ROLES.GUIDE, ROLES.STUDENT],
    students: [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR, ROLES.GUIDE],
    guides: [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR],
    projects: [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR, ROLES.GUIDE, ROLES.STUDENT],
    settings: [ROLES.MAIN_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.HOD, ROLES.PROJECT_COORDINATOR, ROLES.GUIDE, ROLES.STUDENT],
    approvals: [ROLES.MAIN_ADMIN, ROLES.ADMIN],
  }

  return (moduleAccess[module] || []).includes(role)
}

// Check if role can manage approvals for department
export function canApproveInDepartment(role) {
  return [ROLES.HOD, ROLES.PROJECT_COORDINATOR, ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(role)
}
