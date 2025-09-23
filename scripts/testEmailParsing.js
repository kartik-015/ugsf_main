import { parseStudentEmail, validateStudentEmail } from '../src/lib/validation.js'
import { PROJECT_DOMAINS } from '../src/lib/domains.js'

const samples = [
  '23cs001@charusat.edu.in',
  '23dcs010@charusat.edu.in',
  '24it123@charusat.edu.in',
  '24cie999@charusat.edu.in',
  '25abc000@charusat.edu.in',
  '25me050@charusat.edu.in'
]

console.log('Student Email Parsing Results\n==============================')
for(const email of samples){
  console.log(email, 'valid=', validateStudentEmail(email), 'parsed=', parseStudentEmail(email))
}

console.log('\nProject Domains:', PROJECT_DOMAINS.join(', '))