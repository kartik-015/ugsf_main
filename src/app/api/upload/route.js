import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

import cloudinary from '@/lib/cloudinary'

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

    // Upload to Cloudinary
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        resource_type: 'raw',
        folder: 'ugsf-reports',
        public_id: `${Date.now()}_${safeName}`.replace(/\.[^.]+$/, ''),
        format: 'pdf',
      }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      }).end(buffer)
    })
    const url = uploadRes.secure_url
    return NextResponse.json({ success: true, url, filename: safeName })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
