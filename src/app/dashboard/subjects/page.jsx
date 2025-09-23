'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Download, Eye, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Subjects() {
  const { data: session } = useSession()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects')
      if (response.ok) {
        const data = await response.json()
        setSubjects(data.subjects)
      } else {
        toast.error('Failed to fetch subjects')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubject = async (formData) => {
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Subject created successfully')
        setShowCreateForm(false)
        fetchSubjects()
      } else {
        const error = await response.json()
        // Fix: Only pass string to toast.error
        if (typeof error === 'object') {
          toast.error(error.message || error.error?.message || 'Failed to create subject')
        } else {
          toast.error(String(error))
        }
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Subjects
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {session?.user.role === 'student' 
              ? 'Your enrolled subjects for this semester'
              : 'Manage course subjects and materials'
            }
          </p>
        </div>

  {['admin', 'guide'].includes(session?.user.role) && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </button>
        )}
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(subjects) ? subjects : []).map((subject, index) => (
          <motion.div
            key={subject._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="card p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {subject.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {subject.code}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                  {subject.credits} Credits
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Department:</span> {subject.department}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Semester:</span> {subject.semester}
              </p>
              {subject.faculty && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Guide:</span> {subject.faculty.academicInfo?.name || subject.faculty.email}
                </p>
              )}
            </div>

            {subject.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {subject.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Eye className="h-4 w-4" />
                </button>
                {subject.syllabus && (
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>

              {['admin', 'guide'].includes(session?.user.role) && (
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

  {(Array.isArray(subjects) && subjects.length === 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No subjects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {session?.user.role === 'student' 
              ? 'No subjects are available for your department and semester.'
              : 'No subjects have been created yet.'
            }
          </p>
        </motion.div>
      )}

      {/* Create Subject Modal */}
      {showCreateForm && (
        <CreateSubjectForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateSubject}
        />
      )}
    </div>
  )
}

function CreateSubjectForm({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: '',
    semester: '',
    credits: '',
    description: '',
    syllabus: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onSubmit(formData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create New Subject
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject Code
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Credits
              </label>
              <input
                type="number"
                name="credits"
                value={formData.credits}
                onChange={handleChange}
                className="input"
                min="1"
                max="6"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Department</option>
                {['CSE', 'CE', 'IT', 'ME', 'EC', 'CH'].map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Semester
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[80px]"
              rows="3"
            />
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
} 