'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Calendar, 
  TrendingUp,
  Award, 
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Upload,
  Eye,
  Plus,
  Bell,
  Star,
  Target,
  Activity,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({})
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || {})
        setRecentActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const getRoleSpecificStats = () => {
    const role = session?.user?.role
    const baseStats = [
      {
        title: 'Total Students',
        value: stats.totalStudents || 0,
        icon: Users,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
      },
      {
        title: 'Active Subjects',
        value: stats.activeSubjects || 0,
        icon: BookOpen,
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      },
      // {
      //   title: 'Pending Assignments',
      //   value: stats.pendingAssignments || 0,
      //   icon: FileText,
      //   color: 'from-orange-500 to-orange-600',
      //   bgColor: 'bg-orange-100 dark:bg-orange-900/30'
      // },
      {
        title: 'Average Grade',
        value: `${stats.averageGrade || 0}%`,
        icon: BarChart3,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30'
      }
    ]

    if (role === 'student') {
      return [
        {
          title: 'My Subjects',
          value: stats.enrolledSubjects || 0,
          icon: BookOpen,
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        },
        {
          title: 'Assignments Due',
          value: stats.assignmentsDue || 0,
          icon: Clock,
          color: 'from-red-500 to-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/30'
        },
        {
          title: 'Completed',
          value: stats.completedAssignments || 0,
          icon: CheckCircle,
          color: 'from-green-500 to-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/30'
        },
        {
          title: 'Current GPA',
          value: stats.currentGPA || '0.0',
          icon: Award,
          color: 'from-purple-500 to-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        }
      ]
    }

  if (role === 'guide') {
      return [
        {
          title: 'My Subjects',
          value: stats.teachingSubjects || 0,
          icon: BookOpen,
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        },
        {
          title: 'Active Assignments',
          value: stats.activeAssignments || 0,
          icon: FileText,
          color: 'from-green-500 to-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/30'
        },
        {
          title: 'Pending Grades',
          value: stats.pendingGrades || 0,
          icon: BarChart3,
          color: 'from-orange-500 to-orange-600',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30'
        },
        {
          title: 'Total Students',
          value: stats.totalStudents || 0,
          icon: Users,
          color: 'from-purple-500 to-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        }
      ]
    }

  if (role === 'hod') {
      return [
        { title: 'Department', value: stats.department || '-', icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
        { title: 'Students', value: stats.students || 0, icon: Users, color: 'from-green-500 to-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { title: 'Guides', value: stats.faculty || 0, icon: Users, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
        { title: 'Pending Projects', value: stats.projectsPending || 0, icon: FileText, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' }
      ]
    }

    return baseStats
  }

  const getQuickActions = () => {
    const role = session?.user?.role
    const actions = []

    if (role === 'admin') {
      actions.push(
        { name: 'Add Student', icon: Plus, href: '/dashboard/students', color: 'bg-blue-500' },
  { name: 'Manage Guides', icon: Users, href: '/dashboard/guides', color: 'bg-green-500' },
        { name: 'View Reports', icon: BarChart3, href: '/dashboard/reports', color: 'bg-purple-500' },
        { name: 'System Settings', icon: Settings, href: '/dashboard/settings', color: 'bg-gray-500' }
      )
  } else if (role === 'guide') {
      actions.push(
        { name: 'Create Assignment', icon: Plus, href: '/dashboard/assignments', color: 'bg-blue-500' },
        { name: 'Grade Submissions', icon: CheckCircle, href: '/dashboard/grades', color: 'bg-green-500' },
        { name: 'View Students', icon: Users, href: '/dashboard/students', color: 'bg-purple-500' },
        { name: 'Course Materials', icon: BookOpen, href: '/dashboard/subjects', color: 'bg-orange-500' }
      )
    } else if (role === 'student') {
      actions.push(
        { name: 'View Assignments', icon: FileText, href: '/dashboard/assignments', color: 'bg-blue-500' },
        { name: 'Check Grades', icon: BarChart3, href: '/dashboard/grades', color: 'bg-green-500' },
        { name: 'Download Timetable', icon: Download, href: '/dashboard/timetable', color: 'bg-purple-500' },
        { name: 'Submit Work', icon: Upload, href: '/dashboard/assignments', color: 'bg-orange-500' }
      )
    }

    return actions
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-300 font-medium">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {session?.user?.academicInfo?.name || session?.user?.email.split('@')[0]}!
            </h1>
            <p className="text-blue-100">
              Here&apos;s what&apos;s happening in your {session?.user?.role === 'student' ? 'academic' : 'administrative'} world today.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getRoleSpecificStats().map((stat, index) => (
      <motion.div 
            key={stat.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
                </div>
              </motion.div>
        ))}
            </div>
            
      {/* Quick Actions */}
            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {getQuickActions().map((action, index) => (
            <motion.a
              key={action.name}
              href={action.href}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
                {action.name}
              </span>
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* Recent Activities */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Activities
          </h2>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all
          </button>
          </div>
          
        {recentActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No recent activities to show.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.slice(0, 5).map((activity, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        </motion.div>

      {/* Performance Chart (for students) */}
      {session?.user?.role === 'student' && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Performance Overview
          </h2>
          <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Performance chart will be displayed here
                      </p>
                    </div>
                  </div>
                  </motion.div>
      )}
    </div>
  )
}