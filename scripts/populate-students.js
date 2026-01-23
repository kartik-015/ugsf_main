/**
 * Script to populate MongoDB with test student data
 * 
 * Creates 360 students:
 * - CSE: 30 students × 4 years = 120 students
 * - CE: 30 students × 4 years = 120 students
 * - IT: 30 students × 4 years = 120 students
 * 
 * Format: YYDEPxxx (e.g., 25DCS001, 24DCE015, 23DIT030)
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// MongoDB connection - must match .env.local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

// Define User Schema inline to avoid import issues
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student','mainadmin','admin','guide','principal','hod'],
    default: 'student',
  },
  counselorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  department: {
    type: String,
    enum: ['CSE', 'CE', 'IT', 'ME', 'EC', 'CIVIL'],
  },
  university: String,
  institute: String,
  admissionYear: Number,
  academicInfo: {
    name: String,
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    batch: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
    },
    rollNumber: String,
    phoneNumber: String,
    address: String,
  },
  interests: [String],
  experience: String,
  specialization: String,
  education: String,
  isOnboarded: {
    type: Boolean,
    default: false,
  },
  isRegistered: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationOTP: String,
  emailVerificationExpires: Date,
  lastLogin: Date,
  isApproved: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, {
  timestamps: true,
})


// Helper to generate random data
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharva', 'Advik', 'Pranav', 'Reyansh', 'Aadhya', 'Ananya', 'Pari', 'Anika', 'Isha',
  'Diya', 'Prisha', 'Myra', 'Kavya', 'Saanvi', 'Navya', 'Kiara', 'Riya', 'Tara', 'Avni',
  'Rohan', 'Karan', 'Vikram', 'Raj', 'Siddharth', 'Aryan', 'Varun', 'Harsh', 'Yash', 'Nikhil',
  'Ravi', 'Amit', 'Suresh', 'Ramesh', 'Prakash', 'Neha', 'Pooja', 'Priya', 'Sneha', 'Divya'
]

const lastNames = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Shah', 'Mehta', 'Joshi', 'Desai', 'Pandey',
  'Rao', 'Reddy', 'Nair', 'Iyer', 'Verma', 'Agarwal', 'Trivedi', 'Jain', 'Kapoor', 'Malhotra',
  'Chopra', 'Bhatia', 'Kulkarni', 'Mishra', 'Sinha', 'Thakur', 'Dave', 'Vyas', 'Bhatt', 'Amin'
]

const cities = [
  'Ahmedabad', 'Vadodara', 'Surat', 'Rajkot', 'Anand', 'Gandhinagar', 'Bharuch', 'Mehsana',
  'Nadiad', 'Jamnagar', 'Bhavnagar', 'Junagadh', 'Porbandar', 'Navsari', 'Vapi'
]

const interests = [
  'Web Development', 'Mobile Development', 'Data Science', 'AI/ML',
  'Cybersecurity', 'Cloud Computing', 'DevOps', 'UI/UX Design',
  'Blockchain', 'IoT', 'Game Development', 'Software Engineering'
]

const experiences = [
  'Beginner - just starting to learn',
  'Some experience with college projects',
  'Completed online courses and tutorials',
  'Built personal projects',
  'Participated in hackathons',
  'Contributed to open source',
  'Internship experience',
  'Freelance projects'
]

const specializations = [
  'Full Stack Development',
  'Frontend Development',
  'Backend Development',
  'Mobile App Development',
  'Data Analytics',
  'Machine Learning',
  'Cloud Architecture',
  'DevOps Engineering',
  'Cybersecurity',
  'UI/UX Design'
]

const domains = [
  'Healthcare Technology',
  'Education Technology',
  'Financial Technology',
  'E-commerce Solutions',
  'Social Media Platforms',
  'Gaming Applications',
  'Enterprise Software',
  'IoT Systems',
  'Blockchain Applications',
  'AI/ML Applications'
]

// Generate random elements
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]
const getRandomElements = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}
const getRandomPhone = () => `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`

// Generate students data
function generateStudentsData() {
  const students = []
  
  const departments = [
    { code: 'DCS', name: 'CSE', institute: 'DEPSTAR' },
    { code: 'DCE', name: 'CE', institute: 'DEPSTAR' },
    { code: 'DIT', name: 'IT', institute: 'DEPSTAR' }
  ]
  
  // Determine current semester based on date (Jan-June = even, July-Dec = odd)
  const currentMonth = new Date().getMonth() + 1 // 1-12
  const isEvenSemester = currentMonth >= 1 && currentMonth <= 6
  
  const batches = [
    { year: 25, admissionYear: 2025, semester: isEvenSemester ? 2 : 1 },    // 1st year
    { year: 24, admissionYear: 2024, semester: isEvenSemester ? 4 : 3 },    // 2nd year
    { year: 23, admissionYear: 2023, semester: isEvenSemester ? 6 : 5 },    // 3rd year
    { year: 22, admissionYear: 2022, semester: isEvenSemester ? 8 : 7 }     // 4th year
  ]
  
  const batchLetters = ['A', 'B', 'C', 'D']
  
  console.log(`📅 Current Date: ${new Date().toLocaleDateString()}`)
  console.log(`📚 Current Semester Period: ${isEvenSemester ? 'EVEN (Jan-June)' : 'ODD (July-Dec)'}\n`)
  
  for (const dept of departments) {
    for (const batch of batches) {
      for (let i = 1; i <= 30; i++) {
        const rollSeq = String(i).padStart(3, '0')
        const rollNumber = `${batch.year}${dept.code}${rollSeq}`
        const email = `${rollNumber.toLowerCase()}@charusat.edu.in`
        const firstName = getRandomElement(firstNames)
        const lastName = getRandomElement(lastNames)
        const fullName = `${firstName} ${lastName}`
        
        const student = {
          email: email,
          password: 'Student@123', // Default password for all test students
          role: 'student',
          department: dept.name,
          university: 'Charotar University of Science and Technology',
          institute: dept.institute,
          admissionYear: batch.admissionYear,
          academicInfo: {
            name: fullName,
            semester: batch.semester,  // All students in same batch have same semester
            batch: getRandomElement(batchLetters),
            rollNumber: rollNumber,
            phoneNumber: getRandomPhone(),
            address: `${Math.floor(Math.random() * 999) + 1}, ${getRandomElement(['Street', 'Road', 'Avenue'])} ${Math.floor(Math.random() * 50) + 1}, ${getRandomElement(cities)}, Gujarat`
          },
          interests: getRandomElements(interests, Math.floor(Math.random() * 3) + 2),
          experience: getRandomElement(experiences),
          specialization: getRandomElement(specializations),
          education: `B.Tech in ${dept.name}, Year ${5 - Math.floor(batch.semester / 2)}`,
          isOnboarded: true,
          isRegistered: true,
          isActive: true,
          isEmailVerified: true,
          isApproved: true,
          approvalStatus: 'approved',
          lastLogin: new Date()
        }
        
        students.push(student)
      }
    }
  }
  
  return students
}

// Main function
async function populateStudents() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get or create User model
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    
    // Step 1: Count existing students
    const existingCount = await User.countDocuments({ role: 'student' })
    console.log(`📊 Found ${existingCount} existing students`)
    
    // Step 2: Remove all existing students
    console.log('🗑️  Removing all existing student data...')
    const deleteResult = await User.deleteMany({ role: 'student' })
    console.log(`✅ Deleted ${deleteResult.deletedCount} students\n`)
    
    // Step 3: Generate new student data
    console.log('📝 Generating new student data...')
    const studentsData = generateStudentsData()
    console.log(`✅ Generated ${studentsData.length} students\n`)
    
    // Step 4: Hash passwords and insert students in batches
    console.log('🔐 Hashing passwords and inserting students...')
    const batchSize = 50
    let insertedCount = 0
    
    for (let i = 0; i < studentsData.length; i += batchSize) {
      const batch = studentsData.slice(i, i + batchSize)
      
      // Hash passwords for this batch
      const hashedBatch = await Promise.all(
        batch.map(async (student) => {
          const salt = await bcrypt.genSalt(10)
          const hashedPassword = await bcrypt.hash(student.password, salt)
          return { ...student, password: hashedPassword }
        })
      )
      
      // Insert batch
      await User.insertMany(hashedBatch, { ordered: false })
      insertedCount += batch.length
      
      console.log(`   ✓ Inserted ${insertedCount}/${studentsData.length} students`)
    }
    
    console.log(`\n✅ Successfully inserted ${insertedCount} students\n`)
    
    // Step 5: Summary
    console.log('📊 SUMMARY:')
    console.log('=' .repeat(50))
    
    const departments = ['CSE', 'CE', 'IT']
    const years = [
      { year: 2025, label: '1st Year (25 batch)' },
      { year: 2024, label: '2nd Year (24 batch)' },
      { year: 2023, label: '3rd Year (23 batch)' },
      { year: 2022, label: '4th Year (22 batch)' }
    ]
    
    for (const dept of departments) {
      console.log(`\n${dept} Department:`)
      for (const { year, label } of years) {
        const deptStudents = await User.find({
          role: 'student',
          department: dept,
          admissionYear: year
        }).select('academicInfo.semester').lean()
        
        const count = deptStudents.length
        const semester = deptStudents[0]?.academicInfo?.semester || 'N/A'
        console.log(`  ${label}: ${count} students (Semester ${semester})`)
      }
    }
    
    const totalStudents = await User.countDocuments({ role: 'student' })
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Total Students: ${totalStudents}`)
    console.log(`${'='.repeat(50)}`)
    
    console.log('\n📧 All students have:')
    console.log('   • Email format: YYDEPxxx@charusat.edu.in')
    console.log('   • Password: Student@123')
    console.log('   • Status: Verified, Registered, Onboarded, Approved')
    console.log('   • Same semester for all students in same batch/year')
    
    console.log('\n✨ Student population completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
  }
}

// Run the script
populateStudents()
