'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Shield,
  UserCheck,
  Briefcase,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  XCircle,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Search,
  Loader2,
  FolderOpen,
  Tag,
  Users,
  Award,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ──────── DonutChart ──────── */

function DonutChart({ data, onClick, onSegmentClick, centerLabel }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
  let cum = 0
  const segs = data.map((item, i) => {
    const pct = total > 0 ? (item.value / total) * 100 : 0
    const start = cum
    cum += pct
    return { ...item, pct, start, color: colors[i % colors.length] }
  })
  const grad = total > 0
    ? segs.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ')
    : '#E5E7EB 0% 100%'

  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full flex-shrink-0 relative" style={{ background: `conic-gradient(${grad})` }}>
        <div className="absolute inset-3 sm:inset-4 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center">
          <span className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-200">{total}</span>
          {centerLabel && <span className="text-[9px] text-gray-400 -mt-0.5">{centerLabel}</span>}
        </div>
      </div>
      <div className="flex-1 space-y-2 w-full">
        {segs.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 text-sm ${onSegmentClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors' : ''}`}
            onClick={(e) => {
              if (onSegmentClick) {
                e.stopPropagation()
                onSegmentClick(s)
              }
            }}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-300 truncate" title={s.name}>{s.name}</span>
            <span className="ml-auto font-medium text-gray-700 dark:text-gray-200">{s.value}</span>
            {onSegmentClick && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
          </div>
        ))}
      </div>
      {onClick && !onSegmentClick && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
    </div>
  )
}

/* ──────── BarChart ──────── */

function BarChart({ data, colorClass = 'bg-blue-500', onBarClick }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 ${onBarClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors' : ''}`}
          onClick={() => onBarClick && item.value > 0 && onBarClick(item)}
        >
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-24 truncate" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colorClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200 w-8 text-right">{item.value}</span>
          {onBarClick && item.value > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        </div>
      ))}
    </div>
  )
}

/* ──────── Student List View (deepest level) ──────── */

function StudentListView({ filterBy, filterValue, title, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetch_data() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ drillDept: 'all', drillType: 'studentList', filterBy, filterValue })
        const res = await fetch(`/api/admin/stats?${params}`, { cache: 'no-store' })
        if (res.ok) setData(await res.json())
        else toast.error('Failed to load student details')
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch_data()
  }, [filterBy, filterValue])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-gray-500">Loading students...</span>
    </div>
  )

  if (!data) return null

  const filtered = data.students.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
  })

  const statusBg = (s) => {
    if (!s.hasProject) return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
    if (s.project?.status === 'in-progress') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
  }

  const getDisplayStatus = (s) => {
    if (!s.hasProject) return 'no project'
    return 'under review'
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500">{data.total} student{data.total !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, roll number, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Student cards */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No students match your search</p>
        ) : filtered.map((s, i) => (
          <motion.div
            key={s._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.5) }}
            className="bg-gray-50 dark:bg-gray-700/30 rounded p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{s.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{s.rollNumber}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">{s.email}</p>
                {s.project && (
                  <div className="mt-1.5 ml-6">
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.project.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                      {s.project.domain && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{s.project.domain}</span>}
                      {s.project.guideName && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.project.guideName}</span>}
                      <span>Sem {s.project.semester}</span>
                    </div>
                  </div>
                )}
                {s.interests && s.interests.length > 0 && (
                  <div className="mt-1.5 ml-6 flex flex-wrap gap-1">
                    {s.interests.map((int, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {int}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusBg(s)}`}>
                  {getDisplayStatus(s)}
                </span>
                {s.isOnboarded ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 font-medium">onboarded</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-medium">not onboarded</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interest domain breakdown */}
      {data.interestBreakdown && data.interestBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Interest Domains
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.interestBreakdown.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                {d.name} <span className="font-bold ml-1">{d.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ──────── Project List View (deepest level) ──────── */

function ProjectListView({ filterBy, filterValue, title, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null) // expanded project id

  useEffect(() => {
    async function fetch_data() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ drillDept: 'all', drillType: 'projectList', filterBy, filterValue })
        const res = await fetch(`/api/admin/stats?${params}`, { cache: 'no-store' })
        if (res.ok) setData(await res.json())
        else toast.error('Failed to load project details')
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch_data()
  }, [filterBy, filterValue])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
    </div>
  )

  if (!data) return null

  const filtered = data.projects.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.title?.toLowerCase().includes(q) || p.domain?.toLowerCase().includes(q) || p.guideName?.toLowerCase().includes(q) || p.groupId?.toLowerCase().includes(q))
  })

  const statusBg = (p) => {
    // Compute display: "Submitted" if all reports graded, else "Under Review"
    const totalReports = p.totalReports ?? 0
    const gradedReports = p.gradedReports ?? 0
    const isSubmitted = totalReports > 0 && gradedReports === totalReports
    return isSubmitted
      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
  }

  const getDisplayStatus = (p) => {
    const totalReports = p.totalReports ?? 0
    const gradedReports = p.gradedReports ?? 0
    return totalReports > 0 && gradedReports === totalReports ? 'Submitted' : 'Under Review'
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500">{data.total} project{data.total !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title, domain, guide, or group ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No projects match your search</p>
        ) : filtered.map((p, i) => (
          <motion.div
            key={p._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.5) }}
            className="bg-gray-50 dark:bg-gray-700/30 rounded p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
            onClick={() => setExpanded(expanded === p._id ? null : p._id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{p.domain}</span>
                  <span>Sem {p.semester}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.guideName}</span>
                  <span>{p.memberCount} members</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusBg(p)}`}>{getDisplayStatus(p)}</span>
                {p.hasCurrentMonthReport ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 font-medium flex items-center gap-0.5">
                    <FileText className="w-2.5 h-2.5" /> report submitted
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-medium flex items-center gap-0.5">
                    <FileText className="w-2.5 h-2.5" /> report pending
                  </span>
                )}
              </div>
            </div>

            {/* Expanded: show members */}
            <AnimatePresence>
              {expanded === p._id && p.members && p.members.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 ml-6 overflow-hidden"
                >
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1">
                    <p className="text-[11px] font-medium text-gray-500 uppercase">Team Members</p>
                    {p.members.map((m, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{m.name}</span>
                        <span className="text-gray-400 font-mono">{m.rollNumber}</span>
                        {m.role === 'leader' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">Leader</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Domain breakdown */}
      {data.domainBreakdown && data.domainBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Domain Distribution
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.domainBreakdown.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
                {d.name} <span className="font-bold ml-1">{d.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ──────── Onboarding Breakdown View (Dept → Semester counts) ──────── */

function OnboardingBreakdownView({ filterValue, title, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ drillDept: 'all', drillType: 'onboardingBreakdown', filterValue })
        const res = await fetch(`/api/admin/stats?${params}`, { cache: 'no-store' })
        if (res.ok) setData(await res.json())
        else toast.error('Failed to load breakdown')
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [filterValue])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-gray-500">Loading breakdown...</span>
    </div>
  )

  if (!data) return null

  // Build department donut data, ensuring CSE/CE/IT always appear
  const deptDonutData = (() => {
    const required = ['IT', 'CSE', 'CE']
    const deptMap = {}
    data.departments.forEach(d => { deptMap[d.name] = d })
    required.forEach(dept => { if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, semesters: [] } })
    return Object.values(deptMap).sort((a, b) => a.name.localeCompare(b.name)).map(d => ({ name: d.name, value: d.total }))
  })()

  const selectedDeptData = selectedDept ? data.departments.find(d => d.name === selectedDept) : null

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={selectedDept ? () => setSelectedDept(null) : onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {selectedDept ? `${selectedDept} Department — Semester Breakdown` : title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedDept
              ? `${selectedDeptData?.total || 0} student${(selectedDeptData?.total || 0) !== 1 ? 's' : ''} in ${selectedDept}`
              : `${data.total} student${data.total !== 1 ? 's' : ''} — Click a department to see semester breakdown`
            }
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDept ? (
          /* ── Semester breakdown for selected department ── */
          <motion.div
            key={`sem-${selectedDept}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-3"
          >
            {!selectedDeptData || selectedDeptData.semesters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <GraduationCap className="w-10 h-10 mb-3" />
                <p className="font-medium text-gray-600 dark:text-gray-300">No students found in {selectedDept}</p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
                  <DonutChart
                    data={selectedDeptData.semesters.map(s => ({ name: s.name, value: s.value }))}
                  />
                </div>
                <div className="space-y-2">
                  {selectedDeptData.semesters.map((sem, j) => (
                    <div key={j} className="flex items-center justify-between px-4 py-2.5 rounded bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sem.name}</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{sem.value} student{sem.value !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* ── Department donut chart ── */
          <motion.div
            key="dept-donut"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Department Distribution</h4>
              <p className="text-[10px] text-gray-400 mb-3">Click a department to view semester-wise breakdown</p>
              <DonutChart
                data={deptDonutData}
                onSegmentClick={(seg) => setSelectedDept(seg.name)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ──────── Registration Drill-Down ──────── */

/* ── Helper: ensure CSE, CE, IT always appear in dept data ── */
function ensureDepartments(deptData) {
  const required = ['IT', 'CSE', 'CE']
  const existing = new Set(deptData.map(d => d.name))
  const result = [...deptData]
  required.forEach(dept => {
    if (!existing.has(dept)) result.push({ name: dept, value: 0 })
  })
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

function RegistrationDrillDown({ stats, onBack, onDrillDeeper }) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Student Registration Overview</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click on Onboarded or Pending Onboarding to drill into department & semester counts</p>
        </div>
      </div>

      {/* Onboarding Status Donut — clickable segments */}
      <div className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Onboarding Status</h4>
        <p className="text-[10px] text-gray-400 mb-4">Click a category to see department-wise & semester-wise breakdown</p>
        <DonutChart
          data={[
            { name: 'Onboarded', value: stats.onboardedStudents || 0, filterValue: 'onboarded' },
            { name: 'Pending Onboarding', value: stats.notOnboardedStudents || 0, filterValue: 'pending' },
          ]}
          onSegmentClick={(seg) => onDrillDeeper({ type: 'onboardingBreakdown', filterValue: seg.filterValue, title: `${seg.name} Students — Department & Semester` })}
        />
      </div>
    </motion.div>
  )
}

/* ──────── Project Assignment Drill-Down ──────── */

function ProjectAssignmentDrillDown({ stats, onBack, onDrillDeeper }) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Group Assignment</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click on Assigned or Not Assigned to drill into department & semester counts</p>
        </div>
      </div>

      {/* Assignment Status Donut — clickable segments */}
      <div className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Guide Assignment Status</h4>
        <p className="text-[10px] text-gray-400 mb-4">Click a category to see department-wise & semester-wise breakdown</p>
        <DonutChart
          data={[
            { name: 'Guide Assigned', value: stats.assignedGroups || 0, filterValue: 'assigned' },
            { name: 'Not Assigned', value: stats.unassignedGroups || 0, filterValue: 'unassigned' },
          ]}
          centerLabel='groups'
          onSegmentClick={(seg) => onDrillDeeper({ type: 'projectAssignmentBreakdown', filterValue: seg.filterValue, title: `${seg.name} Groups — Department & Semester` })}
        />
      </div>

      {/* No Project Title Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-4 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
        <div className="p-2 rounded bg-amber-100 dark:bg-amber-900/40">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Project Title Submitted</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{stats.noTitleGroups || 0} group{(stats.noTitleGroups || 0) !== 1 ? 's' : ''} haven&apos;t submitted a project title yet</p>
        </div>
        <span className="ml-auto text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.noTitleGroups || 0}</span>
      </div>
    </motion.div>
  )
}

/* ──────── Project Assignment Breakdown View (Dept → Semester) ──────── */

function ProjectAssignmentBreakdownView({ filterValue, title, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ drillDept: 'all', drillType: 'projectAssignmentBreakdown', filterValue })
        const res = await fetch(`/api/admin/stats?${params}`, { cache: 'no-store' })
        if (res.ok) setData(await res.json())
        else toast.error('Failed to load breakdown')
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [filterValue])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-gray-500">Loading breakdown...</span>
    </div>
  )

  if (!data) return null

  // Build department donut data, ensuring CSE/CE/IT always appear
  const deptDonutData = (() => {
    const required = ['IT', 'CSE', 'CE']
    const deptMap = {}
    data.departments.forEach(d => { deptMap[d.name] = d })
    required.forEach(dept => { if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, semesters: [] } })
    return Object.values(deptMap).sort((a, b) => a.name.localeCompare(b.name)).map(d => ({ name: d.name, value: d.total }))
  })()

  const selectedDeptData = selectedDept ? data.departments.find(d => d.name === selectedDept) : null

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={selectedDept ? () => setSelectedDept(null) : onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {selectedDept ? `${selectedDept} Department — Semester Breakdown` : title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedDept
              ? `${selectedDeptData?.total || 0} student${(selectedDeptData?.total || 0) !== 1 ? 's' : ''} in ${selectedDept}`
              : `${data.total} student${data.total !== 1 ? 's' : ''} — Click a department to see semester breakdown`
            }
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDept ? (
          /* ── Semester breakdown for selected department ── */
          <motion.div
            key={`sem-${selectedDept}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-3"
          >
            {!selectedDeptData || selectedDeptData.semesters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <GraduationCap className="w-10 h-10 mb-3" />
                <p className="font-medium text-gray-600 dark:text-gray-300">No students found in {selectedDept}</p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
                  <DonutChart
                    data={selectedDeptData.semesters.map(s => ({ name: s.name, value: s.value }))}
                  />
                </div>
                <div className="space-y-2">
                  {selectedDeptData.semesters.map((sem, j) => (
                    <div key={j} className="flex items-center justify-between px-4 py-2.5 rounded bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sem.name}</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{sem.value} student{sem.value !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* ── Department donut chart ── */
          <motion.div
            key="dept-donut"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Department Distribution</h4>
              <p className="text-[10px] text-gray-400 mb-3">Click a department to view semester-wise breakdown</p>
              <DonutChart
                data={deptDonutData}
                onSegmentClick={(seg) => setSelectedDept(seg.name)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ──────── Main Dashboard ──────── */

/* ──────── All Projects Dashboard Section ──────── */

function AllProjectsSection() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true)
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setProjects((data.projects || []).filter(p => p.status !== 'rejected'))
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchProjects()
  }, [])

  const getDisplayStatus = (p) => {
    const reports = p.monthlyReports || []
    if (p.status === 'completed') return { label: 'Completed', cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' }
    if (reports.length === 0) return { label: 'In Progress', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' }
    const allGraded = reports.every(r => r.status === 'graded')
    if (allGraded) return { label: 'Submitted', cls: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' }
    return { label: 'Under Review', cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' }
  }

  const filtered = projects.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.title?.toLowerCase().includes(q) ||
      p.domain?.toLowerCase().includes(q) ||
      p.groupId?.toLowerCase().includes(q) ||
      p.internalGuide?.academicInfo?.name?.toLowerCase().includes(q)
    )
  })

  if (loading) return (
    <div className="bg-white dark:bg-gray-800 rounded p-6 border border-gray-200 dark:border-gray-700 flex items-center justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
      <span className="text-sm text-gray-500">Loading projects...</span>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" /> All Projects
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search title, domain, guide..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-56"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Briefcase className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm font-medium">No projects found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {filtered.map((p) => {
            const status = getDisplayStatus(p)
            const reports = p.monthlyReports || []
            const gradedReports = reports.filter(r => r.status === 'graded')
            const guideName = p.internalGuide?.academicInfo?.name || p.internalGuide?.email || 'Not assigned'
            const isExpanded = expanded === p._id

            return (
              <div
                key={p._id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : p._id)}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.title || 'Untitled'}</span>
                      <span className="text-[10px] font-mono text-gray-400 hidden sm:block">{p.groupId}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 ml-6 text-xs text-gray-500">
                      {p.domain && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{p.domain}</span>}
                      <span>Sem {p.semester}</span>
                      <span className="flex items-center gap-1 truncate"><Users className="w-3 h-3" />{guideName}</span>
                      <span>{(p.members || []).length} member{(p.members || []).length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      <span className="font-medium text-green-600">{gradedReports.length}</span>/{reports.length} graded
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${status.cls}`}>{status.label}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-3 ml-6 space-y-2">
                        {p.members && p.members.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">Team Members</p>
                            <div className="flex flex-wrap gap-2">
                              {p.members.map((m, j) => {
                                const studentName = m.student?.academicInfo?.name || m.student?.email || `Member ${j + 1}`
                                const rollNo = m.student?.academicInfo?.rollNumber || ''
                                return (
                                  <div key={j} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span>{studentName}</span>
                                    {rollNo && <span className="text-gray-400 font-mono">{rollNo}</span>}
                                    {m.role === 'leader' && <span className="text-[10px] px-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">Leader</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {reports.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">Monthly Reports</p>
                            <div className="flex flex-wrap gap-2">
                              {reports.map((r, j) => {
                                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                                const label = `${months[r.month - 1]} ${r.year}`
                                const isGraded = r.status === 'graded'
                                return (
                                  <div key={j} className={`px-2.5 py-1 rounded border text-xs ${isGraded ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'}`}>
                                    {label}{isGraded && r.score !== undefined ? ` — ${r.score}` : ' (pending)'}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// StudentGradesSection removed — grades are shown in the Students module
function _StudentGradesSection_removed() {

  useEffect(() => {
    async function fetchGrades() {
      try {
        const params = new URLSearchParams()
        if (semesterFilter) params.append('semester', semesterFilter)
        const res = await fetch(`/api/projects/grades?${params}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setGrades(data.studentGrades || [])
        } else {
          toast.error('Failed to load grades')
        }
      } catch (e) {
        console.error('Failed to fetch grades:', e)
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    fetchGrades()
  }, [semesterFilter])

  const filteredGrades = grades.filter(g => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      g.studentName?.toLowerCase().includes(q) ||
      g.rollNumber?.toLowerCase().includes(q) ||
      g.projectTitle?.toLowerCase().includes(q) ||
      g.groupId?.toLowerCase().includes(q)
    )
  })

  const semesters = [...new Set(grades.map(g => g.semester))].sort((a, b) => a - b)

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-gray-400'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score === null || score === undefined) return 'bg-gray-50 dark:bg-gray-700/30'
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 60) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 40) return 'bg-amber-50 dark:bg-amber-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Loading student grades...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded p-6 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" /> Student Grades
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{filteredGrades.length} student record{filteredGrades.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Semester filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
            />
          </div>
        </div>
      </div>

      {filteredGrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Award className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm font-medium">No grades found</p>
          <p className="text-xs mt-1">Grades will appear here once guides submit evaluations</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Student</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Roll No</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Project</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Guide</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Sem</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Reports</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Avg Score</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrades.map((g, i) => (
                <>
                  <tr
                    key={`row-${g.studentId}-${g.groupId}`}
                    className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${expandedStudent === `${g.studentId}-${g.groupId}` ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {g.studentName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{g.studentName}</span>
                          {g.role === 'leader' && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium">Leader</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{g.rollNumber || '—'}</td>
                    <td className="py-2.5 px-3">
                      <div className="max-w-[180px] truncate text-gray-700 dark:text-gray-300" title={g.projectTitle}>{g.projectTitle || 'Untitled'}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{g.groupId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 text-xs">{g.guideName}</td>
                    <td className="py-2.5 px-3 text-center text-gray-600 dark:text-gray-400">{g.semester}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-xs">
                        <span className="font-medium text-green-600">{g.gradedReports}</span>
                        <span className="text-gray-400">/{g.totalReports}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {g.avgScore !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(g.avgScore)} ${getScoreBg(g.avgScore)}`}>
                          {g.avgScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {g.reportDetails && g.reportDetails.length > 0 ? (
                        <button
                          onClick={() => setExpandedStudent(expandedStudent === `${g.studentId}-${g.groupId}` ? null : `${g.studentId}-${g.groupId}`)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-500 hover:text-blue-600"
                        >
                          {expandedStudent === `${g.studentId}-${g.groupId}` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  {/* Expanded report details row */}
                  <AnimatePresence>
                    {expandedStudent === `${g.studentId}-${g.groupId}` && g.reportDetails && g.reportDetails.length > 0 && (
                      <motion.tr
                        key={`detail-${g.studentId}-${g.groupId}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan="8" className="py-0 px-3">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="py-3 pl-9 space-y-1.5">
                              <p className="text-[11px] font-medium text-gray-500 uppercase mb-2">Monthly Report Scores</p>
                              <div className="flex flex-wrap gap-2">
                                {g.reportDetails.map((r, j) => (
                                  <div
                                    key={j}
                                    className={`px-3 py-1.5 rounded border text-xs ${getScoreBg(r.score)} border-gray-200 dark:border-gray-600`}
                                    title={r.feedback || 'No feedback'}
                                  >
                                    <span className="text-gray-500">{r.month}/{r.year}</span>
                                    <span className={`ml-2 font-bold ${getScoreColor(r.score)}`}>{r.score}</span>
                                    {r.grade && <span className="ml-1 text-gray-400">({r.grade})</span>}
                                  </div>
                                ))}
                              </div>
                              {g.progressScore > 0 && (
                                <p className="text-[11px] text-gray-500 mt-2">Overall progress: <span className="font-medium text-gray-700 dark:text-gray-300">{g.progressScore}%</span></p>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  // Drill-down navigation: null = main view, or { type, ...params }
  const [drillView, setDrillView] = useState(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/'); return }
    const allowed = ['admin', 'mainadmin', 'principal', 'hod', 'project_coordinator']
    if (!allowed.includes(session.user.role)) { router.push('/dashboard'); return }
  }, [session, status, router])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })
      if (res.ok) setStats(await res.json())
      else toast.error('Failed to load statistics')
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const getRoleTitle = () => {
    const role = session?.user?.role
    const dept = session?.user?.department
    return {
      admin: 'Administration Dashboard',
      mainadmin: 'Administration Dashboard',
      principal: 'Principal Dashboard',
      hod: `HOD Dashboard${dept ? ` — ${dept}` : ''}`,
      project_coordinator: `Project Coordinator Dashboard${dept ? ` — ${dept}` : ''}`,
    }[role] || 'Dashboard'
  }

  const getRoleDesc = () => {
    return {
      admin: 'Institute-wide overview of projects, students, and guide allocations',
      mainadmin: 'Institute-wide overview of projects, students, and guide allocations',
      principal: 'Institute performance overview and project status summary',
      hod: 'Department project management and student overview',
      project_coordinator: 'Department project coordination and tracking',
    }[session?.user?.role] || 'Overview'
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const allowed = ['admin', 'mainadmin', 'principal', 'hod', 'project_coordinator']
  if (!session || !allowed.includes(session.user.role)) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{getRoleTitle()}</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">{getRoleDesc()}</p>
      </div>

      {/* Charts Row: Registration + Project Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          onClick={() => setDrillView({ type: 'registration' })}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Student Registration</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Click to view details</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <DonutChart
            data={[
              { name: 'Onboarded', value: stats.onboardedStudents || 0 },
              { name: 'Pending Onboarding', value: stats.notOnboardedStudents || 0 },
            ]}
            centerLabel="students"
          />
        </motion.div>

        {/* Project Assignment */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          onClick={() => setDrillView({ type: 'projectAssignment' })}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Guide Assignment</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Click to view details</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <DonutChart
            data={[
              { name: 'Guide Assigned', value: stats.assignedGroups || 0 },
              { name: 'Not Assigned', value: stats.unassignedGroups || 0 },
            ]}
            centerLabel="groups"
          />
        </motion.div>
      </div>

      {/* Charts Row: Department Distribution + Domain Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-wise Students */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-500" /> Students by Department
          </h3>
          <BarChart data={stats.departmentDistribution || []} colorClass="bg-blue-500" />
        </motion.div>

        {/* Domain Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-500" /> Projects by Domain
          </h3>
          <DonutChart data={stats.domainDistribution || []} />
        </motion.div>
      </div>

      {/* Charts Row: Semester Distribution + Guide Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semester Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-500" /> Students by Semester
          </h3>
          <BarChart data={stats.semesterDistribution || []} colorClass="bg-teal-500" />
        </motion.div>

        {/* Guide Allocation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-800 rounded p-5 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" /> Guide Workload
          </h3>
          <BarChart
            data={(stats.guideAllocation || []).slice(0, 10).map(g => ({
              name: g.guideName || 'Unknown',
              value: g.projectCount
            }))}
            colorClass="bg-indigo-500"
          />
        </motion.div>
      </div>

      {/* Drill-down Modal Overlay */}
      <AnimatePresence>
        {drillView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDrillView(null) }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
            >
              {/* Close button */}
              <button
                onClick={() => setDrillView(null)}
                className="absolute top-3 right-3 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
              >
                <XCircle className="w-5 h-5" />
              </button>

              {drillView.type === 'registration' && (
                <RegistrationDrillDown
                  stats={stats}
                  onBack={() => setDrillView(null)}
                  onDrillDeeper={(params) => setDrillView(params)}
                />
              )}
              {drillView.type === 'projectAssignment' && (
                <ProjectAssignmentDrillDown
                  stats={stats}
                  onBack={() => setDrillView(null)}
                  onDrillDeeper={(params) => setDrillView(params)}
                />
              )}
              {drillView.type === 'onboardingBreakdown' && (
                <OnboardingBreakdownView
                  filterValue={drillView.filterValue}
                  title={drillView.title}
                  onBack={() => setDrillView({ type: 'registration' })}
                />
              )}
              {drillView.type === 'projectAssignmentBreakdown' && (
                <ProjectAssignmentBreakdownView
                  filterValue={drillView.filterValue}
                  title={drillView.title}
                  onBack={() => setDrillView({ type: 'projectAssignment' })}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
