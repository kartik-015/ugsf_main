import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import ReportFile from '@/models/ReportFile'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return new NextResponse('Missing id parameter', { status: 400 })

    await dbConnect()
    const reportFile = await ReportFile.findById(id).select('filename contentType data').lean()
    if (!reportFile) return new NextResponse('File not found', { status: 404 })

    // MongoDB Binary (BSON) → Node.js Buffer
    const rawData = reportFile.data
    const buffer = Buffer.isBuffer(rawData)
      ? rawData
      : rawData?.buffer
        ? Buffer.from(rawData.buffer)
        : Buffer.from(rawData)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${reportFile.filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('PDF serve error:', error)
    return new NextResponse('Error serving file', { status: 500 })
  }
}
