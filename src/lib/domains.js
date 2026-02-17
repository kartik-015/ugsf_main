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
  'Robotics',
  'Other'
]

export function isValidDomain(domain){
  // Accept predefined domains or any non-empty custom domain
  return PROJECT_DOMAINS.includes(domain) || (typeof domain === 'string' && domain.trim().length > 0)
}