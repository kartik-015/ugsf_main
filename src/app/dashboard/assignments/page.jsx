'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Upload, Download, Eye, Edit, Plus, Calendar, BookOpen, Sparkles, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AssignmentsPage() {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [subjects, setSubjects] = useState([])
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, 50])

  const fetchAssignments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedSubject) params.append('subject', selectedSubject)
      
      const response = await fetch(`/api/assignments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments || [])
      } else {
        toast.error('Failed to fetch assignments')
      }
    } catch (error) {
      toast.error('Error fetching assignments')
    } finally {
      setLoading(false)
    }
  }, [selectedSubject])

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await fetch('/api/subjects')
      if (response.ok) {
        const data = await response.json()
        setSubjects(data.subjects || [])
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
    fetchSubjects()
  }, [fetchAssignments, fetchSubjects])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (dueDate) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'text-red-600'
    if (diffDays <= 3) return 'text-orange-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 blur-xl"
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Assignments
            </motion.h1>
            <motion.p 
              className="text-gray-600 dark:text-gray-300 mt-2 text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Manage and view your assignments with style ✨
            </motion.p>
            <motion.div
              className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          {session?.user?.role === 'guide' && (
            <motion.button 
              className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Create Assignment
              </div>
              <motion.div
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
            </motion.button>
          )}
        </div>

        {/* Enhanced Filters */}
        <motion.div 
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 mb-6 border border-white/20 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Subject
              </label>
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
                </select>
                <motion.div
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  animate={{ rotate: selectedSubject ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Zap className="w-4 h-4 text-gray-400" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Assignments List */}
        <div className="grid gap-6">
          {assignments.length === 0 ? (
            <motion.div 
              className="text-center py-16 backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-white/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No assignments found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {session?.user?.role === 'guide' 
                  ? 'Create your first assignment to get started.'
                  : 'No assignments have been posted yet.'
                }
              </p>
            </motion.div>
          ) : (
            assignments.map((assignment, index) => (
              <motion.div
                key={assignment._id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.5,
                  delay: index * 0.1
                }}
                whileHover={{ 
                  scale: 1.02,
                  y: -5
                }}
                className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </motion.div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {assignment.subject?.code} - {assignment.subject?.name}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors duration-300">
                      {assignment.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                      {assignment.description}
                    </p>
                  </div>
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className={`text-sm font-semibold ${getStatusColor(assignment.dueDate)}`}>
                      Due: {formatDate(assignment.dueDate)}
                    </span>
                  </motion.div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                      Max Marks: {assignment.maxMarks}
                    </span>
                    {assignment.attachments?.length > 0 && (
                      <span className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                        {assignment.attachments.length} attachment(s)
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <motion.button 
                      className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-300 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </motion.button>
                    {session?.user?.role === 'student' && (
                      <motion.button 
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Upload className="w-4 h-4" />
                        Submit
                      </motion.button>
                    )}
                    {session?.user?.role === 'guide' && (
                      <motion.button 
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm hover:bg-green-50 dark:hover:bg-green-900/30 transition-all duration-300 flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

