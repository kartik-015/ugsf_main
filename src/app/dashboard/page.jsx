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
        color: 'from-primary-500 to-primary-600',
        bgColor: 'bg-primary-100 dark:bg-primary-900/30',
        textColor: 'text-primary-700 dark:text-primary-300'
      },
      {
        title: 'Active Subjects',
        value: stats.activeSubjects || 0,
        icon: BookOpen,
        color: 'from-secondary-500 to-secondary-600',
        bgColor: 'bg-secondary-100 dark:bg-secondary-900/30',
        textColor: 'text-secondary-700 dark:text-secondary-300'
      },
      {
        title: 'Average Grade',
        value: `${stats.averageGrade || 0}%`,
        icon: BarChart3,
        color: 'from-accent-500 to-accent-600',
        bgColor: 'bg-accent-100 dark:bg-accent-900/30',
        textColor: 'text-accent-700 dark:text-accent-300'
      }
    ]

    if (role === 'student') {
      return [
        {
          title: 'My Subjects',
          value: stats.enrolledSubjects || 0,
          icon: BookOpen,
          color: 'from-primary-500 to-primary-600',
          bgColor: 'bg-primary-100 dark:bg-primary-900/30',
          textColor: 'text-primary-700 dark:text-primary-300'
        },
        {
          title: 'Assignments Due',
          value: stats.assignmentsDue || 0,
          icon: Clock,
          color: 'from-destructive to-destructive/80',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-700 dark:text-red-300'
        },
        {
          title: 'Completed',
          value: stats.completedAssignments || 0,
          icon: CheckCircle,
          color: 'from-success to-success/80',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-700 dark:text-green-300'
        },
        {
          title: 'Current GPA',
          value: stats.currentGPA || '0.0',
          icon: Award,
          color: 'from-accent-500 to-accent-600',
          bgColor: 'bg-accent-100 dark:bg-accent-900/30',
          textColor: 'text-accent-700 dark:text-accent-300'
        }
      ]
    }

  if (role === 'guide') {
      return [
        {
          title: 'My Subjects',
          value: stats.teachingSubjects || 0,
          icon: BookOpen,
          color: 'from-primary-500 to-primary-600',
          bgColor: 'bg-primary-100 dark:bg-primary-900/30',
          textColor: 'text-primary-700 dark:text-primary-300'
        },
        {
          title: 'Active Assignments',
          value: stats.activeAssignments || 0,
          icon: FileText,
          color: 'from-secondary-500 to-secondary-600',
          bgColor: 'bg-secondary-100 dark:bg-secondary-900/30',
          textColor: 'text-secondary-700 dark:text-secondary-300'
        },
        {
          title: 'Pending Grades',
          value: stats.pendingGrades || 0,
          icon: BarChart3,
          color: 'from-warning to-warning/80',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          textColor: 'text-orange-700 dark:text-orange-300'
        },
        {
          title: 'Total Students',
          value: stats.totalStudents || 0,
          icon: Users,
          color: 'from-accent-500 to-accent-600',
          bgColor: 'bg-accent-100 dark:bg-accent-900/30',
          textColor: 'text-accent-700 dark:text-accent-300'
        }
      ]
    }

  if (role === 'hod') {
      return [
        { title: 'Department', value: stats.department || '-', icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
        { title: 'Students', value: stats.students || 0, icon: Users, color: 'from-secondary-500 to-secondary-600', bgColor: 'bg-secondary-100 dark:bg-secondary-900/30', textColor: 'text-secondary-700 dark:text-secondary-300' },
  { title: 'Guides', value: stats.faculty || 0, icon: Users, color: 'from-warning to-warning/80', bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-300' },
        { title: 'Pending Projects', value: stats.projectsPending || 0, icon: FileText, color: 'from-accent-500 to-accent-600', bgColor: 'bg-accent-100 dark:bg-accent-900/30', textColor: 'text-accent-700 dark:text-accent-300' }
      ]
    }

    return baseStats
  }

  const getQuickActions = () => {
    const role = session?.user?.role
    const actions = []

    if (role === 'admin') {
      actions.push(
        { name: 'Add Student', icon: Plus, href: '/dashboard/students', color: 'bg-primary' },
  { name: 'Manage Guides', icon: Users, href: '/dashboard/guides', color: 'bg-secondary' },
        { name: 'View Reports', icon: BarChart3, href: '/dashboard/reports', color: 'bg-accent' },
        { name: 'System Settings', icon: Settings, href: '/dashboard/settings', color: 'bg-muted-foreground' }
      )
  } else if (role === 'guide') {
      actions.push(
        { name: 'Create Assignment', icon: Plus, href: '/dashboard/assignments', color: 'bg-primary' },
        { name: 'Grade Submissions', icon: CheckCircle, href: '/dashboard/grades', color: 'bg-success' },
        { name: 'View Students', icon: Users, href: '/dashboard/students', color: 'bg-secondary' },
        { name: 'Course Materials', icon: BookOpen, href: '/dashboard/subjects', color: 'bg-accent' }
      )
    } else if (role === 'student') {
      actions.push(
        { name: 'View Assignments', icon: FileText, href: '/dashboard/assignments', color: 'bg-primary' },
        { name: 'Check Grades', icon: BarChart3, href: '/dashboard/grades', color: 'bg-secondary' },
        { name: 'Download Timetable', icon: Download, href: '/dashboard/timetable', color: 'bg-accent' },
        { name: 'Submit Work', icon: Upload, href: '/dashboard/assignments', color: 'bg-warning' }
      )
    }

    return actions
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-foreground font-semibold">Loading dashboard...</span>
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
        className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white shadow-xl border-2 border-primary-600"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {session?.user?.academicInfo?.name || session?.user?.email.split('@')[0]}!
            </h1>
            <p className="text-primary-100">
              Here&apos;s what&apos;s happening in your {session?.user?.role === 'student' ? 'academic' : 'administrative'} world today.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
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
            className="bg-card rounded-xl p-6 shadow-lg border-2 border-border hover:shadow-2xl hover:border-primary/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-md`}>
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
        className="bg-card rounded-xl p-6 shadow-lg border-2 border-border"
      >
        <h2 className="text-xl font-bold text-foreground mb-4">
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
              className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-all duration-200 border-2 border-transparent hover:border-primary"
            >
              <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3 shadow-md`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground text-center">
                {action.name}
              </span>
            </motion.a>
          ))}
        </div>
      </motion.div>
    </div>
  )
}