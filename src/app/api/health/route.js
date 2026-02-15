import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import mongoose from 'mongoose'
import { smtpConfigured } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = {
    timestamp: new Date().toISOString(),
    db: 'disconnected',
    smtp: smtpConfigured() ? 'configured' : 'not-configured'
  }
  try {
    await dbConnect()
    result.db = mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
  } catch (e) {
    result.db = 'error'
    result.dbError = e.message
  }
  return NextResponse.json(result)
}
