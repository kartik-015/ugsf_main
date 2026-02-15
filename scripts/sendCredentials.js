/**
 * Send Credentials Script
 * ========================
 * Reads credentials_generated.txt and emails login credentials
 * to students and/or guides stored in the database.
 *
 * Usage:
 *   node --loader ./scripts/loader.mjs scripts/sendCredentials.js --students
 *   node --loader ./scripts/loader.mjs scripts/sendCredentials.js --guides
 *   node --loader ./scripts/loader.mjs scripts/sendCredentials.js --all
 *   node --loader ./scripts/loader.mjs scripts/sendCredentials.js --students --dry-run
 *
 * Options:
 *   --students    Send credentials to all student team members
 *   --guides      Send credentials to all guides
 *   --all         Send to both students and guides
 *   --dry-run     Show what would be sent without actually sending
 *   --delay <ms>  Delay between emails in ms (default: 1500)
 */

const mongoose = require('mongoose')
const fs = require('fs')
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

function parseCredentialsFile() {
  const filePath = path.join(__dirname, '..', 'credentials_generated.txt')
  if (!fs.existsSync(filePath)) {
    console.error('❌ credentials_generated.txt not found. Run importRealData.js first.')
    process.exit(1)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const teams = []
  const guides = []
  let currentTeam = null
  let section = 'students' // 'students' or 'guides'

  for (const line of lines) {
    if (line.includes('=== GUIDE CREDENTIALS ===')) {
      section = 'guides'
      if (currentTeam) teams.push(currentTeam)
      currentTeam = null
      continue
    }

    if (section === 'students') {
      const teamMatch = line.match(/^--- Team: (.+?) \(Sem (\d+)\) ---$/)
      if (teamMatch) {
        if (currentTeam) teams.push(currentTeam)
        currentTeam = { title: teamMatch[1], semester: parseInt(teamMatch[2]), password: '', members: [] }
        continue
      }

      const passMatch = line.match(/^\s+Password \(shared\): (.+)$/)
      if (passMatch && currentTeam) {
        currentTeam.password = passMatch[1].trim()
        continue
      }

      const memberMatch = line.match(/^\s+(Leader|Member): (\S+) \| (.+?) \| (\S+@\S+)$/)
      if (memberMatch && currentTeam) {
        currentTeam.members.push({
          role: memberMatch[1].toLowerCase(),
          rollNumber: memberMatch[2],
          name: memberMatch[3].trim(),
          email: memberMatch[4].trim(),
        })
        continue
      }
    }

    if (section === 'guides') {
      const guideMatch = line.match(/^(\S+@\S+)\s*\|\s*(.+)$/)
      if (guideMatch) {
        guides.push({
          email: guideMatch[1].trim(),
          password: guideMatch[2].trim(),
        })
      }
    }
  }
  if (currentTeam) teams.push(currentTeam)

  return { teams, guides }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const args = process.argv.slice(2)
  const sendStudents = args.includes('--students') || args.includes('--all')
  const sendGuides = args.includes('--guides') || args.includes('--all')
  const dryRun = args.includes('--dry-run')
  const delayIdx = args.indexOf('--delay')
  const delayMs = delayIdx !== -1 ? parseInt(args[delayIdx + 1]) || 1500 : 1500

  if (!sendStudents && !sendGuides) {
    console.log('Usage:')
    console.log('  node --loader ./scripts/loader.mjs scripts/sendCredentials.js --students')
    console.log('  node --loader ./scripts/loader.mjs scripts/sendCredentials.js --guides')
    console.log('  node --loader ./scripts/loader.mjs scripts/sendCredentials.js --all')
    console.log('  Add --dry-run to preview without sending')
    process.exit(0)
  }

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║       EvalProX - Send Credentials Email Script      ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  Send to Students: ${sendStudents ? 'YES' : 'NO'}`)
  console.log(`  Send to Guides:   ${sendGuides ? 'YES' : 'NO'}`)
  console.log(`  Dry Run:          ${dryRun ? 'YES' : 'NO'}`)
  console.log(`  Delay between:    ${delayMs}ms`)
  console.log()

  // Parse credentials
  const { teams, guides } = parseCredentialsFile()
  console.log(`📋 Found ${teams.length} teams, ${guides.length} guides in credentials file`)

  // Connect DB (needed for sendEmail)
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ugsf')
  console.log('🔌 Connected to MongoDB')

  const { sendEmail } = await import('../src/lib/mailer.js')

  let sentCount = 0
  let failCount = 0

  // Send to students
  if (sendStudents) {
    console.log('\n👨‍🎓 Sending credentials to students...')
    for (const team of teams) {
      for (const member of team.members) {
        const teamMemberList = team.members.map(m => m.rollNumber).join(', ')

        if (dryRun) {
          console.log(`  [DRY RUN] Would send to ${member.email} (${member.name}) - Team: ${team.title}`)
          sentCount++
          continue
        }

        try {
          const result = await sendEmail({
            to: member.email,
            subject: 'EvalProX Portal - Your Team Login Credentials',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a56db;">EvalProX Portal - Login Credentials</h2>
                <p>Dear ${member.name || member.rollNumber},</p>
                <p>Your account has been created on the EvalProX (SGP Evaluation Portal). Here are your login credentials:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Login Email:</strong> ${member.email}</p>
                  <p><strong>Password:</strong> ${team.password}</p>
                  <p><strong>Roll Number:</strong> ${member.rollNumber}</p>
                  <p><strong>Project:</strong> ${team.title}</p>
                  <p><strong>Semester:</strong> ${team.semester}</p>
                  <p><strong>Team Members:</strong> ${teamMemberList}</p>
                </div>
                <p><em>Note: All members of your team share the same password.</em></p>
                <p>Please login at the portal and verify your project details.</p>
                <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password after first login for security.</p>
                <p>Best Regards,<br/>EvalProX Admin Team</p>
              </div>
            `,
            text: `EvalProX Portal Credentials\nEmail: ${member.email}\nPassword: ${team.password}\nProject: ${team.title}\nAll team members share this password.\nPlease login and change your password.`,
          })

          if (result.success) {
            console.log(`  ✅ Sent to ${member.email} (${member.name})`)
            sentCount++
          } else {
            console.log(`  ❌ Failed: ${member.email} - ${result.error}`)
            failCount++
          }
        } catch (err) {
          console.log(`  ❌ Error: ${member.email} - ${err.message}`)
          failCount++
        }

        await sleep(delayMs) // Avoid SMTP rate limits
      }
    }
  }

  // Send to guides
  if (sendGuides) {
    console.log('\n👨‍🏫 Sending credentials to guides...')
    for (const guide of guides) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would send to ${guide.email}`)
        sentCount++
        continue
      }

      try {
        const result = await sendEmail({
          to: guide.email,
          subject: 'EvalProX Portal - Your Guide Login Credentials',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a56db;">EvalProX Portal - Guide Login Credentials</h2>
              <p>Dear Faculty,</p>
              <p>Your guide account has been created on the EvalProX (SGP Evaluation Portal).</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>Login Email:</strong> ${guide.email}</p>
                <p><strong>Password:</strong> ${guide.password}</p>
              </div>
              <p>Please login at the portal to view and manage your assigned project groups.</p>
              <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password after first login for security.</p>
              <p>Best Regards,<br/>EvalProX Admin Team</p>
            </div>
          `,
          text: `EvalProX Portal - Guide Credentials\nEmail: ${guide.email}\nPassword: ${guide.password}\nPlease login and change your password.`,
        })

        if (result.success) {
          console.log(`  ✅ Sent to ${guide.email}`)
          sentCount++
        } else {
          console.log(`  ❌ Failed: ${guide.email} - ${result.error}`)
          failCount++
        }
      } catch (err) {
        console.log(`  ❌ Error: ${guide.email} - ${err.message}`)
        failCount++
      }

      await sleep(delayMs)
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║                    EMAIL SUMMARY                    ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log(`║  Sent:    ${String(sentCount).padEnd(40)} ║`)
  console.log(`║  Failed:  ${String(failCount).padEnd(40)} ║`)
  console.log('╚══════════════════════════════════════════════════════╝')

  await mongoose.disconnect()
  console.log('\n✅ Done!')
}

main().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
