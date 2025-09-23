import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { ROLES, ADMIN_ROLES } from '@/lib/roles'
import ExcelJS from 'exceljs'

export async function POST(request){
  try {
    const session = await getServerSession(authOptions)
    if(!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (![...ADMIN_ROLES, ROLES.HOD].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }
    await dbConnect()
    const body = await request.json().catch(()=> ({}))
    const ids = Array.isArray(body.ids)? body.ids: []
    const requested = Array.isArray(body.fields)? body.fields: []
    if(!ids.length) return NextResponse.json({ message: 'No ids provided' }, { status: 400 })

    const guides = await User.find({ _id: { $in: ids } }).select('-password').sort({ 'academicInfo.name': 1, email: 1 })

    const baseColumns = [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width: 14 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Specialization', key: 'specialization', width: 22 },
      { header: 'Education', key: 'education', width: 26 },
      { header: 'University', key: 'university', width: 16 },
      { header: 'Institute', key: 'institute', width: 16 }
    ]
    const finalColumns = requested.length ? baseColumns.filter(c => ['name','email'].includes(c.key) || requested.includes(c.key)) : baseColumns

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Guides')
    ws.columns = finalColumns

    guides.forEach(g => {
      ws.addRow({
        name: g.academicInfo?.name || '',
        email: g.email,
        department: g.department || '',
        role: g.role,
        specialization: g.specialization || '',
        education: g.education || '',
        university: g.university || '',
        institute: g.institute || ''
      })
    })

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="guides_export.xlsx"'
      }
    })
  } catch (error) {
    console.error('Guides export error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
