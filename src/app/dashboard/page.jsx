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
    // Admin, principal, HOD, and project coordinator go to admin page
    if (role === 'admin' || role === 'mainadmin' || role === 'principal' || role === 'hod' || role === 'project_coordinator') {
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
  if (session?.user?.role === 'admin' || session?.user?.role === 'mainadmin' || session?.user?.role === 'principal' || session?.user?.role === 'hod' || session?.user?.role === 'project_coordinator') {
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
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded p-6 text-white relative overflow-hidden"
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
          className="bg-white dark:bg-gray-800 rounded p-8 border border-gray-200 dark:border-gray-700 text-center"
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
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Briefcase className="w-4 h-4" /> Go to Projects
          </button>
        </motion.div>
      ) : (
        <>
          {/* Progress & Reports */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-5"
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
                <div className="text-center p-2.5 rounded bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xl font-bold text-blue-600">{s.totalReports || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Total</p>
                </div>
                <div className="text-center p-2.5 rounded bg-green-50 dark:bg-green-900/20">
                  <p className="text-xl font-bold text-green-600">{s.gradedCount || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Graded</p>
                </div>
                <div className="text-center p-2.5 rounded bg-amber-50 dark:bg-amber-900/20">
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
              className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-5"
            >
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-orange-500" /> Upcoming Deadlines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {s.upcomingDeadlines.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded bg-orange-50 dark:bg-orange-900/20 text-xs border border-orange-100 dark:border-orange-800/30">
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
    'draft': '#9ca3af',
    'submitted': '#f59e0b',
    'under-review': '#3b82f6',
    'approved': '#10b981',
    'rejected': '#ef4444',
    'in-progress': '#6366f1',
    'completed': '#059669',
  }

  const guideStats = [
    { title: 'Guided Projects', value: stats.totalProjects || 0, icon: FolderOpen, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'Total Students', value: stats.totalStudents || 0, icon: Users, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { title: 'Pending Submission', value: stats.pendingSubmission || 0, icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
    { title: 'Reports to Grade', value: stats.reportsToGrade || 0, icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  // Find max for bar scaling
  const domainItems = (stats.domainBreakdown || [])
    .filter(d => d && d.count)
    .slice(0, 8)
  const domainTotal = domainItems.reduce((sum, item) => sum + item.count, 0)
  const donutSize = 168
  const donutStroke = 16
  const donutRadius = 52
  const donutCircumference = 2 * Math.PI * donutRadius
  let donutOffset = 0

  return (
    <div className="w-full min-h-[calc(100vh-220px)] flex flex-col gap-5">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70 dark:from-blue-950/20 dark:via-gray-800 dark:to-indigo-950/20" />
        <div className="flex items-center justify-between">
          <div className="relative">
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
            className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.title}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-9 h-9 rounded ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch flex-1">

        {/* Domain-wise Projects */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm xl:col-span-6 h-full xl:min-h-[380px] flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-500" /> Projects by Domain
            </h3>
            <span className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">{domainTotal} total</span>
          </div>
          {domainItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)] gap-5 items-center flex-1">
              <div className="flex items-center justify-center">
                <div className="relative" style={{ width: 176, height: 176 }}>
                  <svg viewBox={`0 0 ${donutSize} ${donutSize}`} className="block w-full h-full">
                    <g transform={`translate(${donutSize / 2}, ${donutSize / 2}) rotate(-90)`}>
                      {domainItems.map((d, i) => {
                        const segmentLength = domainTotal ? (d.count / domainTotal) * donutCircumference : 0
                        const strokeDasharray = `${segmentLength} ${donutCircumference - segmentLength}`
                        const strokeDashoffset = -donutOffset
                        donutOffset += segmentLength
                        return (
                          <circle
                            key={`${d.name}-${i}`}
                            r={donutRadius}
                            cx="0"
                            cy="0"
                            fill="none"
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={donutStroke}
                            strokeLinecap="butt"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            style={{ transition: 'stroke-dasharray 0.6s ease' }}
                          />
                        )
                      })}
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-black text-gray-800 dark:text-gray-100">{domainTotal}</div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-0.5">Projects</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pr-1">
                {domainItems.map((d, i) => (
                  <div key={`${d.name}-${i}`} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm flex-1 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 mx-auto mb-1 opacity-50" /> No projects yet
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm xl:col-span-6 h-full xl:min-h-[380px] flex flex-col"
        >
          <h3 className="font-semibold text-base text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-teal-500" /> Reports Overview
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3.5 rounded bg-blue-50 dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600">{stats.totalReports || 0}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Total</p>
            </div>
            <div className="text-center p-3.5 rounded bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">{stats.gradedReports || 0}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Graded</p>
            </div>
            <div className="text-center p-3.5 rounded bg-amber-50 dark:bg-amber-900/20">
              <p className="text-2xl font-bold text-amber-600">{stats.reportsToGrade || 0}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Pending</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-2.5 content-start">
            {(stats.statusBreakdown || []).length > 0 ? (
              stats.statusBreakdown.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3.5 py-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.name] || '#9ca3af' }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1 capitalize">{s.name.replace('-', ' ')}</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-100">{s.count}</span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-sm py-6">
                No report status data
              </div>
            )}
          </div>
          {/* Avg progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1.5">
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

    </div>
  )
}