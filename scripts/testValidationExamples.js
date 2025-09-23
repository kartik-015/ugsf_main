// Quick manual validation script (node --experimental-modules if needed)
import { validateName, validatePhone, validateRollNumber } from '../src/lib/validation.js'

const samples = {
  names: ['John Doe', 'A', 'Mary-Jane O\'Neill', 'Invalid@Name', '  Leading'],
  phones: ['+919876543210', '+910123456789', '9876543210', '+91123456789', '+91987654321a'],
  rolls: ['23CSE001', '23IT002', '23DIT010', '2CSE001', '23CSEE01']
}

console.log('Name results:')
for(const n of samples.names){
  console.log(n, '=>', validateName(n))
}
console.log('\nPhone results:')
for(const p of samples.phones){
  console.log(p, '=>', validatePhone(p))
}
console.log('\nRoll results:')
for(const r of samples.rolls){
  console.log(r, '=>', validateRollNumber(r))
}
