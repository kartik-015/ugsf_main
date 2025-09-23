'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Search, Eye, Edit, Mail, Phone, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CounselorsPage() {
  const { data: session } = useSession()
  const [faculty, setFaculty] = useState([]) // TODO rename guides if counselors listing guides
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchCounselors = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/counselors?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFaculty(data.counselors || [])
      } else {
        toast.error('Failed to fetch counselors')
      }
    } catch (error) {
      toast.error('Error fetching counselors')
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    fetchCounselors()
  }, [fetchCounselors])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Guides
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage guides
            </p>
          </div>
          {session?.user?.role === 'admin' && (
            <button className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Guide
            </button>
          )}
        </div>

        {/* Search */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Guides
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="input pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Counselors List */}
        <div className="grid gap-6">
          {counselors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No guides found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {faculty.map((counselor) => (
                <motion.div
                  key={counselor._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="card p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {counselor.academicInfo?.name || counselor.email.split('@')[0]}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {counselor.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                          Guide
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {counselor.department}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {counselor.academicInfo?.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{counselor.academicInfo.phoneNumber}</span>
                      </div>
                    )}
                    {counselor.academicInfo?.address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Address:</span>
                        <p className="mt-1">{counselor.academicInfo.address}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline btn-sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button className="btn btn-outline btn-sm">
                      <Mail className="w-4 h-4 mr-1" />
                      Contact
                    </button>
                    {session?.user?.role === 'admin' && (
                      <button className="btn btn-outline btn-sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
