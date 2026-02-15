import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ReportFile from '@/models/ReportFile'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return new NextResponse('Missing file ID', { status: 400 })

    await connectDB()
    const file = await ReportFile.findById(id)
    if (!file) return new NextResponse('File not found', { status: 404 })

    return new NextResponse(file.data, {
      headers: {
        'Content-Type': file.contentType || 'application/pdf',
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Content-Length': String(file.data.length),
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('PDF serve error:', error)
    return new NextResponse('Error serving file', { status: 500 })
  }
}
