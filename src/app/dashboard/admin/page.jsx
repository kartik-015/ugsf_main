'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  Shield, 
  UserCheck,
  TrendingUp,
  Briefcase,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [guideSummary, setGuideSummary] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/'); return }
    if (session.user.role !== 'admin') { router.push('/dashboard'); return }
  }, [session, status, router])

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    pendingOnboarding: 0,
    pendingRegistrations: 0,
    assignedStudents: 0,
    totalProjects: 0,
    approvedProjects: 0,
    inProgressProjects: 0
  })

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        toast.error('Failed to load statistics')
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  const fetchGuideSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/projects/summary')
      if (res.ok) {
        const data = await res.json()
        setGuideSummary(data.guides || [])
      }
    } catch {} finally { setLoadingSummary(false) }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      await Promise.all([fetchGuideSummary(), fetchStats()])
      if (mounted) setLoading(false)
    }
    loadData()
    return () => { mounted = false }
  }, [fetchGuideSummary, fetchStats])

  const getStats = () => [
    {
      name: 'Total Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'from-blue-600 to-purple-600',
      link: '/dashboard/students'
    },
    {
      name: 'Total Guides',
      value: stats.totalFaculty,
      icon: Shield,
      color: 'from-green-600 to-blue-600',
      link: '/dashboard/guides'
    },
    {
      name: 'Pending Approvals',
      value: stats.pendingRegistrations,
      icon: UserPlus,
      color: 'from-orange-600 to-red-600',
      link: '/dashboard/admin/approvals',
      pulse: stats.pendingRegistrations > 0
    },
    {
      name: 'Assigned Students',
      value: stats.assignedStudents,
      icon: UserCheck,
      color: 'from-purple-600 to-pink-600'
    }
  ]

  const getProjectStats = () => [
    {
      name: 'Total Projects',
      value: stats.totalProjects || 0,
      icon: Briefcase,
      color: 'from-indigo-600 to-blue-600',
      link: '/dashboard/projects'
    },
    {
      name: 'Approved',
      value: stats.approvedProjects || 0,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: 'In Progress',
      value: stats.inProgressProjects || 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-600'
    }
  ]

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-foreground font-semibold text-lg">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') return null

  return (
    <div className="space-y-8 relative overflow-hidden">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <motion.h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              Admin Dashboard
            </motion.h1>
            <motion.p className="text-gray-600 dark:text-gray-300 mt-2 text-lg" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              Manage guide allocations, projects and approvals
            </motion.p>
          </div>
          {stats.pendingOnboarding > 0 && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
              <TrendingUp className="w-4 h-4" />
              <span>{stats.pendingOnboarding} user(s) pending onboarding</span>
            </div>
          )}
        </div>

        {/* User Stats */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {getStats().map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, y: -8 }}
              onClick={() => stat.link && router.push(stat.link)}
              className={`backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl ${stat.link ? 'cursor-pointer' : ''} relative`}
            >
              {stat.pulse && (
                <div className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{stat.name}</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                </div>
                <motion.div className="flex-shrink-0" whileHover={{ rotate: 360, scale: 1.2 }} transition={{ duration: 0.6 }}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Project Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Project Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {getProjectStats().map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.03, y: -4 }}
                onClick={() => stat.link && router.push(stat.link)}
                className={`backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-5 border border-white/20 shadow-lg ${stat.link ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.name}</p>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-md`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Guide Allocation Summary Table */}
        <motion.div className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Guide Allocation Summary</h3>
          {loadingSummary ? (
            <div className="text-sm text-gray-500 py-4 text-center">Loading...</div>
          ) : guideSummary.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">No guide allocations yet. Guides will appear here once assigned to projects.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700/50">
                    <th className="text-left p-3 font-semibold">Guide</th>
                    <th className="text-left p-3 font-semibold">Department</th>
                    <th className="text-left p-3 font-semibold">Projects</th>
                    <th className="text-left p-3 font-semibold">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {guideSummary.map(g => (
                    <tr key={g.guideId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-3">{g.guideName || g.guideEmail}</td>
                      <td className="p-3">{g.department || '-'}</td>
                      <td className="p-3 font-semibold">{g.projectCount}</td>
                      <td className="p-3 font-semibold">{g.totalStudents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
