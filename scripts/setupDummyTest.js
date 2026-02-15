/**
 * Setup Dummy Test Group Script
 * ==============================
 * Creates a new dummy project group for testing the full flow:
 *   - Students: 23DIT015 (Kartik Guleria), 23DIT071 (Ansh Singh)
 *   - Guide: kartik.guleria@gmail.com (Kartik Guleria)
 *   - Sends credentials email to kartikguleria1032@gmail.com (guide)
 *   - Sends credentials email to 23dit015@charusat.edu.in & 23dit071@charusat.edu.in
 *
 * Usage:
 *   node scripts/setupDummyTest.js
 *   node scripts/setupDummyTest.js --dry-run     (preview without changes)
 *   node scripts/setupDummyTest.js --send-emails  (also send credential emails)
 */

const mongoose = require('mongoose')
const path = require('path')
const Module = require('module')
require('dotenv').config({ path: '.env.local' })

// Register @ alias
const origResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2))
  }
  return origResolve.call(this, request, parent, isMain, options)
}

let User, ProjectGroup

async function importModels() {
  const UserModule = await import('../src/models/User.js')
  const ProjectGroupModule = await import('../src/models/ProjectGroup.js')
  User = UserModule.default
  ProjectGroup = ProjectGroupModule.default
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const sendEmails = args.includes('--send-emails')

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║     EvalProX - Dummy Test Group Setup Script            ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`  Dry Run:      ${dryRun ? 'YES' : 'NO'}`)
  console.log(`  Send Emails:  ${sendEmails ? 'YES' : 'NO'}`)
  console.log()

  await importModels()
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evalprox')
  console.log('🔌 Connected to MongoDB\n')

  // ── 1. Find the two students ──
  const student1 = await User.findOne({ 'academicInfo.rollNumber': { $regex: /^23DIT015$/i } })
  const student2 = await User.findOne({ 'academicInfo.rollNumber': { $regex: /^23DIT071$/i } })

  if (!student1) { console.error('❌ Student 23DIT015 not found in DB'); process.exit(1) }
  if (!student2) { console.error('❌ Student 23DIT071 not found in DB'); process.exit(1) }

  console.log('✅ Found Student 1:', student1.academicInfo?.name, '|', student1.email)
  console.log('✅ Found Student 2:', student2.academicInfo?.name, '|', student2.email)

  // ── 2. Find the guide ──
  const guide = await User.findOne({ email: 'kartik.guleria@gmail.com' })
  if (!guide) { console.error('❌ Guide kartik.guleria@gmail.com not found in DB'); process.exit(1) }
  console.log('✅ Found Guide:', guide.academicInfo?.name || 'Kartik Guleria', '|', guide.email)
  console.log()

  // ── 3. Check if dummy group already exists ──
  const existingDummy = await ProjectGroup.findOne({ title: 'EvalProX Demo – Test Project' })
  if (existingDummy) {
    console.log('⚠️  Dummy group "EvalProX Demo – Test Project" already exists!')
    console.log(`   Group ID: ${existingDummy.groupId}`)
    console.log('   Skipping creation. Delete it manually if you want to recreate.')
  }

  // ── 4. Create dummy project group ──
  if (!existingDummy && !dryRun) {
    const dummyGroup = new ProjectGroup({
      title: 'EvalProX Demo – Test Project',
      description: 'A dummy project group created for testing the complete EvalProX workflow: HOD approval → guide assignment → report submission → grading → progress tracking.',
      domain: 'Web Development',
      technology: 'Next.js, MongoDB, Tailwind CSS, Socket.IO',
      department: 'IT',
      semester: 6,
      members: [
        { student: student1._id, role: 'leader' },
        { student: student2._id, role: 'member' },
      ],
      leader: student1._id,
      createdBy: student1._id,
      status: 'submitted',
      hodApproval: 'pending',
      guideStatus: 'not-assigned',
    })

    await dummyGroup.save()
    console.log('🎉 Dummy project group created successfully!')
    console.log(`   Title:       ${dummyGroup.title}`)
    console.log(`   Group ID:    ${dummyGroup.groupId}`)
    console.log(`   Department:  ${dummyGroup.department}`)
    console.log(`   Semester:    ${dummyGroup.semester}`)
    console.log(`   Domain:      ${dummyGroup.domain}`)
    console.log(`   Leader:      ${student1.academicInfo?.name} (${student1.email})`)
    console.log(`   Member:      ${student2.academicInfo?.name} (${student2.email})`)
    console.log(`   Status:      ${dummyGroup.status}`)
    console.log(`   HOD Approval: ${dummyGroup.hodApproval}`)
    console.log(`   Chat Room:   ${dummyGroup.chatRoomId}`)
  } else if (dryRun) {
    console.log('[DRY RUN] Would create dummy group "EvalProX Demo – Test Project"')
    console.log('  Leader: 23DIT015 (Kartik Guleria)')
    console.log('  Member: 23DIT071 (Ansh Singh)')
    console.log('  Domain: Web Development')
    console.log('  Status: submitted → pending HOD approval')
  }

  // ── 5. Send credential emails ──
  if (sendEmails && !dryRun) {
    const { sendEmail } = await import('../src/lib/mailer.js')
    console.log('\n📧 Sending credential emails...\n')

    // Read passwords from credentials_generated.txt
    const credFile = require('fs').readFileSync(path.join(__dirname, '..', 'credentials_generated.txt'), 'utf-8')
    
    // Extract student team password (line before "Leader: 23DIT015")
    const teamMatch = credFile.match(/Password \(shared\):\s*(\S+)\n\s*Leader: 23DIT015/)
    const studentPassword = teamMatch ? teamMatch[1] : null
    if (!studentPassword) { console.error('❌ Could not find student password in credentials_generated.txt'); process.exit(1) }
    console.log(`  Student password (from credentials_generated.txt): ${studentPassword}`)

    // Send to Student 1 (23DIT015)
    try {
      const res = await sendEmail({
        to: '23dit015@charusat.edu.in',
        subject: 'EvalProX Portal – Your Dummy Test Group Credentials',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">EvalProX Portal – Test Group Credentials</h2>
            <p>Dear Kartik Guleria,</p>
            <p>A <strong>dummy test project group</strong> has been created for you to test the full EvalProX workflow.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Login Email:</strong> 23dit015@charusat.edu.in</p>
              <p><strong>Password:</strong> ${studentPassword}</p>
              <p><strong>Role:</strong> Student (Team Leader)</p>
              <p><strong>Project:</strong> EvalProX Demo – Test Project</p>
              <p><strong>Team:</strong> 23DIT015 (Leader), 23DIT071 (Member)</p>
            </div>
            <h3>Testing Flow:</h3>
            <ol>
              <li>Login → Your project shows as "Pending" HOD approval</li>
              <li>HOD (hodit@charusat.ac.in) will approve your project</li>
              <li>Admin/HOD assigns a guide (Kartik Guleria) to your group</li>
              <li>You can see your guide, submit reports, view grades</li>
              <li>Guide can grade reports, chat with your group</li>
            </ol>
            <p>Best Regards,<br/>EvalProX Admin Team</p>
          </div>
        `,
        text: `EvalProX Test Credentials\nEmail: 23dit015@charusat.edu.in\nPassword: ${studentPassword}\nProject: EvalProX Demo – Test Project`,
      })
      console.log(res.success ? '  ✅ Sent to 23dit015@charusat.edu.in' : `  ❌ Failed: ${res.error}`)
    } catch (e) { console.log(`  ❌ Error: ${e.message}`) }

    await sleep(1500)

    // Send to Student 2 (23DIT071)
    try {
      const res = await sendEmail({
        to: '23dit071@charusat.edu.in',
        subject: 'EvalProX Portal – Your Dummy Test Group Credentials',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">EvalProX Portal – Test Group Credentials</h2>
            <p>Dear Ansh Singh,</p>
            <p>A <strong>dummy test project group</strong> has been created for you to test the full EvalProX workflow.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Login Email:</strong> 23dit071@charusat.edu.in</p>
              <p><strong>Password:</strong> ${studentPassword}</p>
              <p><strong>Role:</strong> Student (Team Member)</p>
              <p><strong>Project:</strong> EvalProX Demo – Test Project</p>
              <p><strong>Team:</strong> 23DIT015 (Leader), 23DIT071 (Member)</p>
            </div>
            <p>Best Regards,<br/>EvalProX Admin Team</p>
          </div>
        `,
        text: `EvalProX Test Credentials\nEmail: 23dit071@charusat.edu.in\nPassword: ${studentPassword}\nProject: EvalProX Demo – Test Project`,
      })
      console.log(res.success ? '  ✅ Sent to 23dit071@charusat.edu.in' : `  ❌ Failed: ${res.error}`)
    } catch (e) { console.log(`  ❌ Error: ${e.message}`) }

    await sleep(1500)

    // Extract guide password
    const guideMatch = credFile.match(/kartik\.guleria@gmail\.com\s*\|\s*(\S+)/)
    const guidePassword = guideMatch ? guideMatch[1] : null
    if (!guidePassword) { console.error('❌ Could not find guide password in credentials_generated.txt'); process.exit(1) }
    console.log(`  Guide password (from credentials_generated.txt): ${guidePassword}\n`)
    try {
      const res = await sendEmail({
        to: 'kartikguleria1032@gmail.com',
        subject: 'EvalProX Portal – Your Guide Login Credentials',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">EvalProX Portal – Guide Login Credentials</h2>
            <p>Dear Kartik Guleria,</p>
            <p>Your guide account is set up on the EvalProX (SGP Evaluation Portal).</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Login Email:</strong> kartik.guleria@gmail.com</p>
              <p><strong>Password:</strong> ${guidePassword}</p>
              <p><strong>Role:</strong> Guide (Internal)</p>
            </div>
            <h3>What happens next:</h3>
            <ol>
              <li>The HOD IT (hodit@charusat.ac.in) will assign you to the test project group</li>
              <li>Login to see your assigned groups</li>
              <li>You can chat with the group, set deadlines, grade reports</li>
              <li>All activity is visible to Admin, Principal, HOD, and Project Coordinator</li>
            </ol>
            <p>Best Regards,<br/>EvalProX Admin Team</p>
          </div>
        `,
        text: `EvalProX Guide Credentials\nLogin Email: kartik.guleria@gmail.com\nPassword: ${guidePassword}\nPlease login at the portal.`,
      })
      console.log(res.success ? '  ✅ Sent to kartikguleria1032@gmail.com (guide credentials)' : `  ❌ Failed: ${res.error}`)
    } catch (e) { console.log(`  ❌ Error: ${e.message}`) }
  }

  // ── 6. Print all stakeholder credentials ──
  // Read credentials_generated.txt for current passwords
  let studentPwd = '(see credentials_generated.txt)'
  let guidePwd = '(see credentials_generated.txt)'
  try {
    const credContent = require('fs').readFileSync(path.join(__dirname, '..', 'credentials_generated.txt'), 'utf-8')
    const tm = credContent.match(/Password \(shared\):\s*(\S+)\n\s*Leader: 23DIT015/)
    if (tm) studentPwd = tm[1]
    const gm = credContent.match(/kartik\.guleria@gmail\.com\s*\|\s*(\S+)/)
    if (gm) guidePwd = gm[1]
  } catch(e) {}

  console.log('\n')
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                    ALL STAKEHOLDER LOGIN CREDENTIALS                        ║')
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣')
  console.log('║                                                                             ║')
  console.log('║  🔴 ADMIN / MAIN ADMIN                                                     ║')
  console.log('║     Email:    admin@charusat.edu.in                                         ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log('║  🟣 PRINCIPAL                                                               ║')
  console.log('║     Email:    principal@charusat.ac.in                                      ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log('║  🟠 HOD IT                                                                  ║')
  console.log('║     Email:    hodit@charusat.ac.in                                          ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║     (This HOD will approve the dummy group & assign the guide)              ║')
  console.log('║                                                                             ║')
  console.log('║  🟠 HOD CSE                                                                 ║')
  console.log('║     Email:    hodcse@charusat.ac.in                                         ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log('║  🟠 HOD CE                                                                  ║')
  console.log('║     Email:    hodce@charusat.ac.in                                          ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log('║  🔵 PROJECT COORDINATOR IT                                                  ║')
  console.log('║     Email:    pcit@charusat.ac.in                                           ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log('║  🔵 PROJECT COORDINATOR CSE                                                 ║')
  console.log('║     Email:    pccse@charusat.ac.in                                          ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log('║  🔵 PROJECT COORDINATOR CE                                                  ║')
  console.log('║     Email:    pcce@charusat.ac.in                                           ║')
  console.log('║     Password: charusat@123                                                  ║')
  console.log('║                                                                             ║')
  console.log(`║  🟢 GUIDE (Kartik Guleria)                                                  ║`)
  console.log(`║     Email:    kartik.guleria@gmail.com                                      ║`)
  console.log(`║     Password: ${guidePwd.padEnd(45)}║`)
  console.log(`║     (Credentials sent to: kartikguleria1032@gmail.com)                      ║`)
  console.log('║                                                                             ║')
  console.log(`║  🟡 STUDENT – Kartik Guleria (Leader, 23DIT015)                             ║`)
  console.log(`║     Email:    23dit015@charusat.edu.in                                      ║`)
  console.log(`║     Password: ${studentPwd.padEnd(45)}║`)
  console.log('║                                                                             ║')
  console.log(`║  🟡 STUDENT – Ansh Singh (Member, 23DIT071)                                 ║`)
  console.log(`║     Email:    23dit071@charusat.edu.in                                      ║`)
  console.log(`║     Password: ${studentPwd.padEnd(45)}║`)
  console.log('║                                                                             ║')
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣')
  console.log('║                         TESTING WORKFLOW                                    ║')
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣')
  console.log('║                                                                             ║')
  console.log('║  1. Login as HOD IT (hodit@charusat.ac.in)                                  ║')
  console.log('║     → Go to Projects → Find "EvalProX Demo – Test Project"                 ║')
  console.log('║     → Click Approve                                                        ║')
  console.log('║                                                                             ║')
  console.log('║  2. Login as Admin (admin@charusat.edu.in)                                  ║')
  console.log('║     → Go to Projects → Find the test project → Assign Guide                ║')
  console.log('║     → Select "Kartik Guleria" as Internal Guide                             ║')
  console.log('║                                                                             ║')
  console.log('║  3. Login as Guide (kartik.guleria@gmail.com)                               ║')
  console.log('║     → See assigned group → Chat with students                               ║')
  console.log('║     → Grade submitted reports → View progress                               ║')
  console.log('║                                                                             ║')
  console.log('║  4. Login as Student (23dit015@charusat.edu.in)                              ║')
  console.log('║     → See project with assigned guide → Submit reports                      ║')
  console.log('║     → View grades and feedback                                              ║')
  console.log('║                                                                             ║')
  console.log('║  5. Login as Principal/PC to view and monitor everything                    ║')
  console.log('║                                                                             ║')
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝')

  await mongoose.disconnect()
  console.log('\n✅ Done!')
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
