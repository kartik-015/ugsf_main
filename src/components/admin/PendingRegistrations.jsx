'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, UserCheck, Clock, Mail, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PendingRegistrations({ onUpdate }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch('/api/admin/pending-registrations?status=pending')
      if (res.ok) {
        const data = await res.json()
        setPendingUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching pending users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const handleApproval = async (userId, action) => {
    setProcessing(userId)
    try {
      const res = await fetch('/api/admin/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (res.ok) {
        toast.success(action === 'approve' ? 'User approved successfully!' : 'User rejected')
        setPendingUsers(prev => prev.filter(u => u._id !== userId))
        if (onUpdate) onUpdate()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Action failed')
      }
    } catch (error) {
      toast.error('Error processing request')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="text-center py-12">
        <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No pending registrations</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All registrations have been processed</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Pending Registrations ({pendingUsers.length})
      </h2>
      
      <div className="grid gap-4">
        <AnimatePresence>
          {pendingUsers.map((user, index) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === 'student' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                    {user.academicInfo?.name && (
                      <div>
                        <span className="text-gray-500">Name:</span> {user.academicInfo.name}
                      </div>
                    )}
                    {user.department && (
                      <div>
                        <span className="text-gray-500">Department:</span> {user.department}
                      </div>
                    )}
                    {user.admissionYear && (
                      <div>
                        <span className="text-gray-500">Admission:</span> {user.admissionYear}
                      </div>
                    )}
                    {user.academicInfo?.rollNumber && (
                      <div>
                        <span className="text-gray-500">Roll:</span> {user.academicInfo.rollNumber}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(user.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleApproval(user._id, 'approve')}
                    disabled={processing === user._id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(user._id, 'reject')}
                    disabled={processing === user._id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
