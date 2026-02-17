import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

// Don't throw at import time — allows build to succeed without env vars
// The check is moved into dbConnect() which runs only at request time

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  const uri = process.env.MONGODB_URI || MONGODB_URI
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Performance: connection pool for 1000 concurrent users
      maxPoolSize: 50,        // Allow up to 50 simultaneous connections
      minPoolSize: 5,         // Keep 5 connections ready
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      serverSelectionTimeoutMS: 5000, // Fail fast on server selection
      heartbeatFrequencyMS: 10000,    // Check server health every 10s
      maxIdleTimeMS: 30000,   // Close idle connections after 30s
    }

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect 