import { ROLES } from './roles'

export function canWrite(role){
  if(!role) return false
  if(role === ROLES.PRINCIPAL) return false // read-only principal
  return true
}

export function assertCanWrite(role){
  if(!canWrite(role)){
    const err = new Error('Write operations are not permitted for this role')
    err.code = 'FORBIDDEN'
    throw err
  }
}
