const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  const io = new Server(server, {
    cors: {
    // In dev reflect the request origin to avoid mismatches; in production set NEXTAUTH_URL env var
    origin: process.env.NEXTAUTH_URL || true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
    }
  })

  // Increase heartbeat settings to tolerate proxies and slow networks
  io.engine.pingInterval = 25000
  io.engine.pingTimeout = 60000

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'from', socket.handshake.address)

    // Add basic health checks
    socket.on('error', (err) => {
      console.error('Socket error for', socket.id, err)
    })

    socket.on('join-room', (room) => {
      socket.join(room)
      console.log(`Client ${socket.id} joined room: ${room}`)
    })

    socket.on('leave-room', (room) => {
      socket.leave(room)
      console.log(`Client ${socket.id} left room: ${room}`)
    })

    socket.on('keepalive', () => {
      // Optionally, we can touch the socket so the server knows client is alive
      // Minimal logging to avoid noise
      // console.debug(`Keepalive from ${socket.id}`)
    })

    // Allow client to join its user room for targeted events
    socket.on('auth:identify', (userId) => {
      if (!userId) return
      try {
        socket.join(`user-${userId}`)
      } catch (e) {
        console.error('Failed joining user room', userId, e)
      }
    })

    // Principal -> Admin message (already persisted via HTTP). This is optional real-time relay if UI chooses sockets directly.
    socket.on('principal:message', (payload) => {
      // Expect: { toUserId, fromUserId, page, message, tempId }
      if (!payload?.toUserId || !payload?.fromUserId) return
      io.to(`user-${payload.toUserId}`).emit('principal:message', payload)
    })

    // Admin -> Principal reply
    socket.on('admin:reply', (payload) => {
      // Expect: { toUserId, fromUserId, page, message, tempId }
      if (!payload?.toUserId || !payload?.fromUserId) return
      io.to(`user-${payload.toUserId}`).emit('admin:reply', payload)
    })

    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'reason:', reason)
    })
  })

  // Make io available globally for API routes
  global.io = io

  const PORT = process.env.PORT || 3000
  server.listen(PORT, "localhost", () => {
    console.log(`> Ready on http://localhost:${PORT}`)
  })
})

// Helper function to send notifications
global.sendNotification = (userId, notification) => {
  if (global.io) {
    global.io.to(`user-${userId}`).emit('notification', notification)
  }
} 