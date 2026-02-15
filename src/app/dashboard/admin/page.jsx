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
  X,
  User,
  Search,
  Loader2,
  FolderOpen,
  Tag,
  Users,
  Eye,
  Building2,
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
      className={`flex items-center gap-6 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="w-36 h-36 rounded-full flex-shrink-0 relative" style={{ background: `conic-gradient(${grad})` }}>
        <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-700 dark:text-gray-200">{total}</span>
          {centerLabel && <span className="text-[9px] text-gray-400 -mt-0.5">{centerLabel}</span>}
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {segs.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 text-sm ${onSegmentClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1 -mx-2 transition-colors' : ''}`}
            onClick={(e) => {
              if (onSegmentClick) {
                e.stopPropagation()
                onSegmentClick(s)
              }
            }}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-300 truncate" title={s.name}>{s.name}</span>
            <span className="ml-auto font-semibold text-gray-700 dark:text-gray-200">{s.value}</span>
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
          className={`flex items-center gap-3 ${onBarClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1 -mx-2 transition-colors' : ''}`}
          onClick={() => onBarClick && item.value > 0 && onBarClick(item)}
        >
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-24 truncate" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colorClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-8 text-right">{item.value}</span>
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

  const statusColor = (s) => {
    if (s.project?.status === 'completed') return 'text-green-600'
    if (s.project?.status === 'in-progress') return 'text-amber-600'
    if (s.project?.status === 'rejected') return 'text-red-600'
    return 'text-gray-500'
  }

  const statusBg = (s) => {
    if (s.project?.status === 'completed') return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    if (s.project?.status === 'in-progress') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
    if (s.project?.status === 'rejected') return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
    if (s.hasProject) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
    return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
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
            className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
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
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {int}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBg(s)}`}>
                  {s.project ? s.project.status : (s.hasProject ? 'assigned' : 'no project')}
                </span>
                {s.isOnboarded ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 font-medium">onboarded</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-medium">not onboarded</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interest domain breakdown */}
      {data.interestBreakdown && data.interestBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Interest Domains
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.interestBreakdown.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
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

  const statusBg = (status) => {
    const map = {
      'completed': 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      'in-progress': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
      'rejected': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      'approved': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      'submitted': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
    }
    return map[status] || 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
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
            className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBg(p.status)}`}>{p.status}</span>
                {p.hasCurrentMonthReport ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 font-medium flex items-center gap-0.5">
                    <FileText className="w-2.5 h-2.5" /> report submitted
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-medium flex items-center gap-0.5">
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
                    <p className="text-[11px] font-semibold text-gray-500 uppercase">Team Members</p>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Domain Distribution
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.domainBreakdown.map((d, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
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
        <button onClick={selectedDept ? () => setSelectedDept(null) : onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
                <p className="font-semibold text-gray-600 dark:text-gray-300">No students found in {selectedDept}</p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <DonutChart
                    data={selectedDeptData.semesters.map(s => ({ name: s.name, value: s.value }))}
                  />
                </div>
                <div className="space-y-2">
                  {selectedDeptData.semesters.map((sem, j) => (
                    <div key={j} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Department Distribution</h4>
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
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Student Registration Overview</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click on Onboarded or Pending Onboarding to drill into department & semester counts</p>
        </div>
      </div>

      {/* Onboarding Status Donut — clickable segments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Onboarding Status</h4>
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
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Group Assignment</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click on Assigned or Not Assigned to drill into department & semester counts</p>
        </div>
      </div>

      {/* Assignment Status Donut — clickable segments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Guide Assignment Status</h4>
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
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">No Project Title Submitted</p>
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
        <button onClick={selectedDept ? () => setSelectedDept(null) : onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
                <p className="font-semibold text-gray-600 dark:text-gray-300">No students found in {selectedDept}</p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <DonutChart
                    data={selectedDeptData.semesters.map(s => ({ name: s.name, value: s.value }))}
                  />
                </div>
                <div className="space-y-2">
                  {selectedDeptData.semesters.map((sem, j) => (
                    <div key={j} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Department Distribution</h4>
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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [drillDown, setDrillDown] = useState(null) // 'registration' | 'assignment' | null
  const [deepDrill, setDeepDrill] = useState(null) // { type: 'student'|'project', filterBy, filterValue, title } | null

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

  /* ---- Cards ---- */
  const statCards = [
    { name: 'Total Students', value: stats.totalStudents || 0, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', link: '/dashboard/students' },
    { name: 'Onboarded', value: stats.onboardedStudents || 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
    { name: 'Total Guides', value: stats.totalFaculty || 0, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', link: '/dashboard/guides' },
    { name: 'Total Projects', value: stats.totalProjects || 0, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', link: '/dashboard/projects' },
  ]

  const projectCards = [
    { name: 'In Progress', value: stats.inProgressProjects || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    { name: 'Completed', value: stats.completedProjects || 0, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },
    { name: 'Reports Submitted', value: stats.reportsSubmittedCount || 0, icon: FileText, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
    { name: 'Reports Pending', value: stats.reportsPendingCount || 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{getRoleTitle()}</h1>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-1">{getRoleDesc()}</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={() => stat.link && router.push(stat.link)}
            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border ${stat.border} ${stat.link ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.name}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Project Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Project Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {projectCards.map((stat, i) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
              className={`bg-white dark:bg-gray-800 rounded-xl p-5 border ${stat.border} transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.name}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal Overlay for Drill-down */}
      <AnimatePresence>
        {drillDown && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 px-4 overflow-y-auto"
            onClick={() => { setDeepDrill(null); setDrillDown(null) }}
          >
            {/* Blurred backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal content */}
            <motion.div
              key={`modal-${drillDown}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => { setDeepDrill(null); setDrillDown(null) }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Level 3: Deep drill-down */}
              {deepDrill ? (
                deepDrill.type === 'project' ? (
                  <ProjectListView
                    filterBy={deepDrill.filterBy}
                    filterValue={deepDrill.filterValue}
                    title={deepDrill.title}
                    onBack={() => setDeepDrill(null)}
                  />
                ) : deepDrill.type === 'onboardingBreakdown' ? (
                  <OnboardingBreakdownView
                    filterValue={deepDrill.filterValue}
                    title={deepDrill.title}
                    onBack={() => setDeepDrill(null)}
                  />
                ) : deepDrill.type === 'projectAssignmentBreakdown' ? (
                  <ProjectAssignmentBreakdownView
                    filterValue={deepDrill.filterValue}
                    title={deepDrill.title}
                    onBack={() => setDeepDrill(null)}
                  />
                ) : (
                  <StudentListView
                    filterBy={deepDrill.filterBy}
                    filterValue={deepDrill.filterValue}
                    title={deepDrill.title}
                    onBack={() => setDeepDrill(null)}
                  />
                )
              ) : (
                <>
                  {/* Level 2: Summary drill-down */}
                  {drillDown === 'registration' && (
                    <RegistrationDrillDown
                      stats={stats}
                      onBack={() => setDrillDown(null)}
                      onDrillDeeper={(cfg) => setDeepDrill({ type: cfg.type || 'student', ...cfg })}
                    />
                  )}
                  {drillDown === 'assignment' && (
                    <ProjectAssignmentDrillDown
                      stats={stats}
                      onBack={() => setDrillDown(null)}
                      onDrillDeeper={(cfg) => setDeepDrill({ type: cfg.type || 'student', ...cfg })}
                    />
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two clickable donut charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Student Registration Status */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => { setDeepDrill(null); setDrillDown(drillDown === 'registration' ? null : 'registration') }}
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Student Registration Status</h3>
          <p className="text-sm text-gray-400 mb-4">Click to view detailed breakdown</p>
          <DonutChart data={[
            { name: 'Onboarded', value: stats.onboardedStudents || 0 },
            { name: 'Pending Onboarding', value: stats.notOnboardedStudents || 0 },
          ]} />
        </motion.div>

        {/* Student Project Assignment */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => { setDeepDrill(null); setDrillDown(drillDown === 'assignment' ? null : 'assignment') }}
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Project Group Assignment</h3>
          <p className="text-sm text-gray-400 mb-4">Click to view detailed breakdown</p>
          <DonutChart data={[
            { name: 'Guide Assigned', value: stats.assignedGroups || 0 },
            { name: 'Not Assigned', value: stats.unassignedGroups || 0 },
          ]} centerLabel='groups' />
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
            <FileText className="w-3 h-3" />
            <span><strong>{stats.noTitleGroups || 0}</strong> group{(stats.noTitleGroups || 0) !== 1 ? 's' : ''} without project title</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
