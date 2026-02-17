import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')
    if (!file) return new NextResponse('Missing file parameter', { status: 400 })

    // Sanitize to prevent directory traversal
    const safeFile = path.basename(file)
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'reports', safeFile)

    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    const buffer = await readFile(filePath)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFile}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('PDF serve error:', error)
    return new NextResponse('Error serving file', { status: 500 })
  }
}
