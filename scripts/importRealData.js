/**
 * Import Real Data Script
 * ========================
 * Reads Excel files from "real data/" folder and populates the database with:
 * - Guide users (faculty)
 * - Student users (with ID@charusat.edu.in format)
 * - Project groups with proper linkages
 * 
 * 4IT = Semester 4, Department IT
 * 6IT = Semester 6, Department IT
 * 
 * Usage: node scripts/importRealData.js
 * Options:
 *   --send-emails   Send credential emails to 23DIT015 team & test guide only
 *   --dry-run       Show what would be imported without writing to DB
 */

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const path = require('path')
const Module = require('module')
require('dotenv').config({ path: '.env.local' })

// Register @ alias so ESM imports from models (e.g. @/lib/validation) resolve correctly
const origResolve = Module._resolveFilename
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2))
  }
  return origResolve.call(this, request, parent, isMain, options)
}

let User, ProjectGroup, ExcelJS

async function importModels() {
  const UserModule = await import('../src/models/User.js')
  const ProjectGroupModule = await import('../src/models/ProjectGroup.js')
  User = UserModule.default
  ProjectGroup = ProjectGroupModule.default
  ExcelJS = require('exceljs')
}

// Generate a random 10-char password
function generatePassword() {
  return crypto.randomBytes(5).toString('hex') // 10 chars hex
}

// Parse guide name to email: "Mr. Sachin Patel" -> "sachinpatel.dit@charusat.ac.in"
// Format: namesurname.deptcode@charusat.ac.in (matches GUIDE_EMAIL_REGEX)
function guideNameToEmail(name, department = 'IT') {
  const cleaned = name.replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Prof\.?)\s*/i, '').trim()
  const parts = cleaned.split(/\s+/).map(p => p.toLowerCase())
  const namePart = parts.join('') // concatenate without dots: "sachinpatel"
  const deptCodeMap = { IT: 'dit', CSE: 'dcs', CE: 'dce' }
  const deptCode = deptCodeMap[department] || 'dit'
  return namePart + '.' + deptCode + '@charusat.ac.in'
}

// Parse guide name to clean name: "Mr. Sachin Patel" -> "Sachin Patel"
function guideNameClean(name) {
  return name.replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Prof\.?)\s*/i, '').trim()
}

// Normalize student ID to lowercase email
function studentIdToEmail(id) {
  return id.trim().toLowerCase() + '@charusat.edu.in'
}

// Parse member IDs from Excel cell (various separators: newline, comma, dash, semicolon)
function parseMemberIds(cellValue) {
  if (!cellValue) return []
  const str = String(cellValue)
  // Split by newline, comma, dash, semicolon
  const parts = str.split(/[\n,;\-]+/)
  const ids = []
  for (let part of parts) {
    // Clean: remove numbering prefixes like "1. ", "2. "
    part = part.replace(/^\d+\.\s*/, '').trim()
    // Extract ID pattern: optional D prefix + 2 digits + 2-3 letters + 3 digits
    const match = part.match(/\b(D?\d{2}[A-Za-z]{2,3}\d{3})\b/i)
    if (match) {
      ids.push(match[1].toUpperCase())
    }
  }
  return ids
}

// Parse member names from Excel cell
function parseMemberNames(cellValue) {
  if (!cellValue) return []
  const str = String(cellValue)
  const parts = str.split(/[\n,;\-]+/)
  const names = []
  for (let part of parts) {
    part = part.replace(/^\d+\.\s*/, '').trim()
    // Skip if it looks like just an ID
    if (/^D?\d{2}[A-Za-z]{2,3}\d{3}$/i.test(part)) continue
    if (part.length > 1) names.push(part)
  }
  return names
}

// Determine department from student ID
function getDepartmentFromId(id) {
  const upper = id.toUpperCase()
  // Pattern: optional D + 2 digits + DEPT_CODE + 3 digits
  const match = upper.match(/^D?(\d{2})([A-Z]{2,3})(\d{3})$/)
  if (!match) return 'IT' // default
  const deptCode = match[2]
  const deptMap = { CS: 'CSE', CE: 'CE', IT: 'IT', ME: 'ME', EC: 'EC', CIE: 'CIVIL', DCS: 'CSE', DCE: 'CE', DIT: 'IT' }
  return deptMap[deptCode] || 'IT'
}

// Get admission year from student ID
function getAdmissionYearFromId(id) {
  const upper = id.toUpperCase()
  const match = upper.match(/^D?(\d{2})/)
  if (!match) return 2023
  return 2000 + parseInt(match[1], 10)
}

// Get institute from student ID
function getInstituteFromId(id) {
  return 'DEPSTAR'
}

async function parseExcelFile(filePath, semester) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.getWorksheet('GUIDE_ALLOCATION')
  
  if (!worksheet) {
    console.error(`No GUIDE_ALLOCATION sheet found in ${filePath}`)
    return []
  }

  const groups = []
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 1) return // Skip header
    
    const srNo = row.getCell(1).value
    const leaderName = row.getCell(2).value ? String(row.getCell(2).value).trim() : ''
    const leaderId = row.getCell(3).value ? String(row.getCell(3).value).trim().toUpperCase() : ''
    const memberNames = row.getCell(4).value ? String(row.getCell(4).value) : ''
    const memberIds = row.getCell(5).value ? String(row.getCell(5).value) : ''
    const projectTitle = row.getCell(6).value ? String(row.getCell(6).value).trim() : ''
    const domain = row.getCell(7).value ? String(row.getCell(7).value).trim() : ''
    const problemStatement = row.getCell(8).value ? String(row.getCell(8).value).trim() : ''
    const guideName = row.getCell(9).value ? String(row.getCell(9).value).trim() : ''
    
    if (!leaderId || !projectTitle) return // Skip empty rows
    
    // Remove ID pattern from leaderId
    const cleanLeaderId = leaderId.replace(/\s+/g, '').match(/^(D?\d{2}[A-Za-z]{2,3}\d{3})/i)
    if (!cleanLeaderId) {
      console.warn(`  Skipping row ${rowNumber}: Invalid leader ID "${leaderId}"`)
      return
    }
    
    const parsedMemberIds = parseMemberIds(memberIds)
    const parsedMemberNames = parseMemberNames(memberNames)
    
    // Build member list (leader excluded from members list, will be added separately)
    const members = []
    for (let i = 0; i < parsedMemberIds.length; i++) {
      const mid = parsedMemberIds[i]
      // Skip if same as leader
      if (mid === cleanLeaderId[1]) continue
      members.push({
        id: mid,
        name: parsedMemberNames[i] || '',
        email: studentIdToEmail(mid),
        department: getDepartmentFromId(mid),
        admissionYear: getAdmissionYearFromId(mid),
      })
    }
    
    groups.push({
      srNo,
      leaderName,
      leaderId: cleanLeaderId[1],
      leaderEmail: studentIdToEmail(cleanLeaderId[1]),
      leaderDepartment: getDepartmentFromId(cleanLeaderId[1]),
      leaderAdmissionYear: getAdmissionYearFromId(cleanLeaderId[1]),
      members,
      projectTitle,
      domain,
      problemStatement,
      guideName,
      guideEmail: guideName ? guideNameToEmail(guideName) : '',
      guideCleanName: guideName ? guideNameClean(guideName) : '',
      semester,
      department: 'IT', // Both files are IT department
    })
  })
  
  return groups
}

async function main() {
  const args = process.argv.slice(2)
  const sendEmails = args.includes('--send-emails')
  const dryRun = args.includes('--dry-run')
  
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║       UGSF Real Data Import Script                  ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  Send Emails: ${sendEmails ? 'YES (only to test team)' : 'NO'}`)
  console.log(`  Dry Run: ${dryRun ? 'YES' : 'NO'}`)
  console.log()
  
  await importModels()
  
  // Parse Excel files
  console.log('📂 Parsing Excel files...')
  const file4IT = path.join(__dirname, '..', 'real data', 'Guide_4th_IT_Semester Project Proposal Submission (Responses).xlsx')
  const file6IT = path.join(__dirname, '..', 'real data', 'GUIDE_6th_IT_Semester Project Proposal Submission (Responses).xlsx')
  
  const groups4IT = await parseExcelFile(file4IT, 4)
  const groups6IT = await parseExcelFile(file6IT, 6)
  
  console.log(`  4IT: ${groups4IT.length} project groups`)
  console.log(`  6IT: ${groups6IT.length} project groups`)
  
  const allGroups = [...groups4IT, ...groups6IT]
  
  // Collect unique guides
  const guideMap = new Map()
  allGroups.forEach(g => {
    if (g.guideEmail && !guideMap.has(g.guideEmail)) {
      guideMap.set(g.guideEmail, {
        email: g.guideEmail,
        name: g.guideCleanName,
        department: 'IT',
      })
    }
  })
  
  // Collect unique students
  const studentMap = new Map()
  allGroups.forEach(g => {
    // Leader
    if (!studentMap.has(g.leaderEmail)) {
      studentMap.set(g.leaderEmail, {
        email: g.leaderEmail,
        name: g.leaderName,
        rollNumber: g.leaderId,
        department: g.leaderDepartment,
        admissionYear: g.leaderAdmissionYear,
        semester: g.semester,
      })
    }
    // Members
    g.members.forEach(m => {
      if (!studentMap.has(m.email)) {
        studentMap.set(m.email, {
          email: m.email,
          name: m.name,
          rollNumber: m.id,
          department: m.department,
          admissionYear: m.admissionYear,
          semester: g.semester,
        })
      }
    })
  })
  
  console.log(`  Unique Guides: ${guideMap.size}`)
  console.log(`  Unique Students: ${studentMap.size}`)
  
  // Print guide list
  console.log('\n📋 Guides:')
  for (const [email, info] of guideMap) {
    console.log(`  ${info.name} -> ${email}`)
  }
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Not writing to database')
    console.log('\nStudents:')
    for (const [email, info] of studentMap) {
      console.log(`  ${info.rollNumber} ${info.name} -> ${email} (${info.department}, Sem ${info.semester})`)
    }
    console.log('\nProject Groups:')
    allGroups.forEach(g => {
      console.log(`  [S${g.semester}] "${g.projectTitle}" - Leader: ${g.leaderId} - Guide: ${g.guideCleanName}`)
    })
    process.exit(0)
  }
  
  // Connect to database
  console.log('\n🔌 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf')
  console.log('  Connected!')
  
  // Clear existing non-admin data
  console.log('\n🗑️  Clearing existing data...')
  const deletedStudents = await User.deleteMany({ role: 'student' })
  const deletedGuides = await User.deleteMany({ role: 'guide' })
  const deletedProjects = await ProjectGroup.deleteMany({})
  console.log(`  Deleted ${deletedStudents.deletedCount} students, ${deletedGuides.deletedCount} guides, ${deletedProjects.deletedCount} projects`)
  
  // Generate passwords and create guide users
  console.log('\n👨‍🏫 Creating guide users...')
  const guideCredentials = new Map()
  const guideUserMap = new Map() // email -> User doc
  const defaultGuidePassword = 'depstar@123'
  
  for (const [email, info] of guideMap) {
    guideCredentials.set(email, defaultGuidePassword)
    
    const guide = new User({
      email,
      password: defaultGuidePassword,
      role: 'guide',
      department: info.department,
      university: 'Charusat University',
      institute: 'DEPSTAR',
      academicInfo: {
        name: info.name,
      },
      isOnboarded: true,
      isEmailVerified: true,
      isApproved: true,
      approvalStatus: 'approved',
      isActive: true,
      mustChangePassword: true,
    })
    await guide.save({ validateBeforeSave: false }) // Skip email validation for @charusat.ac.in
    guideUserMap.set(email, guide)
    console.log(`  ✅ ${info.name} (${email}) - Password: ${defaultGuidePassword}`)
  }
  
  // Also create a test guide for kartik.guleria@gmail.com
  const testGuide = new User({
    email: 'kartik.guleria@gmail.com',
    password: defaultGuidePassword,
    role: 'guide',
    department: 'IT',
    university: 'Charusat University',
    institute: 'DEPSTAR',
    academicInfo: {
      name: 'Kartik Guleria (Test Guide)',
    },
    isOnboarded: true,
    isEmailVerified: true,
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
    mustChangePassword: true,
  })
  await testGuide.save({ validateBeforeSave: false })
  guideCredentials.set('kartik.guleria@gmail.com', defaultGuidePassword)
  console.log(`  ✅ Test Guide: kartik.guleria@gmail.com - Password: ${defaultGuidePassword}`)
  
  // Create student users - each team gets ONE shared password
  console.log('\n👨‍🎓 Creating student users (team-shared passwords)...')
  const studentCredentials = new Map()
  const studentUserMap = new Map() // email -> User doc
  const teamPasswords = new Map() // leaderId -> password (shared by all team members)
  
  // First pass: generate one password per team
  for (const group of allGroups) {
    const teamPassword = generatePassword()
    teamPasswords.set(group.leaderId, teamPassword)
  }
  
  // Second pass: create student accounts with team password
  for (const group of allGroups) {
    const teamPassword = teamPasswords.get(group.leaderId)
    
    // Create all team members (leader + members) with the SAME password
    const allTeamMembers = [
      { email: group.leaderEmail, name: group.leaderName, rollNumber: group.leaderId, department: group.leaderDepartment, admissionYear: group.leaderAdmissionYear, semester: group.semester },
      ...group.members.map(m => ({ email: m.email, name: m.name, rollNumber: m.id, department: m.department, admissionYear: m.admissionYear, semester: group.semester }))
    ]
    
    for (const info of allTeamMembers) {
      // Skip if already created (student might be in multiple groups)
      if (studentUserMap.has(info.email)) {
        studentCredentials.set(info.email, teamPassword) // update to latest team password
        continue
      }
      
      const student = new User({
        email: info.email,
        password: teamPassword,
        role: 'student',
        department: info.department,
        admissionYear: info.admissionYear,
        university: 'Charusat University',
        institute: 'DEPSTAR',
        academicInfo: {
          name: info.name || info.rollNumber,
          rollNumber: info.rollNumber,
          semester: info.semester,
        },
        isOnboarded: true,
        isEmailVerified: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        isRegistered: true,
      })
      await student.save({ validateBeforeSave: false })
      studentUserMap.set(info.email, student)
      studentCredentials.set(info.email, teamPassword)
    }
  }
  console.log(`  ✅ Created ${studentUserMap.size} student accounts`)
  
  // Create project groups
  console.log('\n📁 Creating project groups...')
  let projectCount = 0
  
  for (const group of allGroups) {
    const leaderUser = studentUserMap.get(group.leaderEmail)
    if (!leaderUser) {
      console.warn(`  ⚠️ Leader not found: ${group.leaderEmail} for "${group.projectTitle}"`)
      continue
    }
    
    // Build members array
    const memberDocs = [{ student: leaderUser._id, role: 'leader' }]
    for (const m of group.members) {
      const memberUser = studentUserMap.get(m.email)
      if (memberUser) {
        memberDocs.push({ student: memberUser._id, role: 'member' })
      } else {
        console.warn(`  ⚠️ Member not found: ${m.email} for "${group.projectTitle}"`)
      }
    }
    
    // Find guide user
    const guideUser = guideUserMap.get(group.guideEmail)
    
    const projectGroup = new ProjectGroup({
      title: group.projectTitle,
      description: group.problemStatement,
      domain: group.domain,
      department: group.department,
      semester: group.semester,
      academicYear: '2025-26',
      members: memberDocs,
      leader: leaderUser._id,
      createdBy: leaderUser._id,
      internalGuide: guideUser ? guideUser._id : undefined,
      guideStatus: guideUser ? 'accepted' : 'not-assigned',
      hodApproval: 'approved',
      status: guideUser ? 'in-progress' : 'approved',
    })
    
    await projectGroup.save()
    projectCount++
  }
  console.log(`  ✅ Created ${projectCount} project groups`)
  
  // Send emails only to 23DIT015 and 23DIT071
  if (sendEmails) {
    console.log('\n📧 Sending credential emails (23DIT015 & 23DIT071 only)...')
    const { sendEmail } = await import('../src/lib/mailer.js')
    
    const testTeamEmails = ['23dit015@charusat.edu.in', '23dit071@charusat.edu.in']
    
    for (const email of testTeamEmails) {
      const password = studentCredentials.get(email)
      if (password) {
        const studentUser = studentUserMap.get(email)
        const studentName = studentUser?.academicInfo?.name || email.split('@')[0].toUpperCase()
        const rollNumber = studentUser?.academicInfo?.rollNumber || email.split('@')[0].toUpperCase()
        
        // Find which team this student belongs to
        const team = allGroups.find(g => 
          g.leaderEmail === email || g.members.some(m => m.email === email)
        )
        const teamMembers = team ? [team.leaderId, ...team.members.map(m => m.id)].join(', ') : 'N/A'
        
        const result = await sendEmail({
          to: email,
          subject: 'EvalProX Portal - Your Team Login Credentials',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a56db;">EvalProX Portal - Login Credentials</h2>
              <p>Dear ${studentName},</p>
              <p>Your account has been created on the EvalProX (SGP Evaluation Portal). Here are your login credentials:</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>Login Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>Roll Number:</strong> ${rollNumber}</p>
                <p><strong>Project:</strong> ${team?.projectTitle || 'N/A'}</p>
                <p><strong>Team:</strong> ${teamMembers}</p>
              </div>
              <p><em>Note: All members of your team share the same password.</em></p>
              <p>Please login at the portal and verify your project details.</p>
              <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password after first login for security.</p>
              <p>Best Regards,<br/>EvalProX Admin Team</p>
            </div>
          `,
          text: `EvalProX Portal Credentials\nEmail: ${email}\nPassword: ${password}\nAll team members share this password.\nPlease login and change your password.`,
        })
        console.log(`  ${result.success ? '✅' : '❌'} Sent to ${email}`)
      }
    }
  }
  
  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║                    IMPORT SUMMARY                   ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log(`║  Guides Created:    ${String(guideUserMap.size + 1).padEnd(30)} ║`)
  console.log(`║  Students Created:  ${String(studentUserMap.size).padEnd(30)} ║`)
  console.log(`║  Projects Created:  ${String(projectCount).padEnd(30)} ║`)
  console.log(`║  4IT Projects:      ${String(groups4IT.length).padEnd(30)} ║`)
  console.log(`║  6IT Projects:      ${String(groups6IT.length).padEnd(30)} ║`)
  console.log('╠══════════════════════════════════════════════════════╣')
  
  // Count stats
  const totalStudents4IT = new Set()
  groups4IT.forEach(g => {
    totalStudents4IT.add(g.leaderEmail)
    g.members.forEach(m => totalStudents4IT.add(m.email))
  })
  const totalStudents6IT = new Set()
  groups6IT.forEach(g => {
    totalStudents6IT.add(g.leaderEmail)
    g.members.forEach(m => totalStudents6IT.add(m.email))
  })
  
  console.log(`║  4IT Students:      ${String(totalStudents4IT.size).padEnd(30)} ║`)
  console.log(`║  6IT Students:      ${String(totalStudents6IT.size).padEnd(30)} ║`)
  console.log('╚══════════════════════════════════════════════════════╝')
  
  // Print admin credentials reminder
  console.log('\n📌 Existing Admin Credentials (unchanged):')
  console.log('  Admin: admin@charusat.edu.in / depstar@123')
  console.log('  HOD IT: hod.itds@charusat.ac.in / depstar@123')
  console.log('  PC IT: pcit@charusat.ac.in / depstar@123')
  console.log('  Principal: principal@charusat.ac.in / depstar@123')
  
  // Print all credentials to a file for reference
  const credentialLines = ['=== STUDENT CREDENTIALS (Team-shared passwords) ===']
  // Group by team
  for (const group of allGroups) {
    const teamPass = teamPasswords.get(group.leaderId)
    credentialLines.push(`\n--- Team: ${group.projectTitle} (Sem ${group.semester}) ---`)
    credentialLines.push(`  Password (shared): ${teamPass}`)
    credentialLines.push(`  Leader: ${group.leaderId} | ${group.leaderName} | ${group.leaderEmail}`)
    group.members.forEach(m => {
      credentialLines.push(`  Member: ${m.id} | ${m.name} | ${m.email}`)
    })
  }
  credentialLines.push('\n=== GUIDE CREDENTIALS ===')
  for (const [email, password] of guideCredentials) {
    credentialLines.push(`${email} | ${password}`)
  }
  
  const credFilePath = path.join(__dirname, '..', 'credentials_generated.txt')
  require('fs').writeFileSync(credFilePath, credentialLines.join('\n'), 'utf-8')
  console.log(`\n💾 All credentials saved to: credentials_generated.txt`)
  console.log('  ⚠️ KEEP THIS FILE SECURE AND DELETE AFTER USE')
  
  await mongoose.disconnect()
  console.log('\n✅ Import complete!')
}

main().catch(err => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})
