import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { ROLES } from '@/lib/roles'
import ExcelJS from 'exceljs'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/mailer'

// Department code mapping for email generation
const DEPT_CODE_MAP = {
  CSE: 'dcs',
  CE: 'dce',
  IT: 'dit',
}

// Generate email from name and department
// e.g. "Akash Patel" + "IT" → "akashpatel.dit@charusat.ac.in"
function generateEmail(name, department) {
  const deptCode = DEPT_CODE_MAP[department?.toUpperCase()] || department?.toLowerCase() || 'dit'
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('')
  return `${namePart}.${deptCode}@charusat.ac.in`
}

// Generate password from name and department
// e.g. "Akash Patel" + "IT" → "AkashPatel@DIT24"
function generatePassword(name, department) {
  const deptUpper = department?.toUpperCase() || 'DIT'
  const deptCode = deptUpper === 'CSE' ? 'DCS' : deptUpper === 'CE' ? 'DCE' : 'DIT'
  const pascalName = name
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
  return `${pascalName}@${deptCode}24`
}

// Download Excel template for guide import
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || ![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Guides')

    worksheet.columns = [
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Department (CSE/CE/IT)', key: 'department', width: 22 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Specialization', key: 'specialization', width: 30 },
      { header: 'Education', key: 'education', width: 25 },
    ]

    // Style header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Sample rows
    worksheet.addRow({ name: 'Akash Patel', department: 'IT', phone: '9876543210', specialization: 'Machine Learning', education: 'Ph.D. Computer Science' })
    worksheet.addRow({ name: 'Priya Sharma', department: 'CSE', phone: '9876543211', specialization: 'Data Structures', education: 'M.Tech CSE' })
    worksheet.addRow({ name: 'Raj Mehta', department: 'CE', phone: '9876543212', specialization: 'Embedded Systems', education: 'M.E. EC' })

    // Info note
    const noteRow = worksheet.addRow([])
    worksheet.addRow(['NOTE: Email and password are auto-generated from name + department. Do NOT include email/password columns.'])
    worksheet.getRow(noteRow.number + 1).getCell(1).font = { italic: true, color: { argb: 'FF888888' } }

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="guide_import_template.xlsx"',
      },
    })
  } catch (error) {
    console.error('Template error:', error)
    return NextResponse.json({ message: 'Failed to generate template' }, { status: 500 })
  }
}

// Import guides from Excel — auto-generates email & password
// Also handles sendEmailsOnly JSON requests
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || ![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    // Handle "Send Emails Only" request (JSON body with pre-existing credentials)
    if (contentType.includes('application/json')) {
      const { sendEmailsOnly, credentials } = await request.json()
      if (sendEmailsOnly && Array.isArray(credentials)) {
        let sent = 0
        for (const cred of credentials) {
          try {
            await sendEmail({
              to: cred.email,
              subject: 'EvalProX – Your Login Credentials',
              html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
                  <h2 style="color:#2563eb;margin-bottom:8px">Welcome to EvalProX</h2>
                  <p>Dear <strong>${cred.name}</strong>,</p>
                  <p>Your guide account has been created. Here are your login credentials:</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <tr>
                      <td style="padding:8px;background:#f1f5f9;font-weight:bold;width:40%">Email</td>
                      <td style="padding:8px;background:#f8fafc">${cred.email}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;background:#f1f5f9;font-weight:bold">Password</td>
                      <td style="padding:8px;background:#f8fafc;font-family:monospace">${cred.password}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;background:#f1f5f9;font-weight:bold">Department</td>
                      <td style="padding:8px;background:#f8fafc">${cred.department}</td>
                    </tr>
                  </table>
                  <p style="color:#ef4444;font-size:13px">⚠️ Please change your password after your first login.</p>
                  <p style="color:#6b7280;font-size:12px">Do not share your credentials with anyone.</p>
                </div>
              `,
            })
            sent++
          } catch (err) {
            console.error(`Email send failed for ${cred.email}:`, err.message)
          }
        }
        return NextResponse.json({ message: `Emails sent to ${sent} guide(s)`, sent })
      }
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    await dbConnect()

    const formData = await request.formData()
    const file = formData.get('file')
    const sendCredentials = formData.get('sendCredentials') === 'true'

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]

    const created = []
    const skipped = []
    const errors = []

    // Skip header row (row 1)
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      const name = row.getCell(1).value?.toString()?.trim()
      const department = row.getCell(2).value?.toString()?.trim()?.toUpperCase()
      const phone = row.getCell(3).value?.toString()?.trim() || ''
      const specialization = row.getCell(4).value?.toString()?.trim() || ''
      const education = row.getCell(5).value?.toString()?.trim() || ''

      // Skip empty or note rows
      if (!name || name.startsWith('NOTE')) continue
      if (!department || !['CSE', 'CE', 'IT'].includes(department)) {
        errors.push(`Row ${i}: Invalid or missing department (${department}). Use CSE, CE, or IT.`)
        continue
      }

      try {
        const email = generateEmail(name, department)
        const plainPassword = generatePassword(name, department)

        // Check if guide already exists
        const existing = await User.findOne({ email })
        if (existing) {
          skipped.push({ name, email, reason: 'Already exists' })
          continue
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10)

        await User.create({
          email,
          password: hashedPassword,
          role: 'guide',
          guideType: 'internal',
          department,
          university: 'CHARUSAT',
          institute: 'DEPSTAR',
          academicInfo: {
            name,
            phoneNumber: phone,
          },
          specialization,
          education,
          isOnboarded: true,
          isRegistered: true,
          isApproved: true,
          approvalStatus: 'approved',
          isActive: true,
          isEmailVerified: true,
        })

        created.push({ name, email, password: plainPassword, department })

        // Send credentials email if requested
        if (sendCredentials) {
          try {
            await sendEmail({
              to: email,
              subject: 'EvalProX – Your Login Credentials',
              html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
                  <h2 style="color:#2563eb;margin-bottom:8px">Welcome to EvalProX</h2>
                  <p>Dear <strong>${name}</strong>,</p>
                  <p>Your guide account has been created. Here are your login credentials:</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <tr>
                      <td style="padding:8px;background:#f1f5f9;font-weight:bold;width:40%">Email</td>
                      <td style="padding:8px;background:#f8fafc">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;background:#f1f5f9;font-weight:bold">Password</td>
                      <td style="padding:8px;background:#f8fafc;font-family:monospace">${plainPassword}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;background:#f1f5f9;font-weight:bold">Department</td>
                      <td style="padding:8px;background:#f8fafc">${department}</td>
                    </tr>
                  </table>
                  <p style="color:#ef4444;font-size:13px">⚠️ Please change your password after your first login.</p>
                  <p style="color:#6b7280;font-size:12px">Do not share your credentials with anyone.</p>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error(`Email send failed for ${email}:`, emailErr.message)
          }
        }
      } catch (err) {
        errors.push(`Row ${i} (${name}): ${err.message}`)
      }
    }

    return NextResponse.json({
      message: `Import complete: ${created.length} created, ${skipped.length} skipped, ${errors.length} errors`,
      created,
      skipped,
      errors,
      emailsSent: sendCredentials,
    })
  } catch (error) {
    console.error('Guide import error:', error)
    return NextResponse.json({ message: 'Import failed', error: error.message }, { status: 500 })
  }
}
