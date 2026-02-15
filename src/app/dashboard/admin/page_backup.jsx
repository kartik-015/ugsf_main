'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  BarChart3,
  AlertTriangle,
  FolderOpen,
  XCircle,
  PieChart,
  ArrowLeft,
  ChevronRight,
  FileText,
  BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

// Interactive bar chart with click handlers
function BarChart({ data, title, colorClass = 'bg-blue-500', onClick }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1 transition-colors' : ''}`}
          onClick={() => onClick && onClick(item)}
        >
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-20 truncate" title={item.name}>{item.name}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colorClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-8 text-right">{item.value}</span>
          {onClick && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      ))}
    </div>
  )
}

// Donut chart component
function DonutChart({ data, title }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
  let cumulativePercent = 0
  const segments = data.map((item, i) => {
    const percent = (item.value / total) * 100
    const start = cumulativePercent
    cumulativePercent += percent
    return { ...item, percent, start, color: colors[i % colors.length] }
  })
  const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.percent}%`).join(', ')

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 h-28 rounded-full flex-shrink-0 relative" style={{ background: `conic-gradient(${gradientParts})` }}>
        <div className="absolute inset-3 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{total}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-300 truncate" title={s.name}>{s.name}</span>
            <span className="ml-auto font-semibold text-gray-700 dark:text-gray-200">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mini sparkline for trend
function TrendLine({ data }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const min = Math.min(...data.map(d => d.count), 0)
  const range = max - min || 1
  const width = 120
  const height = 32
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.count - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke="#3B82F6" strokeWidth="2" points={points} />
    </svg>
  )
}

// Drill-down panel component
function DrillDownPanel({ dept, type, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDrill = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/stats?drillDept=${encodeURIComponent(dept)}&drillType=${encodeURIComponent(type)}`)
        if (res.ok) setData(await res.json())
        else toast.error('Failed to load drill-down data')
      } catch { toast.error('Error loading data') }
      finally { setLoading(false) }
    }
    fetchDrill()
  }, [dept, type])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
  if (!data) return null

  if (type === 'students') {
    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept} — Student Breakdown</h3>
        </div>
        
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Students', value: data.totalStudents, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'With Project', value: data.withProject, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Without Project', value: data.withoutProject, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Guide Assigned', value: data.withGuide, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((c, i) => (
            <div key={i} className={`${c.bg} rounded-xl p-3 border border-gray-200 dark:border-gray-700`}>
              <p className="text-[10px] font-medium text-gray-500 uppercase">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Project Title Submitted</h4>
            <DonutChart data={[
              { name: 'Submitted', value: data.withProject },
              { name: 'Not Submitted', value: data.withoutProject },
            ]} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Guide Assignment</h4>
            <DonutChart data={[
              { name: 'Guide Assigned', value: data.withGuide },
              { name: 'No Guide Yet', value: data.withoutGuide },
            ]} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Monthly Report (This Month)</h4>
            <DonutChart data={[
              { name: 'Report Submitted', value: data.submittedReport },
              { name: 'Report Pending', value: data.pendingReport },
            ]} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Semester Distribution</h4>
            <BarChart data={data.semesterBreakdown || []} colorClass="bg-indigo-500" />
          </div>
        </div>

        {data.projectStatusBreakdown?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Project Status Breakdown</h4>
            <BarChart data={data.projectStatusBreakdown} colorClass="bg-teal-500" />
          </div>
        )}
      </motion.div>
    )
  }

  if (type === 'projects') {
    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept} — Project Details</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: data.totalProjects, color: 'text-blue-600' },
            { label: 'Approved', value: data.approved, color: 'text-green-600' },
            { label: 'In Progress', value: data.inProgress, color: 'text-amber-600' },
            { label: 'Completed', value: data.completed, color: 'text-teal-600' },
            { label: 'Rejected', value: data.rejected, color: 'text-red-600' },
          ].map((c, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-medium text-gray-500 uppercase">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Guide Assignment</h4>
            <DonutChart data={[
              { name: 'Guide Assigned', value: data.withGuide },
              { name: 'No Guide', value: data.withoutGuide },
            ]} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Report This Month</h4>
            <DonutChart data={[
              { name: 'Submitted', value: data.reportThisMonth },
              { name: 'Pending', value: data.noReportThisMonth },
            ]} />
          </div>
        </div>

        {data.domainBreakdown?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-3">Domain Distribution</h4>
            <DonutChart data={data.domainBreakdown} />
          </div>
        )}
      </motion.div>
    )
  }

  return null
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  // Drill-down state
  const [drillDown, setDrillDown] = useState(null) // { dept, type }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/'); return }
    const allowedRoles = ['admin', 'mainadmin', 'principal', 'hod', 'project_coordinator']
    if (!allowedRoles.includes(session.user.role)) { router.push('/dashboard'); return }
  }, [session, status, router])

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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const getRoleTitle = () => {
    const role = session?.user?.role
    const dept = session?.user?.department
    const titles = {
      admin: 'Administration Dashboard',
      mainadmin: 'Administration Dashboard',
      principal: 'Principal Dashboard',
      hod: `HOD Dashboard${dept ? ` - ${dept}` : ''}`,
      project_coordinator: `Project Coordinator Dashboard${dept ? ` - ${dept}` : ''}`,
    }
    return titles[role] || 'Dashboard'
  }

  const getRoleDescription = () => {
    const role = session?.user?.role
    const descs = {
      admin: 'Institute-wide overview of projects, students, and guide allocations',
      mainadmin: 'Institute-wide overview of projects, students, and guide allocations',
      principal: 'Institute performance overview and project status summary',
      hod: 'Department project management and student overview',
      project_coordinator: 'Department project coordination and tracking',
    }
    return descs[role] || 'Overview'
  }

  const isInstituteLevel = ['admin', 'mainadmin', 'principal'].includes(session?.user?.role)

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const allowedRoles = ['admin', 'mainadmin', 'principal', 'hod', 'project_coordinator']
  if (!session || !allowedRoles.includes(session.user.role)) return null

  const statCards = [
    { name: 'Total Students', value: stats.totalStudents || 0, icon: GraduationCap, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800', link: '/dashboard/students' },
    { name: 'Total Guides', value: stats.totalFaculty || 0, icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800', link: '/dashboard/guides' },
    { name: 'Pending Approvals', value: stats.pendingRegistrations || 0, icon: UserPlus, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800', link: session?.user?.role === 'admin' ? '/dashboard/admin/approvals' : null, alert: (stats.pendingRegistrations || 0) > 0 },
    { name: 'Assigned Students', value: stats.assignedStudents || 0, icon: UserCheck, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800' }
  ]

  const projectCards = [
    { name: 'Total Projects', value: stats.totalProjects || 0, icon: Briefcase, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-200 dark:border-indigo-800', link: '/dashboard/projects' },
    { name: 'Approved', value: stats.approvedProjects || 0, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' },
    { name: 'In Progress', value: stats.inProgressProjects || 0, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800' },
    { name: 'Completed', value: stats.completedProjects || 0, icon: FolderOpen, color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/20', borderColor: 'border-teal-200 dark:border-teal-800' },
  ]

  // Handle drill-down click on department bars
  const handleDeptStudentDrill = (item) => {
    setDrillDown({ dept: item.name, type: 'students' })
  }
  const handleDeptProjectDrill = (item) => {
    setDrillDown({ dept: item.name, type: 'projects' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getRoleTitle()}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getRoleDescription()}</p>
        </div>
        {stats.registrationTrend?.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>7-day registrations</span>
            <TrendLine data={stats.registrationTrend} />
          </div>
        )}
      </div>

      {/* User Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => stat.link && router.push(stat.link)}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${stat.borderColor} ${stat.link ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow relative`}
          >
            {stat.alert && (
              <div className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.name}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Project Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Project Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {projectCards.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
              onClick={() => stat.link && router.push(stat.link)}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${stat.borderColor} ${stat.link ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.name}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Drill-down View */}
      <AnimatePresence mode="wait">
        {drillDown && (
          <motion.div
            key={`drill-${drillDown.dept}-${drillDown.type}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-blue-200 dark:border-blue-800 shadow-lg"
          >
            <DrillDownPanel
              dept={drillDown.dept}
              type={drillDown.type}
              onBack={() => setDrillDown(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Student Onboarding Status */}
        <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Student Registration Status</h3>
          <DonutChart data={[
            { name: 'Onboarded', value: stats.onboardedStudents || 0 },
            { name: 'Pending Onboarding', value: stats.notOnboardedStudents || 0 },
          ]} />
        </motion.div>

        {/* Project Assignment */}
        <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Student Project Assignment</h3>
          <DonutChart data={[
            { name: 'Assigned to Project', value: stats.assignedStudents || 0 },
            { name: 'Not Assigned', value: stats.unassignedStudents || 0 },
          ]} />
        </motion.div>

        {/* Interactive Department Distribution (click to drill) */}
        {isInstituteLevel && (
          <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Students by Department</h3>
            <p className="text-xs text-gray-400 mb-3">Click a department to drill down into student details</p>
            <BarChart data={stats.departmentDistribution || []} colorClass="bg-blue-500" onClick={handleDeptStudentDrill} />
          </motion.div>
        )}

        {/* Semester Distribution */}
        <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Students by Semester</h3>
          <BarChart data={stats.semesterDistribution || []} colorClass="bg-indigo-500" />
        </motion.div>

        {/* Interactive Projects by Department */}
        {isInstituteLevel && (stats.deptProjectDistribution?.length > 0) && (
          <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.47 }}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Projects by Department</h3>
            <p className="text-xs text-gray-400 mb-3">Click a department to drill down into project details</p>
            <BarChart data={stats.deptProjectDistribution} colorClass="bg-teal-500" onClick={handleDeptProjectDrill} />
          </motion.div>
        )}

        {/* Guides by Department */}
        {isInstituteLevel && (stats.deptGuideDistribution?.length > 0) && (
          <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Guides by Department</h3>
            <BarChart data={stats.deptGuideDistribution} colorClass="bg-purple-500" />
          </motion.div>
        )}

        {/* Domain Distribution */}
        {(stats.domainDistribution?.length > 0) && (
          <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Projects by Domain</h3>
            <DonutChart data={stats.domainDistribution || []} />
          </motion.div>
        )}

        {/* Project Status */}
        {(stats.statusDistribution?.length > 0) && (
          <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Project Status Breakdown</h3>
            <BarChart data={stats.statusDistribution || []} colorClass="bg-green-500" />
          </motion.div>
        )}
      </div>

      {/* Guide Allocation Table */}
      <motion.div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Guide Allocation Summary</h3>
        {(!stats.guideAllocation || stats.guideAllocation.length === 0) ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No guide allocations yet. Guides will appear here once assigned to projects.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Guide</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Projects</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Students</th>
                </tr>
              </thead>
              <tbody>
                {stats.guideAllocation.map(g => (
                  <tr key={g._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-2.5 px-3 text-gray-700 dark:text-gray-200">{g.guideName || g.guideEmail}</td>
                    <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{g.department || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-gray-700 dark:text-gray-200">{g.projectCount}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-gray-700 dark:text-gray-200">{g.totalStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
