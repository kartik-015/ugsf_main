/**
 * Script to clean database and add faculty members
 * 1. Remove all users except students and admin
 * 2. Add 3 HODs (CSE, CE, IT)
 * 3. Add 1 Principal (DEPSTAR)
 * 4. Add 10 Guides per department (30 total)
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal'

// Faculty names database
const hodNames = [
  { name: 'Dr. Rajesh Patel', dept: 'CSE' },
  { name: 'Dr. Priya Shah', dept: 'CE' },
  { name: 'Dr. Amit Kumar', dept: 'IT' }
]

const principalName = 'Dr. Mehul Desai'

const guideNames = {
  CSE: [
    'Dr. Vikram Singh', 'Dr. Neha Trivedi', 'Prof. Karan Joshi', 'Dr. Riya Sharma',
    'Prof. Arjun Patel', 'Dr. Kavya Mehta', 'Prof. Siddharth Rao', 'Dr. Pooja Gupta',
    'Prof. Harsh Verma', 'Dr. Divya Agarwal'
  ],
  CE: [
    'Dr. Rohan Desai', 'Dr. Sneha Iyer', 'Prof. Varun Pandey', 'Dr. Isha Kulkarni',
    'Prof. Yash Thakur', 'Dr. Ananya Reddy', 'Prof. Nikhil Mishra', 'Dr. Prisha Nair',
    'Prof. Aditya Chopra', 'Dr. Tara Malhotra'
  ],
  IT: [
    'Dr. Prakash Jain', 'Dr. Diya Kapoor', 'Prof. Atharva Bhatt', 'Dr. Navya Sinha',
    'Prof. Vihaan Dave', 'Dr. Kiara Bhatia', 'Prof. Ishaan Vyas', 'Dr. Saanvi Amin',
    'Prof. Reyansh Kumar', 'Dr. Myra Singh'
  ]
}

// Specializations for guides
const specializations = [
  'Machine Learning & AI', 'Web Development', 'Mobile App Development',
  'Data Science', 'Cybersecurity', 'Cloud Computing', 'DevOps',
  'Software Engineering', 'Database Systems', 'IoT & Embedded Systems',
  'Blockchain Technology', 'Computer Networks', 'UI/UX Design',
  'Big Data Analytics', 'Computer Graphics'
]

// Research interests
const researchAreas = [
  'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Natural Language Processing',
  'Computer Vision', 'Data Mining', 'Cloud Computing', 'Edge Computing',
  'Cybersecurity', 'Blockchain', 'IoT', 'Software Engineering',
  'Web Technologies', 'Mobile Computing', 'Database Management',
  'Computer Networks', 'Distributed Systems', 'Algorithm Design'
]

// Define schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin', 'guide', 'principal', 'hod'] },
  department: String,
  university: String,
  institute: String,
  academicInfo: {
    name: String,
    phoneNumber: String,
    address: String,
    designation: String,
    qualification: String,
    experience: String,
  },
  interests: [String],
  specialization: String,
  researchAreas: [String],
  isOnboarded: { type: Boolean, default: false },
  isRegistered: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true })

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function getRandomPhone() {
  return `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`
}

function emailFromName(name) {
  // Remove Dr./Prof. and convert to email
  const cleanName = name.replace(/^(Dr\.|Prof\.)\s+/i, '').trim()
  const parts = cleanName.toLowerCase().split(' ')
  return parts.join('.') + '@charusat.edu.in'
}

const cities = ['Ahmedabad', 'Anand', 'Vadodara', 'Gandhinagar', 'Mehsana', 'Nadiad']

async function setupFaculty() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const User = mongoose.models.User || mongoose.model('User', userSchema)
    
    // Step 1: Count existing users
    const studentCount = await User.countDocuments({ role: 'student' })
    const adminCount = await User.countDocuments({ role: 'admin' })
    const otherCount = await User.countDocuments({ role: { $nin: ['student', 'admin'] } })
    
    console.log('📊 Current Database:')
    console.log(`  Students: ${studentCount}`)
    console.log(`  Admins: ${adminCount}`)
    console.log(`  Other Users: ${otherCount}`)
    
    // Step 2: Remove all non-student, non-admin users
    console.log('\n🗑️  Removing all HODs, Principals, and Guides...')
    const deleteResult = await User.deleteMany({ 
      role: { $in: ['guide', 'hod', 'principal'] } 
    })
    console.log(`✅ Deleted ${deleteResult.deletedCount} users\n`)
    
    // Step 3: Hash default password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('Faculty@123', salt)
    
    // Step 4: Create Principal
    console.log('👔 Creating Principal...')
    const principal = {
      email: emailFromName(principalName),
      password: hashedPassword,
      role: 'principal',
      institute: 'DEPSTAR',
      university: 'Charotar University of Science and Technology',
      academicInfo: {
        name: principalName,
        phoneNumber: getRandomPhone(),
        address: `Office of Principal, DEPSTAR, Charotar University, Anand, Gujarat`,
        designation: 'Principal',
        qualification: 'Ph.D. in Computer Science',
        experience: '25+ years in Academia and Research'
      },
      interests: getRandomElements(researchAreas, 4),
      specialization: 'Educational Leadership & Computer Science',
      researchAreas: getRandomElements(researchAreas, 5),
      isOnboarded: true,
      isRegistered: true,
      isActive: true,
      isEmailVerified: true,
      isApproved: true,
      approvalStatus: 'approved'
    }
    await User.create(principal)
    console.log(`  ✓ ${principalName} - ${principal.email}`)
    
    // Step 5: Create HODs
    console.log('\n👨‍💼 Creating HODs...')
    for (const hod of hodNames) {
      const hodUser = {
        email: emailFromName(hod.name),
        password: hashedPassword,
        role: 'hod',
        department: hod.dept,
        institute: 'DEPSTAR',
        university: 'Charotar University of Science and Technology',
        academicInfo: {
          name: hod.name,
          phoneNumber: getRandomPhone(),
          address: `HOD Office, ${hod.dept} Department, DEPSTAR, Anand, Gujarat`,
          designation: `Head of Department - ${hod.dept}`,
          qualification: 'Ph.D. in ' + (hod.dept === 'CSE' ? 'Computer Science' : hod.dept === 'CE' ? 'Computer Engineering' : 'Information Technology'),
          experience: '20+ years in Teaching and Research'
        },
        interests: getRandomElements(researchAreas, 4),
        specialization: getRandomElements(specializations, 1)[0],
        researchAreas: getRandomElements(researchAreas, 5),
        isOnboarded: true,
        isRegistered: true,
        isActive: true,
        isEmailVerified: true,
        isApproved: true,
        approvalStatus: 'approved'
      }
      await User.create(hodUser)
      console.log(`  ✓ ${hod.name} (${hod.dept}) - ${hodUser.email}`)
    }
    
    // Step 6: Create Guides (10 per department)
    console.log('\n👨‍🏫 Creating Guides...')
    let guideCount = 0
    
    for (const [dept, names] of Object.entries(guideNames)) {
      console.log(`\n  ${dept} Department:`)
      for (const name of names) {
        const guideUser = {
          email: emailFromName(name),
          password: hashedPassword,
          role: 'guide',
          department: dept,
          institute: 'DEPSTAR',
          university: 'Charotar University of Science and Technology',
          academicInfo: {
            name: name,
            phoneNumber: getRandomPhone(),
            address: `Faculty Office, ${dept} Department, DEPSTAR, Anand, Gujarat`,
            designation: name.includes('Dr.') ? 'Assistant Professor' : 'Associate Professor',
            qualification: name.includes('Dr.') ? 'Ph.D.' : 'M.Tech',
            experience: name.includes('Dr.') ? '10-15 years' : '5-10 years'
          },
          interests: getRandomElements(researchAreas, 3),
          specialization: getRandomElements(specializations, 1)[0],
          researchAreas: getRandomElements(researchAreas, 4),
          isOnboarded: true,
          isRegistered: true,
          isActive: true,
          isEmailVerified: true,
          isApproved: true,
          approvalStatus: 'approved'
        }
        await User.create(guideUser)
        console.log(`    ✓ ${name} - ${guideUser.email}`)
        guideCount++
      }
    }
    
    // Step 7: Summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 FINAL SUMMARY:')
    console.log('='.repeat(70))
    
    const finalCounts = {
      students: await User.countDocuments({ role: 'student' }),
      admin: await User.countDocuments({ role: 'admin' }),
      principal: await User.countDocuments({ role: 'principal' }),
      hods: await User.countDocuments({ role: 'hod' }),
      guides: await User.countDocuments({ role: 'guide' }),
    }
    
    console.log(`\nStudents: ${finalCounts.students}`)
    console.log(`Admin: ${finalCounts.admin}`)
    console.log(`Principal: ${finalCounts.principal}`)
    console.log(`HODs: ${finalCounts.hods}`)
    console.log(`Guides: ${finalCounts.guides}`)
    console.log(`\nTotal Users: ${Object.values(finalCounts).reduce((a, b) => a + b, 0)}`)
    
    console.log('\n' + '='.repeat(70))
    console.log('✅ Faculty setup completed successfully!')
    console.log('\n📧 All faculty credentials:')
    console.log('   Email: firstname.lastname@charusat.edu.in')
    console.log('   Password: Faculty@123')
    console.log('='.repeat(70))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
  }
}

setupFaculty()
