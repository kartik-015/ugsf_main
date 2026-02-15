'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import PendingRegistrations from '@/components/admin/PendingRegistrations'

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  if (!session || !['admin', 'mainadmin'].includes(session.user.role)) {
    return null
  }

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
    // Could also refresh stats here if needed
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Pending Approvals</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Review and approve/reject new registrations
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <PendingRegistrations key={refreshKey} onUpdate={handleUpdate} />
        </div>
      </motion.div>
    </div>
  )
}
