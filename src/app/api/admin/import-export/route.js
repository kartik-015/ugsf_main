import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { ROLES } from '@/lib/roles'
import ExcelJS from 'exceljs'
import bcrypt from 'bcryptjs'
import { calculateCurrentSemester } from '@/lib/semester'

// Import students/guides from Excel
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || ![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const formData = await request.formData()
    const file = formData.get('file')
    const mode = formData.get('mode') // 'create' or 'append'
    const userType = formData.get('userType') // 'student' or 'guide'

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    
    const worksheet = workbook.worksheets[0]
    const results = {
      success: 0,
      failed: 0,
      errors: []
    }

    // Skip header row
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      
      try {
        if (userType === 'student') {
          const email = row.getCell(1).value?.toString().toLowerCase()
          const password = row.getCell(2).value?.toString() || 'Student@123'
          const name = row.getCell(3).value?.toString()
          const department = row.getCell(4).value?.toString()
          const admissionYear = parseInt(row.getCell(5).value)
          const batch = row.getCell(6).value?.toString()
          const phoneNumber = row.getCell(7).value?.toString()

          if (!email || !name || !department || !admissionYear) {
            results.failed++
            results.errors.push(`Row ${i}: Missing required fields`)
            continue
          }

          // Check if user exists
          const existing = await User.findOne({ email })
          
          if (mode === 'create' && existing) {
            results.failed++
            results.errors.push(`Row ${i}: User ${email} already exists`)
            continue
          }

          if (mode === 'append' && !existing) {
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10)
            const semester = calculateCurrentSemester(admissionYear)
            
            await User.create({
              email,
              password: hashedPassword,
              role: 'student',
              department,
              admissionYear,
              university: 'CHARUSAT',
              institute: 'DEPSTAR',
              academicInfo: {
                name,
                semester,
                batch,
                phoneNumber,
                rollNumber: email.split('@')[0].toUpperCase()
              },
              isOnboarded: true,
              isRegistered: true,
              isApproved: true,
              approvalStatus: 'approved',
              isActive: true,
              isEmailVerified: true
            })
            
            results.success++
          } else if (mode === 'create') {
            // Skip in create mode if exists
            results.failed++
            results.errors.push(`Row ${i}: User ${email} already exists`)
          }
          
        } else if (userType === 'guide') {
          const email = row.getCell(1).value?.toString().toLowerCase()
          const password = row.getCell(2).value?.toString() || 'Faculty@123'
          const name = row.getCell(3).value?.toString()
          const department = row.getCell(4).value?.toString()
          const specialization = row.getCell(5).value?.toString()
          const education = row.getCell(6).value?.toString()
          const phoneNumber = row.getCell(7).value?.toString()

          if (!email || !name || !department) {
            results.failed++
            results.errors.push(`Row ${i}: Missing required fields`)
            continue
          }

          const existing = await User.findOne({ email })
          
          if (mode === 'create' && existing) {
            results.failed++
            results.errors.push(`Row ${i}: User ${email} already exists`)
            continue
          }

          if (mode === 'append' && !existing) {
            const hashedPassword = await bcrypt.hash(password, 10)
            
            await User.create({
              email,
              password: hashedPassword,
              role: 'guide',
              department,
              university: 'CHARUSAT',
              institute: 'DEPSTAR',
              academicInfo: {
                name,
                phoneNumber
              },
              specialization,
              education,
              isOnboarded: true,
              isRegistered: true,
              isApproved: true,
              approvalStatus: 'approved',
              isActive: true,
              isEmailVerified: true
            })
            
            results.success++
          }
        }
        
      } catch (error) {
        results.failed++
        results.errors.push(`Row ${i}: ${error.message}`)
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} success, ${results.failed} failed`,
      results
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      message: 'Import failed', 
      error: error.message 
    }, { status: 500 })
  }
}

// Export template or data
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || ![ROLES.ADMIN, ROLES.MAIN_ADMIN].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'template' or 'data'
    const userType = searchParams.get('userType') // 'student' or 'guide'

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(userType === 'student' ? 'Students' : 'Guides')

    if (userType === 'student') {
      worksheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Password', key: 'password', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Admission Year', key: 'admissionYear', width: 15 },
        { header: 'Batch', key: 'batch', width: 10 },
        { header: 'Phone', key: 'phone', width: 15 }
      ]

      if (type === 'data') {
        await dbConnect()
        const students = await User.find({ role: 'student' })
          .select('email academicInfo department admissionYear')
          .sort({ admissionYear: -1, 'academicInfo.rollNumber': 1 })

        students.forEach(student => {
          worksheet.addRow({
            email: student.email,
            password: '****',
            name: student.academicInfo?.name || '',
            department: student.department || '',
            admissionYear: student.admissionYear || '',
            batch: student.academicInfo?.batch || '',
            phone: student.academicInfo?.phoneNumber || ''
          })
        })
      } else {
        // Add sample row
        worksheet.addRow({
          email: '25cse123@charusat.edu.in',
          password: 'Student@123',
          name: 'John Doe',
          department: 'CSE',
          admissionYear: 2025,
          batch: 'A',
          phone: '+919876543210'
        })
      }
    } else {
      worksheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Password', key: 'password', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Specialization', key: 'specialization', width: 30 },
        { header: 'Education', key: 'education', width: 20 },
        { header: 'Phone', key: 'phone', width: 15 }
      ]

      if (type === 'data') {
        await dbConnect()
        const guides = await User.find({ role: 'guide' })
          .select('email academicInfo department specialization education')
          .sort({ department: 1, 'academicInfo.name': 1 })

        guides.forEach(guide => {
          worksheet.addRow({
            email: guide.email,
            password: '****',
            name: guide.academicInfo?.name || '',
            department: guide.department || '',
            specialization: guide.specialization || '',
            education: guide.education || '',
            phone: guide.academicInfo?.phoneNumber || ''
          })
        })
      } else {
        worksheet.addRow({
          email: 'john.doe@charusat.edu.in',
          password: 'Faculty@123',
          name: 'Dr. John Doe',
          department: 'CSE',
          specialization: 'Machine Learning',
          education: 'Ph.D. in Computer Science',
          phone: '+919876543210'
        })
      }
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    
    const filename = type === 'template' 
      ? `${userType}_template.xlsx`
      : `${userType}_export_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ 
      message: 'Export failed', 
      error: error.message 
    }, { status: 500 })
  }
}
