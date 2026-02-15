'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Users, 
  BarChart3, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  FolderOpen,
  Target,
  Activity,
  Settings,
  Briefcase,
  Star,
  BookOpen,
  Globe,
  Building2,
  Award,
  ChevronRight,
  GraduationCap,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({})
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  // Immediate redirect for admin-like roles - no rendering
  useEffect(() => {
    if (status === 'loading') return
    const role = session?.user?.role
    if (role === 'admin' || role === 'principal' || role === 'hod' || role === 'project_coordinator') {
      router.replace('/dashboard/admin')
    }
  }, [session, status, router])

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
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, fetchDashboardData])

  // Don't render anything for admin-like roles during redirect
  if (session?.user?.role === 'admin' || session?.user?.role === 'principal' || session?.user?.role === 'hod' || session?.user?.role === 'project_coordinator') {
    return null
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  const role = session?.user?.role

  if (role === 'student') return <StudentDashboard stats={stats} activities={recentActivities} session={session} router={router} />
  if (role === 'guide') return <GuideDashboard stats={stats} activities={recentActivities} session={session} router={router} />

  return null
}

/* ─────────────────────────── STUDENT DASHBOARD ─────────────────────────── */
function StudentDashboard({ stats, activities, session, router }) {
  const s = stats
  const hasProject = s.hasProject

  // Status color helpers
  const statusColor = (val) => {
    const map = {
      'approved': 'text-green-600 bg-green-50 dark:bg-green-900/20',
      'in-progress': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      'submitted': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
      'pending': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
      'rejected': 'text-red-600 bg-red-50 dark:bg-red-900/20',
      'accepted': 'text-green-600 bg-green-50 dark:bg-green-900/20',
      'not-assigned': 'text-gray-500 bg-gray-50 dark:bg-gray-800',
    }
    return map[val] || 'text-gray-600 bg-gray-50 dark:bg-gray-800'
  }

  // Progress bar color
  const progressColor = (pct) => {
    if (pct >= 70) return 'from-green-500 to-emerald-500'
    if (pct >= 40) return 'from-amber-500 to-yellow-500'
    return 'from-red-500 to-orange-500'
  }

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <p className="text-blue-200 text-sm font-medium">Welcome back,</p>
          <h1 className="text-2xl font-bold mt-0.5">
            {session?.user?.academicInfo?.name || session?.user?.email?.split('@')[0]}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100">
            {session?.user?.academicInfo?.rollNumber && (
              <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {session.user.academicInfo.rollNumber}</span>
            )}
            {session?.user?.department && (
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {session.user.department}</span>
            )}
            {s.semester && (
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Semester {s.semester}</span>
            )}
          </div>
        </div>
      </motion.div>

      {!hasProject ? (
        /* No project state */
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">No Active Project</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            You don&apos;t have an active project yet. Create a group project or get added by a teammate.
          </p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Briefcase className="w-4 h-4" /> Go to Projects
          </button>
        </motion.div>
      ) : (
        <>
          {/* Progress & Reports */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" /> Progress & Reports
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Score: <span className="font-bold text-gray-800 dark:text-gray-200">{s.avgScore || 0}/10</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                  <span>Overall Progress</span>
                  <span className="font-bold">{s.progressPercent || 0}%</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressColor(s.progressPercent || 0)} transition-all duration-700`}
                    style={{ width: `${Math.min(s.progressPercent || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Report Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xl font-bold text-blue-600">{s.totalReports || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Total</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xl font-bold text-green-600">{s.gradedCount || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Graded</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xl font-bold text-amber-600">{s.submittedCount || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Pending</p>
                </div>
              </div>

              {/* Score Chart (bars) */}
              {s.reportScores && s.reportScores.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Report Scores</p>
                  <div className="flex items-end gap-2 h-24">
                    {s.reportScores.map((r, i) => {
                      const heightPct = (r.score / 10) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${r.title}: ${r.score}/10`}>
                          <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">{r.score}</span>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-md overflow-hidden relative" style={{ height: '80px' }}>
                            <div
                              className={`absolute bottom-0 w-full rounded-t-md bg-gradient-to-t ${
                                r.score >= 7 ? 'from-green-500 to-emerald-400' :
                                r.score >= 4 ? 'from-amber-500 to-yellow-400' :
                                'from-red-500 to-orange-400'
                              } transition-all duration-500`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-gray-400 font-medium">R{i + 1}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-xs">
                  <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  No graded reports yet
                </div>
              )}
          </motion.div>

          {/* Upcoming Deadlines */}
          {s.upcomingDeadlines && s.upcomingDeadlines.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-orange-500" /> Upcoming Deadlines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {s.upcomingDeadlines.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-xs border border-orange-100 dark:border-orange-800/30">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{d.title}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">
                      {new Date(d.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

/* ─────────────────────────── GUIDE DASHBOARD ─────────────────────────── */
function GuideDashboard({ stats, activities, session, router }) {
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
  const STATUS_COLORS = {
    'draft': '#9ca3af', 'submitted': '#f59e0b', 'under-review': '#3b82f6',
    'approved': '#10b981', 'rejected': '#ef4444', 'in-progress': '#6366f1', 'completed': '#059669',
  }

  const guideStats = [
    { title: 'Guided Projects', value: stats.totalProjects || 0, icon: FolderOpen, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'Total Students', value: stats.totalStudents || 0, icon: Users, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { title: 'Pending Review', value: stats.pendingReview || 0, icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
    { title: 'Reports to Grade', value: stats.reportsToGrade || 0, icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  // Find max for bar scaling
  const domainMax = Math.max(...(stats.domainBreakdown || []).map(d => d.count), 1)
  const semMax = Math.max(...(stats.semesterBreakdown || []).map(d => d.count), 1)

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Welcome back,</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {session?.user?.academicInfo?.name || session?.user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Project Guide Portal</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {guideStats.map((stat, index) => (
          <motion.div 
            key={stat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.title}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Domain-wise Projects */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
        >
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-purple-500" /> Domain-wise Projects
          </h3>
          {(stats.domainBreakdown || []).length > 0 ? (
            <div className="space-y-3">
              {stats.domainBreakdown.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate mr-2">{d.name}</span>
                    <span className="font-bold text-gray-600 dark:text-gray-300">{d.count}</span>
                  </div>
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${(d.count / domainMax) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 * i }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-xs">
              <FolderOpen className="w-6 h-6 mx-auto mb-1 opacity-50" /> No projects yet
            </div>
          )}
        </motion.div>

        {/* Semester-wise Groups */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
        >
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-blue-500" /> Semester-wise Groups
          </h3>
          {(stats.semesterBreakdown || []).length > 0 ? (
            <div className="flex items-end gap-3 justify-center" style={{ minHeight: '120px' }}>
              {stats.semesterBreakdown.map((s, i) => {
                const heightPct = (s.count / semMax) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 max-w-[60px]">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{s.count}</span>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-md overflow-hidden relative" style={{ height: '80px' }}>
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: 0.1 * i }}
                        className="absolute bottom-0 w-full rounded-t-md"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">{s.name}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-xs">
              <Layers className="w-6 h-6 mx-auto mb-1 opacity-50" /> No data
            </div>
          )}
        </motion.div>
      </div>

      {/* Status Breakdown + Reports Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Project Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
        >
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-indigo-500" /> Project Status
          </h3>
          {(stats.statusBreakdown || []).length > 0 ? (
            <div className="space-y-2.5">
              {stats.statusBreakdown.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.name] || '#9ca3af' }} />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1 capitalize">{s.name.replace('-', ' ')}</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-xs">No projects</div>
          )}
        </motion.div>

        {/* Reports Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
        >
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-teal-500" /> Reports Overview
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xl font-bold text-blue-600">{stats.totalReports || 0}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-xl font-bold text-green-600">{stats.gradedReports || 0}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Graded</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xl font-bold text-amber-600">{stats.reportsToGrade || 0}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Pending</p>
            </div>
          </div>
          {/* Avg progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
              <span>Avg Project Progress</span>
              <span className="font-bold">{stats.avgProgress || 0}%</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${Math.min(stats.avgProgress || 0, 100)}%` }}
                transition={{ duration: 0.7 }}
                className={`h-full rounded-full bg-gradient-to-r ${
                  (stats.avgProgress || 0) >= 70 ? 'from-green-500 to-emerald-500' :
                  (stats.avgProgress || 0) >= 40 ? 'from-amber-500 to-yellow-500' :
                  'from-red-500 to-orange-500'
                }`}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Project Summary Table */}
      {(stats.projectSummaries || []).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" /> My Guided Projects
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2.5 font-semibold">Group</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Domain</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Sem</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Members</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Reports</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Progress</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {stats.projectSummaries.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => router.push('/dashboard/projects')}
                  >
                    <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">{p.groupId}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100 max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{p.domain}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{p.semester}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{p.members}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-gray-600 dark:text-gray-300">{p.gradedReports}/{p.reports}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="w-full bg-gray-100 dark:bg-gray-600 rounded-full h-1.5 inline-block max-w-[60px]">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="ml-1 text-gray-500">{p.progress}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        p.status === 'approved' || p.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                        p.status === 'in-progress' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                        p.status === 'submitted' || p.status === 'under-review' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                        p.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
                        'bg-gray-50 dark:bg-gray-700 text-gray-500'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}