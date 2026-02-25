import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import ReportFile from '@/models/ReportFile'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await dbConnect()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Store PDF binary in MongoDB (works on Vercel — no local filesystem needed)
    const reportFile = await ReportFile.create({
      filename: safeName,
      contentType: 'application/pdf',
      data: buffer,
      size: buffer.length,
      uploadedBy: session.user.id,
    })

    // Return a URL that serves from MongoDB via the PDF route
    const url = `/api/reports/pdf?id=${reportFile._id}`
    return NextResponse.json({ success: true, url, filename: safeName })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 })
  }
}
