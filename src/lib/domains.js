export const PROJECT_DOMAINS = [
  'Web Development',
  'Mobile Development',
  'AI/ML',
  'Data Science',
  'Cybersecurity',
  'Cloud Computing',
  'DevOps',
  'Blockchain',
  'IoT',
  'Game Development',
  'Embedded Systems',
  'AR/VR',
  'Robotics'
]

export function isValidDomain(domain){
  return PROJECT_DOMAINS.includes(domain)
}