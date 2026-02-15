'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeDeptId, setActiveDeptId] = useState(null)
  const activeDeptRef = useRef(null)

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('activeDeptId') : null
      if (saved) {
        activeDeptRef.current = saved
        setActiveDeptId(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      setIsConnected(true)
      if (activeDeptRef.current) {
        try {
          socketInstance.emit('dept:join', { deptId: activeDeptRef.current })
        } catch {}
      }
    })

    socketInstance.on('connect_error', () => {
      setIsConnected(false)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    let keepaliveTimer = null
    const startKeepalive = () => {
      if (keepaliveTimer) return
      keepaliveTimer = setInterval(() => {
        try { socketInstance.emit('keepalive') } catch {}
      }, 20000)
    }

    socketInstance.on('connect', startKeepalive)
    socketInstance.on('disconnect', () => {
      if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null }
    })

    return () => {
      socketInstance.removeAllListeners()
      socketInstance.disconnect()
    }
  }, [])

  const selectDepartment = (deptId) => {
    const prev = activeDeptRef.current
    if (socket?.connected) {
      if (prev && prev !== deptId) {
        try { socket.emit('dept:leave', { deptId: prev }) } catch {}
      }
      if (deptId) {
        try { socket.emit('dept:join', { deptId }) } catch {}
      }
    }
    activeDeptRef.current = deptId || null
    setActiveDeptId(deptId || null)
    try {
      if (deptId) localStorage.setItem('activeDeptId', deptId)
      else localStorage.removeItem('activeDeptId')
    } catch {}
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected: isConnected,
        activeDeptId,
        selectDepartment,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
