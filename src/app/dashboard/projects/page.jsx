"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { PROJECT_DOMAINS } from '@/lib/domains'
import { wordCount } from '@/lib/clientValidation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  CheckCircle, XCircle, Clock, Send, FileText, Calendar, Star, 
  Users, Eye, ChevronDown, ChevronUp, Download, Upload, Plus, 
  Trash2, MessageSquare, AlertCircle, BookOpen, Award, Filter
} from 'lucide-react'

// ─── Constants ───
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const GRADE_OPTIONS = ['A+','A','B+','B','C+','C','D','F']

export default function ProjectsPage(){
  const { data: session } = useSession()
  const role = session?.user?.role
  const isStudent = role === 'student'
  const isHod = role === 'hod'
  const isAdmin = role === 'admin'
  const isGuide = role === 'guide'
  const isPrincipal = role === 'principal'
  const isMainAdmin = role === 'mainadmin'
  const isReadOnly = isPrincipal

  // ─── State ───
  const [studentView, setStudentView] = useState('all')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [projects, setProjects] = useState([])
  const [mine, setMine] = useState([])
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Filters
  const [university, setUniversity] = useState('')
  const [institute, setInstitute] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [domain, setDomain] = useState('')
  const [guide, setGuide] = useState('')
  const [search, setSearch] = useState('')
  const [guideStatusFilter, setGuideStatusFilter] = useState('')

  // Sort / Page
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Field visibility
  const FIELD_OPTIONS = [
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'domain', label: 'Domain' },
    { key: 'internal', label: 'Internal Guide' },
    { key: 'guideStatus', label: 'Guide Status' },
    { key: 'external', label: 'External Guide' },
    { key: 'progress', label: 'Progress' },
    { key: 'status', label: 'HOD Status' },
    { key: 'members', label: 'Members Count' }
  ]
  const [visibleFields, setVisibleFields] = useState(['department','semester','domain','internal','guideStatus','status','progress','members'])
  const toggleField = key => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])
  const toggleExclusive = (current, setter, val) => setter(current === val ? '' : val)

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', domain:'', department:'', semester:1, technology:'' })
  const [selected, setSelected] = useState(null)
  const [addingMember, setAddingMember] = useState('')

  // Static options
  const universities = ['CHARUSAT','Others']
  const institutes = isHod ? [session?.user?.academicInfo?.institute].filter(Boolean) : ['DEPSTAR','Others']
  const departmentsList = isHod ? [session?.user?.academicInfo?.department].filter(Boolean) : ['CSE','CE','IT','ME','EC','CIVIL']
  const semesters = ['1','2','3','4','5','6','7','8']
  const statuses = ['submitted','under-review','approved','rejected','in-progress','completed']
  const guideStatuses = ['not-assigned','pending','accepted','rejected']

  // ─── Data Loading ───
  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        const list = data.projects || []
        setProjects(list)
        if (isStudent) {
          setMine(list.filter(p => p.members.some(m => String(m.student?._id || m.student) === String(session.user.id))))
        }
      }
    } finally { setLoading(false) }
  }, [isStudent, session?.user?.id])

  const loadGuides = useCallback(async () => {
    if (!isHod && !isAdmin && !isMainAdmin) return
    const res = await fetch('/api/guides')
    if (res.ok) { const data = await res.json(); setGuides(data.guides || data.faculty || []) }
  }, [isHod, isAdmin, isMainAdmin])

  useEffect(() => { loadProjects(); loadGuides() }, [loadProjects, loadGuides])

  // ─── Member Search ───
  const searchTimeoutRef = useRef(null)
  const searchMembers = async (query) => {
    if (query.length < 2) { setMemberSuggestions([]); return }
    setSearchLoading(true)
    try {
      const excludeEmails = [session?.user?.email, ...selectedMembers.map(m => m.email)].filter(Boolean).join(',')
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(query)}&exclude=${encodeURIComponent(excludeEmails)}`)
      if (res.ok) { const data = await res.json(); setMemberSuggestions(data.students || []) }
    } catch { /* ignore */ } finally { setSearchLoading(false) }
  }

  const debouncedSearch = (query) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => searchMembers(query), 300)
  }

  const addMemberToSelection = (student) => {
    if (selectedMembers.find(m => m.email === student.email)) {
      toast(`${student.studentId} is already in your team`, { icon: 'ℹ️' })
    } else {
      setSelectedMembers(prev => [...prev, student])
      const leaderInst = session?.user?.academicInfo?.institute
      if (leaderInst && student.institute && leaderInst !== student.institute) {
        toast('⚠️ Different institute — team must be same institute', { icon: '⚠️', style: { background:'#f59e0b', color:'#fff' } })
      } else {
        toast.success(`Added ${student.studentId} - ${student.name}`)
      }
    }
    setMemberSearch(''); setMemberSuggestions([]); setSearchLoading(false)
  }

  const removeMemberFromSelection = (email) => setSelectedMembers(prev => prev.filter(m => m.email !== email))

  const clearAllFormFields = () => {
    setForm({ title:'', description:'', domain:'', department:'', semester:1, technology:'' })
    setSelectedMembers([]); setMemberSearch(''); setMemberSuggestions([]); setSearchLoading(false)
  }
  const openCreateModal = () => { clearAllFormFields(); setShowCreate(true) }
  const closeCreateModal = () => { clearAllFormFields(); setShowCreate(false) }

  const descWords = wordCount(form.description)
  const formValid = form.title.trim() && form.domain && descWords <= 200

  // ─── Actions ───
  const submitProject = async () => {
    try {
      const payload = { ...form }
      if (!payload.department) payload.department = session?.user?.academicInfo?.department
      if (payload.department) payload.department = payload.department.toUpperCase()
      const memberEmails = selectedMembers.map(m => m.email)
      payload.memberEmails = memberEmails
      if (descWords > 200) { toast.error('Description exceeds 200 words'); return }
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { toast.success('Project group created!'); closeCreateModal(); loadProjects() }
      else { const e = await res.json(); toast.error(e.error?.message || 'Failed') }
    } catch { toast.error('Failed to create project') }
  }

  const approveProject = async (projectId, approve, remarks = '') => {
    const hodApproval = approve ? 'approved' : 'rejected'
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, hodApproval, hodRemarks: remarks }) })
    if (res.ok) { toast.success(`Project ${hodApproval}`); loadProjects() } else { const e = await res.json(); toast.error(e.error?.message || 'Error') }
  }

  const assignInternal = async (projectId, internalGuideId) => {
    if (!internalGuideId) return
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, internalGuideId }) })
    if (res.ok) { toast.success('Guide assigned'); loadProjects() } else { const e = await res.json(); toast.error(e.error?.message || 'Error') }
  }

  const respondToGuide = async (projectId, response, remarks = '') => {
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, guideResponse: response, guideRemarks: remarks }) })
    if (res.ok) { toast.success(response === 'accepted' ? 'Project accepted' : 'Project declined'); loadProjects() } else { const e = await res.json(); toast.error(e.error?.message || 'Error') }
  }

  const addMember = async (projectId) => {
    if (!addingMember) return toast.error('Enter student email or id')
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, addMember: addingMember }) })
    if (res.ok) { toast.success('Member added'); setAddingMember(''); loadProjects() } else { const e = await res.json(); toast.error(e.error?.message || 'Failed') }
  }

  const removeMember = async (projectId, memberId) => {
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, removeMember: memberId }) })
    if (res.ok) { toast.success('Removed'); loadProjects() } else { const e = await res.json(); toast.error(e.error?.message || 'Failed') }
  }

  // ─── Filtering & Sorting ───
  let base = projects
  if (isStudent) {
    base = studentView === 'mine' ? mine : projects
  } else if (isHod) {
    const hodDept = session?.user?.academicInfo?.department
    base = projects.filter(p => hodDept ? p.department === hodDept : true)
  }

  const availableGuides = isHod
    ? guides.filter(g => { const d = session?.user?.academicInfo?.department; return d ? g.department === d : true })
    : guides

  const domainsAll = Array.from(new Set(base.map(p => p.domain).filter(Boolean)))
  const filtered = base
    .filter(p => !university || p.leader?.university === university)
    .filter(p => !institute || p.leader?.institute === institute)
    .filter(p => !department || p.department === department)
    .filter(p => !semester || String(p.semester) === semester)
    .filter(p => !status || p.status === status)
    .filter(p => !domain || p.domain === domain)
    .filter(p => !guide || (p.internalGuide && String(p.internalGuide._id) === guide))
    .filter(p => !guideStatusFilter || p.guideStatus === guideStatusFilter)
    .filter(p => !search || (p.title || '').toLowerCase().includes(search.toLowerCase()))

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortField) return 0
    let av, bv
    switch (sortField) {
      case 'title': av = a.title || ''; bv = b.title || ''; break
      case 'department': av = a.department || ''; bv = b.department || ''; break
      case 'semester': av = a.semester || 0; bv = b.semester || 0; break
      case 'domain': av = a.domain || ''; bv = b.domain || ''; break
      case 'progress': av = a.progressScore || 0; bv = b.progressScore || 0; break
      case 'status': av = a.hodApproval || 'pending'; bv = b.hodApproval || 'pending'; break
      case 'members': av = a.members?.length || 0; bv = b.members?.length || 0; break
      case 'leader': av = a.leader?.academicInfo?.name || ''; bv = b.leader?.academicInfo?.name || ''; break
      default: return 0
    }
    if (typeof av === 'number' && typeof bv === 'number') return sortDirection === 'asc' ? av - bv : bv - av
    return sortDirection === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className='w-3 h-3 text-gray-400' />
    return sortDirection === 'asc' ? <ChevronUp className='w-3 h-3 text-blue-600' /> : <ChevronDown className='w-3 h-3 text-blue-600' />
  }

  // Pagination
  const totalItems = sortedFiltered.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentItems = sortedFiltered.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [university, institute, department, semester, status, domain, guide, search, guideStatusFilter])

  const submitFilters = e => { e.preventDefault(); setSubmitted(true) }
  const resetFilters = () => {
    setUniversity(''); setInstitute(''); setDepartment(''); setSemester(''); setStatus(''); setDomain(''); setGuide('')
    setSearch(''); setGuideStatusFilter(''); setSubmitted(false); setSortField(''); setSortDirection('asc'); setCurrentPage(1)
  }

  const exportToCSV = () => {
    const headers = ['Title','Group ID','Leader','Department','Semester','Domain','HOD Status','Guide Status','Progress','Members']
    const rows = sortedFiltered.map(p => [p.title||'', p.groupId||'', p.leader?.academicInfo?.name||p.leader?.email||'', p.department||'', p.semester||'', p.domain||'', p.hodApproval||'pending', p.guideStatus||'not-assigned', p.progressScore||0, p.members?.length||0])
    const csv = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    toast.success('Exported!')
  }

  // ─── Render ───
  return (
    <div className='space-y-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Projects</h1>
        <p className='text-gray-600 dark:text-gray-300 mt-1'>
          {isGuide ? 'Your assigned projects' : isHod ? 'Department projects' : isPrincipal ? 'All projects (read-only)' : isAdmin ? 'Manage project groups' : 'Project groups'}
        </p>
      </div>

      {/* ─── Student Controls ─── */}
      {isStudent && (
        <div className='card p-4 mb-4'>
          <div className='flex flex-wrap gap-3'>
            <button onClick={openCreateModal} className='px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
              <Plus className='w-4 h-4 inline mr-1' /> Create Group Project
            </button>
            <button onClick={() => setStudentView('all')} className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${studentView === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
              <Eye className='w-4 h-4 inline mr-1' /> See All Projects
            </button>
            <button onClick={() => setStudentView('mine')} className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${studentView === 'mine' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
              <BookOpen className='w-4 h-4 inline mr-1' /> My Projects
            </button>
          </div>
        </div>
      )}

      {/* ─── Guide Pending Actions Banner ─── */}
      {isGuide && projects.filter(p => p.guideStatus === 'pending').length > 0 && (
        <div className='card p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20'>
          <div className='flex items-center gap-2'>
            <AlertCircle className='w-5 h-5 text-orange-600' />
            <span className='font-semibold text-orange-800 dark:text-orange-300'>
              {projects.filter(p => p.guideStatus === 'pending').length} project(s) awaiting your response
            </span>
          </div>
        </div>
      )}

      {/* ─── Filters (non-student) ─── */}
      {!isStudent && (
        <form onSubmit={submitFilters} className='card p-6 mb-6 space-y-4'>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-2 text-gray-600 dark:text-gray-300'>University</p>
                <div className='flex flex-wrap gap-3'>
                  <button type='button' disabled className='px-4 py-2.5 rounded-lg border text-sm font-semibold bg-blue-600 text-white border-blue-600 shadow-md cursor-default'>CHARUSAT</button>
                </div>
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-2 text-gray-600 dark:text-gray-300'>Institute</p>
                <div className='flex flex-wrap gap-3'>
                  <button type='button' disabled className='px-4 py-2.5 rounded-lg border text-sm font-semibold bg-blue-600 text-white border-blue-600 shadow-md cursor-default'>DEPSTAR</button>
                </div>
              </div>
              <FilterGroup title='DEPARTMENT' options={departmentsList} value={department} onSelect={v => toggleExclusive(department, setDepartment, v)} />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FilterGroup title='SEMESTER' options={semesters} value={semester} onSelect={v => toggleExclusive(semester, setSemester, v)} />
              <FilterGroup title='STATUS' options={statuses} value={status} onSelect={v => toggleExclusive(status, setStatus, v)} />
            </div>
            {(isHod || isAdmin || isMainAdmin) && (
              <FilterGroup title='GUIDE STATUS' options={guideStatuses} value={guideStatusFilter} onSelect={v => toggleExclusive(guideStatusFilter, setGuideStatusFilter, v)} />
            )}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {(isHod || isAdmin || isMainAdmin) && (
                <div className='w-full'>
                  <p className='text-sm font-bold tracking-wider mb-2 text-gray-600 dark:text-gray-300'>Guide</p>
                  <select value={guide} onChange={e => setGuide(e.target.value)} className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600'>
                    <option value=''>All</option>
                    {availableGuides.filter(g => !department || g.department === department).map(g => <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}</option>)}
                  </select>
                </div>
              )}
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-2 text-gray-600 dark:text-gray-300'>Domain</p>
                <select value={domain} onChange={e => setDomain(e.target.value)} className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600'>
                  <option value=''>All Domains</option>
                  {domainsAll.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-2 text-gray-600 dark:text-gray-300'>Search</p>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Project title...' className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600' />
              </div>
            </div>
          </div>
          <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
          <div className='flex items-center gap-2'>
            <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700'>Apply</button>
            <button type='button' onClick={resetFilters} className='px-3 py-2 rounded border border-gray-300 hover:bg-gray-50'>Reset</button>
            {sortedFiltered.length > 0 && (
              <button type='button' onClick={exportToCSV} className='px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-2'>
                <Download className='w-4 h-4' /> Export
              </button>
            )}
            <div className='ml-auto text-sm text-gray-600'>{submitted ? `${sortedFiltered.length} result(s)` : ''}</div>
          </div>
        </form>
      )}

      {/* ─── Loading ─── */}
      {loading && <div className='text-center py-12 text-gray-500'><div className='w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2' />Loading projects...</div>}

      {/* ─── Student Card View ─── */}
      {!loading && isStudent && (
        <div className='grid gap-6'>
          {(studentView === 'mine' ? mine : projects).length === 0 ? (
            <div className='text-center py-8 text-gray-500'>{studentView === 'mine' ? 'You are not part of any projects yet.' : 'No projects available.'}</div>
          ) : (
            (studentView === 'mine' ? mine : projects).map(p => (
              <StudentProjectCard key={p._id} project={p} session={session} onView={() => setSelected(p)} />
            ))
          )}
        </div>
      )}

      {/* ─── Guide Card View (default, before applying table filters) ─── */}
      {!loading && isGuide && !submitted && (
        <div className='space-y-6'>
          {projects.filter(p => p.guideStatus === 'pending').length > 0 && (
            <div>
              <h2 className='text-lg font-semibold mb-3 flex items-center gap-2'><Clock className='w-5 h-5 text-orange-500' /> Pending Your Response</h2>
              <div className='grid gap-4'>
                {projects.filter(p => p.guideStatus === 'pending').map(p => (
                  <GuideActionCard key={p._id} project={p} onRespond={respondToGuide} onView={() => setSelected(p)} />
                ))}
              </div>
            </div>
          )}
          {projects.filter(p => p.guideStatus === 'accepted').length > 0 && (
            <div>
              <h2 className='text-lg font-semibold mb-3 flex items-center gap-2'><CheckCircle className='w-5 h-5 text-green-500' /> Your Active Projects</h2>
              <div className='grid gap-4'>
                {projects.filter(p => p.guideStatus === 'accepted').map(p => (
                  <GuideProjectCard key={p._id} project={p} onView={() => setSelected(p)} />
                ))}
              </div>
            </div>
          )}
          {projects.length === 0 && <div className='text-center py-12 text-gray-500'>No projects assigned to you yet.</div>}
        </div>
      )}

      {/* ─── Table View (HOD/Admin/Principal/MainAdmin, or Guide after submit) ─── */}
      {!loading && !isStudent && (isGuide ? submitted : submitted) && (
        <>
          {sortedFiltered.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>No projects match your filters.</div>
          ) : (
            <div className='card overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead className='bg-gray-50 dark:bg-gray-800'>
                    <tr>
                      <th className='px-4 py-3 text-left font-semibold cursor-pointer group' onClick={() => handleSort('title')}>
                        <div className='flex items-center gap-1'>Project <SortIcon field='title' /></div>
                      </th>
                      {visibleFields.includes('department') && <th className='px-4 py-3 text-left font-semibold cursor-pointer' onClick={() => handleSort('department')}><div className='flex items-center gap-1'>Dept <SortIcon field='department' /></div></th>}
                      {visibleFields.includes('semester') && <th className='px-4 py-3 text-left font-semibold cursor-pointer' onClick={() => handleSort('semester')}><div className='flex items-center gap-1'>Sem <SortIcon field='semester' /></div></th>}
                      {visibleFields.includes('domain') && <th className='px-4 py-3 text-left font-semibold'>Domain</th>}
                      {visibleFields.includes('internal') && <th className='px-4 py-3 text-left font-semibold'>Internal Guide</th>}
                      {visibleFields.includes('guideStatus') && <th className='px-4 py-3 text-left font-semibold'>Guide Status</th>}
                      {visibleFields.includes('external') && <th className='px-4 py-3 text-left font-semibold'>External Guide</th>}
                      {visibleFields.includes('status') && <th className='px-4 py-3 text-left font-semibold'>HOD Status</th>}
                      {visibleFields.includes('progress') && <th className='px-4 py-3 text-left font-semibold cursor-pointer' onClick={() => handleSort('progress')}><div className='flex items-center gap-1'>Progress <SortIcon field='progress' /></div></th>}
                      {visibleFields.includes('members') && <th className='px-4 py-3 text-left font-semibold cursor-pointer' onClick={() => handleSort('members')}><div className='flex items-center gap-1'>Team <SortIcon field='members' /></div></th>}
                      <th className='px-4 py-3 text-center font-semibold'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
                    {currentItems.map(p => (
                      <tr key={p._id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                        <td className='px-4 py-3'>
                          <div className='font-medium'>{p.title}</div>
                          <div className='text-[10px] text-gray-500'>{p.groupId} • {p.leader?.academicInfo?.name || p.leader?.email}</div>
                        </td>
                        {visibleFields.includes('department') && <td className='px-4 py-3'><span className='px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-medium'>{p.department}</span></td>}
                        {visibleFields.includes('semester') && <td className='px-4 py-3'><span className='px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-medium'>Sem {p.semester}</span></td>}
                        {visibleFields.includes('domain') && <td className='px-4 py-3 text-gray-600 dark:text-gray-400'>{p.domain || '—'}</td>}
                        {visibleFields.includes('internal') && (
                          <td className='px-4 py-3'>
                            {p.internalGuide ? (
                              <span className='text-green-700 dark:text-green-300'>{p.internalGuide.academicInfo?.name || p.internalGuide.email}</span>
                            ) : (
                              <span className='text-gray-400'>Not Assigned</span>
                            )}
                          </td>
                        )}
                        {visibleFields.includes('guideStatus') && <td className='px-4 py-3'><GuideStatusBadge status={p.guideStatus} /></td>}
                        {visibleFields.includes('external') && <td className='px-4 py-3 text-gray-600 dark:text-gray-400'>{p.externalGuide?.name || '—'}</td>}
                        {visibleFields.includes('status') && <td className='px-4 py-3'><StatusBadge status={p.hodApproval || 'pending'} /></td>}
                        {visibleFields.includes('progress') && (
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-2'>
                              <span className='text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700'>{p.progressScore || 0}%</span>
                              <div className='flex-1 min-w-[60px]'>
                                <div className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                                  <div className={`h-full rounded-full transition-all ${(p.progressScore || 0) >= 80 ? 'bg-green-500' : (p.progressScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${p.progressScore || 0}%` }} />
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleFields.includes('members') && (
                          <td className='px-4 py-3'>
                            <span className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium'>{p.members?.length || 0}</span>
                          </td>
                        )}
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-1.5 flex-wrap'>
                            {isHod && p.hodApproval !== 'approved' && (
                              <button onClick={() => approveProject(p._id, true)} className='px-2 py-1 text-[10px] rounded bg-green-600 text-white hover:bg-green-700'><CheckCircle className='w-3 h-3 inline mr-0.5' />Approve</button>
                            )}
                            {isHod && p.hodApproval !== 'rejected' && (
                              <button onClick={() => approveProject(p._id, false)} className='px-2 py-1 text-[10px] rounded bg-red-600 text-white hover:bg-red-700'><XCircle className='w-3 h-3 inline mr-0.5' />Reject</button>
                            )}
                            {(isHod || isAdmin) && p.hodApproval === 'approved' && (!p.internalGuide || p.guideStatus === 'rejected') && (
                              <button onClick={() => setSelected(p)} className='px-2 py-1 text-[10px] rounded bg-blue-600 text-white hover:bg-blue-700'><Users className='w-3 h-3 inline mr-0.5' />Assign</button>
                            )}
                            <button onClick={() => setSelected(p)} className='px-2 py-1 text-[10px] rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'>
                              <Eye className='w-3 h-3 inline mr-0.5' />View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && <PaginationBar currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={startIndex + itemsPerPage} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} setItemsPerPage={setItemsPerPage} />}
            </div>
          )}
        </>
      )}

      {/* Non-student, no filters applied yet (except guide which has card view) */}
      {!loading && !isStudent && !isGuide && !submitted && (
        <div className='text-center py-12 text-gray-500'>Use the filters above and click Apply.</div>
      )}

      {/* ─── Create Modal ─── */}
      <AnimatePresence>
        {showCreate && isStudent && (
          <CreateProjectModal
            form={form} setForm={setForm} descWords={descWords} formValid={formValid}
            memberSearch={memberSearch} setMemberSearch={setMemberSearch}
            memberSuggestions={memberSuggestions} searchLoading={searchLoading}
            selectedMembers={selectedMembers} debouncedSearch={debouncedSearch}
            addMemberToSelection={addMemberToSelection} removeMemberFromSelection={removeMemberFromSelection}
            setMemberSuggestions={setMemberSuggestions} setSearchLoading={setSearchLoading}
            departmentsList={departmentsList} submitProject={submitProject} closeCreateModal={closeCreateModal}
          />
        )}
      </AnimatePresence>

      {/* ─── Project Detail Modal ─── */}
      <AnimatePresence>
        {selected && (
          <ProjectDetailModal
            project={selected} close={() => { setSelected(null); loadProjects() }} session={session}
            isAdmin={isAdmin} isHod={isHod} isGuide={isGuide} isPrincipal={isPrincipal} isReadOnly={isReadOnly}
            guides={availableGuides} loadProjects={loadProjects}
            assignInternal={assignInternal} approveProject={approveProject}
            respondToGuide={respondToGuide} addMember={addMember} removeMember={removeMember}
            addingMember={addingMember} setAddingMember={setAddingMember}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// ─── Sub-Components ──────────────────────────────
// ═══════════════════════════════════════════════════

function StudentProjectCard({ project: p, session, onView }) {
  const isMember = p.members.some(m => String(m.student?._id || m.student) === String(session?.user?.id))
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='card p-5 hover:shadow-lg transition-shadow cursor-pointer' onClick={onView}>
      <div className='flex items-start justify-between'>
        <div>
          <h3 className='font-semibold text-lg'>{p.title}</h3>
          <p className='text-xs text-gray-500 mt-1'>{p.groupId} • {p.department} • Sem {p.semester}</p>
        </div>
        <div className='flex items-center gap-2'>
          <StatusBadge status={p.hodApproval || 'pending'} />
          {p.guideStatus && p.guideStatus !== 'not-assigned' && <GuideStatusBadge status={p.guideStatus} />}
        </div>
      </div>
      {p.description && <p className='text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2'>{p.description}</p>}
      <div className='flex items-center gap-4 mt-3 text-xs text-gray-500'>
        <span><Users className='w-3 h-3 inline mr-1' />{p.members?.length || 0} members</span>
        {p.internalGuide && <span>Guide: {p.internalGuide.academicInfo?.name || p.internalGuide.email}</span>}
        {p.domain && <span className='px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700'>{p.domain}</span>}
        {isMember && <span className='px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'>Your Project</span>}
      </div>
      {p.progressScore > 0 && (
        <div className='mt-2'>
          <div className='w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
            <div className={`h-full rounded-full ${p.progressScore >= 80 ? 'bg-green-500' : p.progressScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${p.progressScore}%` }} />
          </div>
        </div>
      )}
    </motion.div>
  )
}

function GuideActionCard({ project: p, onRespond, onView }) {
  const [remarks, setRemarks] = useState('')
  const [showRemarks, setShowRemarks] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='card p-5 border-l-4 border-orange-500'>
      <div className='flex items-start justify-between'>
        <div>
          <h3 className='font-semibold text-lg'>{p.title}</h3>
          <p className='text-xs text-gray-500 mt-1'>{p.groupId} • {p.department} • Sem {p.semester} • {p.domain}</p>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-2'>{p.description}</p>
          <p className='text-xs text-gray-500 mt-2'>Leader: {p.leader?.academicInfo?.name || p.leader?.email} • {p.members?.length || 0} members</p>
        </div>
      </div>
      {showRemarks && (
        <div className='mt-3'>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder='Add remarks (optional)...' className='w-full px-3 py-2 border rounded text-sm bg-gray-50 dark:bg-gray-800' rows={2} />
        </div>
      )}
      <div className='flex items-center gap-3 mt-4'>
        <button onClick={() => onRespond(p._id, 'accepted', remarks)} className='px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 flex items-center gap-1'>
          <CheckCircle className='w-4 h-4' /> Accept
        </button>
        {!showRemarks ? (
          <button onClick={() => setShowRemarks(true)} className='px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1'>
            <XCircle className='w-4 h-4' /> Reject
          </button>
        ) : (
          <button onClick={() => onRespond(p._id, 'rejected', remarks)} className='px-4 py-2 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-900 flex items-center gap-1'>
            <XCircle className='w-4 h-4' /> Confirm Reject
          </button>
        )}
        <button onClick={onView} className='px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-sm hover:bg-gray-300'>
          <Eye className='w-4 h-4 inline mr-1' /> Details
        </button>
        {!showRemarks && (
          <button onClick={() => setShowRemarks(true)} className='text-xs text-gray-500 hover:text-gray-700 underline'>+ Add remarks</button>
        )}
      </div>
    </motion.div>
  )
}

function GuideProjectCard({ project: p, onView }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='card p-5 hover:shadow-lg transition-shadow cursor-pointer' onClick={onView}>
      <div className='flex items-start justify-between'>
        <div>
          <h3 className='font-semibold'>{p.title}</h3>
          <p className='text-xs text-gray-500 mt-1'>{p.groupId} • {p.department} • Sem {p.semester}</p>
        </div>
        <span className='px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-[10px] font-medium'>Active</span>
      </div>
      <div className='flex items-center gap-4 mt-3 text-xs text-gray-500'>
        <span><Users className='w-3 h-3 inline mr-1' />{p.members?.length || 0} members</span>
        <span><FileText className='w-3 h-3 inline mr-1' />{p.monthlyReports?.length || 0} reports</span>
        <span><Calendar className='w-3 h-3 inline mr-1' />{p.deadlines?.length || 0} deadlines</span>
        <span>Progress: {p.progressScore || 0}%</span>
      </div>
    </motion.div>
  )
}

// ─── Project Detail Modal ───
function ProjectDetailModal({ project, close, session, isAdmin, isHod, isGuide, isPrincipal, isReadOnly, guides, loadProjects, assignInternal, approveProject, respondToGuide, addMember, removeMember, addingMember, setAddingMember }) {
  const [tab, setTab] = useState('overview')
  const [groupDetails, setGroupDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [memberView, setMemberView] = useState(null)
  const [externalGuideName, setExternalGuideName] = useState('')
  const [externalGuideEmail, setExternalGuideEmail] = useState('')
  const [progressDraft, setProgressDraft] = useState(project.progressScore || 0)
  const [guideRemarks, setGuideRemarks] = useState('')
  const [hodRemarks, setHodRemarks] = useState('')

  // Report submit state
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportTitle, setReportTitle] = useState('')
  const [reportUrl, setReportUrl] = useState('')
  const [showReportForm, setShowReportForm] = useState(false)

  // Deadline state
  const [deadlineTitle, setDeadlineTitle] = useState('')
  const [deadlineDesc, setDeadlineDesc] = useState('')
  const [deadlineDue, setDeadlineDue] = useState('')
  const [showDeadlineForm, setShowDeadlineForm] = useState(false)

  // Grade state
  const [gradingReport, setGradingReport] = useState(null)
  const [gradeVal, setGradeVal] = useState('')
  const [scoreVal, setScoreVal] = useState('')
  const [feedbackVal, setFeedbackVal] = useState('')

  const role = session?.user?.role
  const canManage = isAdmin || isHod
  const isProjectGuide = isGuide && String(project.internalGuide?._id || project.internalGuide) === String(session?.user?.id)
  const canProgress = canManage || isProjectGuide
  const isMember = project.members.some(m => String(m.student?._id || m.student) === String(session?.user?.id))
  const isLeader = String(project.leader?._id || project.leader) === String(session?.user?.id)

  const tabs = ['overview', 'members']
  if (!isReadOnly && (canManage || isProjectGuide)) tabs.push('manage')
  tabs.push('reports')
  if (isProjectGuide || canManage || isMember) tabs.push('deadlines')

  useEffect(() => {
    if (tab === 'members' && !groupDetails) {
      setLoadingDetails(true)
      fetch(`/api/projects/group-details?groupId=${project.groupId}`).then(async r => {
        if (r.ok) { const d = await r.json(); setGroupDetails(d.group) }
      }).finally(() => setLoadingDetails(false))
    }
  }, [tab, groupDetails, project.groupId])

  const updateProgress = async () => {
    if (!canProgress) return
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project._id, progressScore: progressDraft }) })
    if (res.ok) { toast.success('Progress saved'); loadProjects() }
  }

  const assignExternal = async () => {
    if (!externalGuideEmail.trim()) return
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project._id, externalGuide: { name: externalGuideName || externalGuideEmail.split('@')[0], email: externalGuideEmail } }) })
    if (res.ok) { toast.success('External guide set'); loadProjects() }
  }

  const submitReport = async () => {
    if (!reportTitle.trim() || !reportUrl.trim()) return toast.error('Title and PDF URL required')
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project._id, submitReport: { month: reportMonth, year: reportYear, title: reportTitle, pdfUrl: reportUrl } }) })
    if (res.ok) { toast.success('Report submitted!'); setShowReportForm(false); setReportTitle(''); setReportUrl(''); loadProjects() }
    else { const e = await res.json(); toast.error(e.error?.message || 'Failed') }
  }

  const addDeadline = async () => {
    if (!deadlineTitle.trim() || !deadlineDue) return toast.error('Title and due date required')
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project._id, setDeadline: { deadlineTitle, deadlineDescription: deadlineDesc, dueDate: deadlineDue } }) })
    if (res.ok) { toast.success('Deadline set!'); setShowDeadlineForm(false); setDeadlineTitle(''); setDeadlineDesc(''); setDeadlineDue(''); loadProjects() }
    else { const e = await res.json(); toast.error(e.error?.message || 'Failed') }
  }

  const gradeReport = async () => {
    if (!gradingReport) return
    const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project._id, gradeReport: { reportId: gradingReport, grade: gradeVal, score: scoreVal ? Number(scoreVal) : undefined, feedback: feedbackVal, reportStatus: 'graded' } }) })
    if (res.ok) { toast.success('Report graded!'); setGradingReport(null); setGradeVal(''); setScoreVal(''); setFeedbackVal(''); loadProjects() }
    else { const e = await res.json(); toast.error(e.error?.message || 'Failed') }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4'>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className='w-full max-w-5xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl relative flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b shrink-0'>
          <div>
            <h3 className='text-lg font-semibold flex items-center gap-2'>
              {project.title}
              <span className='text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100'>{project.groupId}</span>
            </h3>
            <p className='text-[11px] text-gray-500 mt-1'>
              {project.department} • Sem {project.semester} • {project.domain || 'No domain'}
              {project.technology && ` • Tech: ${project.technology}`}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <StatusBadge status={project.hodApproval || 'pending'} />
            <GuideStatusBadge status={project.guideStatus} />
            <button onClick={close} className='ml-2 text-gray-500 hover:text-gray-700 text-xl'>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className='px-6 pt-3 flex gap-3 border-b text-xs shrink-0 overflow-x-auto'>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-t capitalize font-medium transition-colors whitespace-nowrap ${tab === t ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'reports' ? `Reports (${project.monthlyReports?.length || 0})` : t === 'deadlines' ? `Deadlines (${project.deadlines?.length || 0})` : t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto flex-1 text-sm space-y-6'>

          {/* ── Overview Tab ── */}
          {tab === 'overview' && (
            <div className='space-y-4'>
              <div className='grid md:grid-cols-2 gap-4 text-xs'>
                <div><span className='font-medium text-gray-500'>Leader:</span> {project.leader?.academicInfo?.name || project.leader?.email}</div>
                <div><span className='font-medium text-gray-500'>Members:</span> {project.members.length}/4</div>
                <div><span className='font-medium text-gray-500'>Internal Guide:</span> {project.internalGuide?.academicInfo?.name || project.internalGuide?.email || '—'}</div>
                <div><span className='font-medium text-gray-500'>External Guide:</span> {project.externalGuide?.name || '—'}</div>
                <div><span className='font-medium text-gray-500'>HOD Approval:</span> <StatusBadge status={project.hodApproval || 'pending'} /></div>
                <div><span className='font-medium text-gray-500'>Guide Status:</span> <GuideStatusBadge status={project.guideStatus} /></div>
                {project.guideRemarks && <div className='md:col-span-2'><span className='font-medium text-gray-500'>Guide Remarks:</span> {project.guideRemarks}</div>}
                {project.hodRemarks && <div className='md:col-span-2'><span className='font-medium text-gray-500'>HOD Remarks:</span> {project.hodRemarks}</div>}
                <div className='md:col-span-2'><span className='font-medium text-gray-500'>Description:</span> {project.description || '—'}</div>
                {project.technology && <div className='md:col-span-2'><span className='font-medium text-gray-500'>Technology:</span> {project.technology}</div>}
              </div>
              {/* Progress bar */}
              <div>
                <div className='flex items-center justify-between text-xs mb-1'>
                  <span className='font-medium text-gray-500'>Progress</span>
                  <span className='font-bold'>{project.progressScore || 0}%</span>
                </div>
                <div className='w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                  <div className={`h-full rounded-full transition-all ${(project.progressScore || 0) >= 80 ? 'bg-green-500' : (project.progressScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${project.progressScore || 0}%` }} />
                </div>
              </div>

              {/* Guide Accept/Reject in overview for guide */}
              {isProjectGuide && project.guideStatus === 'pending' && (
                <div className='p-4 rounded-lg border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20'>
                  <h4 className='font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2'><AlertCircle className='w-4 h-4' /> Action Required</h4>
                  <p className='text-xs text-gray-600 dark:text-gray-400 mb-3'>You have been assigned as guide for this project. Please accept or reject.</p>
                  <textarea value={guideRemarks} onChange={e => setGuideRemarks(e.target.value)} placeholder='Add remarks (optional)...' className='w-full px-3 py-2 border rounded text-xs mb-3' rows={2} />
                  <div className='flex gap-2'>
                    <button onClick={() => { respondToGuide(project._id, 'accepted', guideRemarks); close() }} className='px-4 py-2 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 flex items-center gap-1'><CheckCircle className='w-3 h-3' /> Accept</button>
                    <button onClick={() => { respondToGuide(project._id, 'rejected', guideRemarks); close() }} className='px-4 py-2 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 flex items-center gap-1'><XCircle className='w-3 h-3' /> Reject</button>
                  </div>
                </div>
              )}

              {/* Add member (for leader) */}
              {isLeader && project.members.length < 4 && (
                <div className='space-y-2 border-t pt-4'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Add Member</h4>
                  <div className='flex gap-2'>
                    <input value={addingMember} onChange={e => setAddingMember(e.target.value)} placeholder='Student email or ID' className='flex-1 px-3 py-2 rounded border text-xs' />
                    <button onClick={() => addMember(project._id)} className='px-3 py-1.5 rounded bg-indigo-600 text-white text-xs'>Add</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Members Tab ── */}
          {tab === 'members' && (
            <div className='space-y-4'>
              {loadingDetails && <div className='text-xs text-gray-500'>Loading members...</div>}
              {!loadingDetails && groupDetails && (
                <div className='grid sm:grid-cols-2 gap-3'>
                  {groupDetails.members.map(m => (
                    <div key={m.student._id} className='p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/40'>
                      <div className='flex justify-between items-center mb-1'>
                        <span className='font-medium text-sm'>{m.student.academicInfo?.name || m.student.email}</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 uppercase font-bold'>{m.role}</span>
                      </div>
                      <div className='text-xs text-gray-500'>{m.student.email}</div>
                      <div className='text-xs text-gray-500'>Dept: {m.student.department}</div>
                      <div className='flex gap-2 mt-2'>
                        <button onClick={() => setMemberView(m)} className='text-[10px] text-blue-600 underline'>View</button>
                        {(isAdmin || isHod || (isLeader && m.role !== 'leader')) && !isReadOnly && (
                          <button onClick={() => removeMember(project._id, m.student._id)} className='text-[10px] text-red-600 underline'>Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loadingDetails && !groupDetails && (
                <div className='grid sm:grid-cols-2 gap-3'>
                  {project.members.map(m => (
                    <div key={m.student?._id || m.student} className='p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/40'>
                      <div className='flex justify-between items-center'>
                        <span className='font-medium text-sm'>{m.student?.academicInfo?.name || m.student?.email || m.student}</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 uppercase font-bold'>{m.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manage Tab ── */}
          {tab === 'manage' && (canManage || isProjectGuide) && !isReadOnly && (
            <div className='space-y-6'>
              {/* HOD Approval */}
              {isHod && (
                <div className='space-y-3'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>HOD Approval</h4>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-xs text-gray-500'>Current:</span> <StatusBadge status={project.hodApproval || 'pending'} />
                  </div>
                  <textarea value={hodRemarks} onChange={e => setHodRemarks(e.target.value)} placeholder='Add remarks (optional)...' className='w-full px-3 py-2 border rounded text-xs' rows={2} />
                  <div className='flex gap-2'>
                    {project.hodApproval !== 'approved' && <button onClick={() => { approveProject(project._id, true, hodRemarks); close() }} className='px-4 py-2 text-xs rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1'><CheckCircle className='w-3 h-3' /> Approve</button>}
                    {project.hodApproval !== 'rejected' && <button onClick={() => { approveProject(project._id, false, hodRemarks); close() }} className='px-4 py-2 text-xs rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1'><XCircle className='w-3 h-3' /> Reject</button>}
                  </div>
                </div>
              )}

              {/* Guide Assignment */}
              {(isHod || isAdmin) && project.hodApproval === 'approved' && (
                <div className='space-y-3'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Internal Guide Assignment</h4>
                  {project.internalGuide && (
                    <div className='text-xs mb-2 flex items-center gap-2'>
                      <span className='text-gray-500'>Current:</span>
                      <span className='font-medium'>{project.internalGuide.academicInfo?.name || project.internalGuide.email}</span>
                      <GuideStatusBadge status={project.guideStatus} />
                    </div>
                  )}
                  {project.guideStatus === 'rejected' && (
                    <div className='p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300 mb-2'>
                      Guide declined this project.{project.guideRemarks && ` Remarks: "${project.guideRemarks}"`} — Please assign a new guide.
                    </div>
                  )}
                  {isAdmin && project.hodApproval !== 'approved' && (
                    <div className='p-2 bg-orange-50 border border-orange-200 rounded text-[11px] text-orange-700'>
                      Project must be approved by HOD before assigning guides.
                    </div>
                  )}
                  {(!project.internalGuide || project.guideStatus === 'rejected') && (
                    <select className='px-3 py-2 border rounded text-xs w-full max-w-sm' defaultValue='' onChange={e => { if (e.target.value) { assignInternal(project._id, e.target.value); close() } }}>
                      <option value=''>Select Guide...</option>
                      {guides.filter(g => g.department === project.department).map(g => <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}{g.role === 'hod' ? ' (HOD)' : ''}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* External Guide */}
              {(isHod || isAdmin) && (
                <div className='space-y-3'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>External Guide</h4>
                  {project.externalGuide?.name && (
                    <div className='text-xs mb-2'>Current: <span className='font-medium'>{project.externalGuide.name}</span> ({project.externalGuide.email})</div>
                  )}
                  <div className='flex flex-wrap gap-2 items-center'>
                    <input value={externalGuideName} onChange={e => setExternalGuideName(e.target.value)} placeholder='Name' className='px-3 py-2 rounded border text-xs' />
                    <input value={externalGuideEmail} onChange={e => setExternalGuideEmail(e.target.value)} placeholder='Email' className='px-3 py-2 rounded border text-xs' />
                    <button onClick={assignExternal} className='px-3 py-2 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700'>Save</button>
                  </div>
                </div>
              )}

              {/* Progress */}
              {canProgress && (
                <div className='space-y-3'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Progress Score</h4>
                  <div className='flex items-center gap-3'>
                    <input type='range' min={0} max={100} value={progressDraft} onChange={e => setProgressDraft(parseInt(e.target.value))} className='flex-1' />
                    <span className='text-sm font-bold min-w-[40px]'>{progressDraft}%</span>
                    <button onClick={updateProgress} className='px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700'>Save</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Reports Tab ── */}
          {tab === 'reports' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h4 className='font-semibold text-sm flex items-center gap-2'><FileText className='w-4 h-4' /> Monthly Reports</h4>
                {isMember && !isReadOnly && project.guideStatus === 'accepted' && (
                  <button onClick={() => setShowReportForm(!showReportForm)} className='px-3 py-1.5 rounded bg-blue-600 text-white text-xs flex items-center gap-1 hover:bg-blue-700'>
                    <Upload className='w-3 h-3' /> {showReportForm ? 'Cancel' : 'Submit Report'}
                  </button>
                )}
              </div>

              {/* Submit Report Form */}
              {showReportForm && (
                <div className='p-4 rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 space-y-3'>
                  <h5 className='font-semibold text-xs text-blue-800 dark:text-blue-300'>New Report Submission</h5>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>Month</label>
                      <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className='w-full px-3 py-2 border rounded text-xs'>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>Year</label>
                      <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className='w-full px-3 py-2 border rounded text-xs'>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>Report Title</label>
                    <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder='e.g., Progress Report — Module A' className='w-full px-3 py-2 border rounded text-xs' />
                  </div>
                  <div>
                    <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>PDF URL</label>
                    <input value={reportUrl} onChange={e => setReportUrl(e.target.value)} placeholder='https://drive.google.com/... or any hosted PDF link' className='w-full px-3 py-2 border rounded text-xs' />
                    <p className='text-[9px] text-gray-400 mt-1'>Upload your PDF to Google Drive, Cloudinary, or other hosting and paste the link.</p>
                  </div>
                  <button onClick={submitReport} disabled={!reportTitle.trim() || !reportUrl.trim()} className={`px-4 py-2 rounded text-xs font-medium flex items-center gap-1 ${reportTitle.trim() && reportUrl.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                    <Send className='w-3 h-3' /> Submit Report
                  </button>
                </div>
              )}

              {/* Reports List */}
              {project.monthlyReports?.length > 0 ? (
                <div className='space-y-3'>
                  {project.monthlyReports.slice().sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)).map(r => (
                    <div key={r._id} className='p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/40'>
                      <div className='flex items-start justify-between flex-wrap gap-2'>
                        <div>
                          <div className='font-medium text-sm'>{r.title}</div>
                          <div className='text-[10px] text-gray-500 mt-1'>
                            {MONTHS[r.month - 1]} {r.year} • Submitted by {r.submittedBy?.academicInfo?.name || r.submittedBy?.email || 'Team'}
                            {r.submittedAt && ` • ${new Date(r.submittedAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <ReportStatusBadge status={r.status} />
                          {r.grade && <span className='px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold'>{r.grade}</span>}
                          {r.score !== undefined && r.score !== null && <span className='text-xs font-bold text-indigo-600'>{r.score}/100</span>}
                          <a href={r.pdfUrl} target='_blank' rel='noreferrer' className='px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] hover:bg-blue-200 flex items-center gap-1'>
                            <FileText className='w-3 h-3' /> Open PDF
                          </a>
                        </div>
                      </div>
                      {r.feedback && (
                        <div className='mt-2 p-2 rounded bg-green-50 dark:bg-green-900/20 text-xs'>
                          <span className='font-medium text-green-700 dark:text-green-300'>Feedback:</span> {r.feedback}
                          {r.feedbackBy && <span className='text-gray-400 text-[10px] ml-2'>— {r.feedbackBy?.academicInfo?.name || r.feedbackBy?.email}</span>}
                        </div>
                      )}

                      {/* Guide Grading UI */}
                      {isProjectGuide && !isReadOnly && r.status !== 'graded' && (
                        <div className='mt-3 border-t pt-3'>
                          {gradingReport === r._id ? (
                            <div className='space-y-2'>
                              <div className='grid grid-cols-3 gap-2'>
                                <div>
                                  <label className='text-[9px] font-medium uppercase text-gray-500 block mb-1'>Grade</label>
                                  <select value={gradeVal} onChange={e => setGradeVal(e.target.value)} className='w-full px-2 py-1.5 border rounded text-xs'>
                                    <option value=''>Select</option>
                                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className='text-[9px] font-medium uppercase text-gray-500 block mb-1'>Score (0-100)</label>
                                  <input type='number' min={0} max={100} value={scoreVal} onChange={e => setScoreVal(e.target.value)} className='w-full px-2 py-1.5 border rounded text-xs' placeholder='0-100' />
                                </div>
                                <div className='flex items-end'>
                                  <button onClick={gradeReport} className='px-3 py-1.5 rounded bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1'><Award className='w-3 h-3' /> Grade</button>
                                </div>
                              </div>
                              <div>
                                <label className='text-[9px] font-medium uppercase text-gray-500 block mb-1'>Feedback / Remarks</label>
                                <textarea value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} placeholder='Your feedback...' className='w-full px-2 py-1.5 border rounded text-xs' rows={2} />
                              </div>
                              <button onClick={() => setGradingReport(null)} className='text-[10px] text-gray-500 hover:text-gray-700 underline'>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setGradingReport(r._id)} className='text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1'>
                              <Award className='w-3 h-3' /> Grade This Report
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-gray-500 py-4 text-center'>No monthly reports submitted yet.</p>
              )}

              {/* Legacy reports backward compat */}
              {project.reports?.length > 0 && (
                <div className='border-t pt-4'>
                  <h5 className='text-xs font-semibold text-gray-500 mb-2'>Legacy Weekly Reports</h5>
                  {project.reports.slice().sort((a, b) => a.week - b.week).map(r => (
                    <div key={r._id} className='p-3 rounded border bg-gray-50 dark:bg-gray-800/40 mb-2'>
                      <div className='flex items-center justify-between text-xs'>
                        <span>Week {r.week}</span>
                        <a href={r.pdfUrl} target='_blank' rel='noreferrer' className='text-blue-600 hover:underline'>Open</a>
                      </div>
                      {r.feedback && <p className='text-[10px] text-green-600 mt-1'>Feedback: {r.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Deadlines Tab ── */}
          {tab === 'deadlines' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h4 className='font-semibold text-sm flex items-center gap-2'><Calendar className='w-4 h-4' /> Deadlines</h4>
                {isProjectGuide && !isReadOnly && (
                  <button onClick={() => setShowDeadlineForm(!showDeadlineForm)} className='px-3 py-1.5 rounded bg-blue-600 text-white text-xs flex items-center gap-1 hover:bg-blue-700'>
                    <Plus className='w-3 h-3' /> {showDeadlineForm ? 'Cancel' : 'Set Deadline'}
                  </button>
                )}
              </div>

              {showDeadlineForm && (
                <div className='p-4 rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 space-y-3'>
                  <h5 className='font-semibold text-xs text-blue-800 dark:text-blue-300'>New Deadline</h5>
                  <div>
                    <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>Title *</label>
                    <input value={deadlineTitle} onChange={e => setDeadlineTitle(e.target.value)} placeholder='e.g., Submit Module 1 Report' className='w-full px-3 py-2 border rounded text-xs' />
                  </div>
                  <div>
                    <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>Description</label>
                    <textarea value={deadlineDesc} onChange={e => setDeadlineDesc(e.target.value)} placeholder='Details...' className='w-full px-3 py-2 border rounded text-xs' rows={2} />
                  </div>
                  <div>
                    <label className='text-[10px] font-medium uppercase text-gray-500 block mb-1'>Due Date *</label>
                    <input type='date' value={deadlineDue} onChange={e => setDeadlineDue(e.target.value)} className='w-full px-3 py-2 border rounded text-xs' min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <button onClick={addDeadline} disabled={!deadlineTitle.trim() || !deadlineDue} className={`px-4 py-2 rounded text-xs font-medium flex items-center gap-1 ${deadlineTitle.trim() && deadlineDue ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                    <Calendar className='w-3 h-3' /> Set Deadline
                  </button>
                </div>
              )}

              {project.deadlines?.length > 0 ? (
                <div className='space-y-3'>
                  {project.deadlines.slice().sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(d => {
                    const isPast = new Date(d.dueDate) < new Date()
                    return (
                      <div key={d._id} className={`p-4 rounded-lg border ${isPast && !d.isCompleted ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : d.isCompleted ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/40'}`}>
                        <div className='flex items-start justify-between'>
                          <div>
                            <div className='font-medium text-sm flex items-center gap-2'>
                              {d.isCompleted ? <CheckCircle className='w-4 h-4 text-green-500' /> : isPast ? <AlertCircle className='w-4 h-4 text-red-500' /> : <Clock className='w-4 h-4 text-orange-500' />}
                              {d.title}
                            </div>
                            {d.description && <p className='text-xs text-gray-500 mt-1 ml-6'>{d.description}</p>}
                          </div>
                          <div className='text-right shrink-0'>
                            <div className='text-xs font-medium'>{new Date(d.dueDate).toLocaleDateString()}</div>
                            <div className='text-[10px] text-gray-400'>Set by {d.setBy?.academicInfo?.name || d.setBy?.email || 'Guide'}</div>
                            {isPast && !d.isCompleted && <span className='text-[10px] text-red-600 font-bold'>OVERDUE</span>}
                            {d.isCompleted && <span className='text-[10px] text-green-600 font-bold'>COMPLETED</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className='text-xs text-gray-500 py-4 text-center'>No deadlines set yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Member Detail Sub-Modal */}
        {memberView && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
            <div className='w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl p-5 relative text-sm'>
              <button onClick={() => setMemberView(null)} className='absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl'>✕</button>
              <h4 className='font-semibold mb-3 flex items-center gap-2'>
                {memberView.student.academicInfo?.name || memberView.student.email}
                <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 uppercase font-bold'>{memberView.role}</span>
              </h4>
              <div className='space-y-1.5 text-xs'>
                <div><span className='font-medium'>Email:</span> {memberView.student.email}</div>
                <div><span className='font-medium'>Department:</span> {memberView.student.department}</div>
                <div><span className='font-medium'>Institute:</span> {memberView.student.institute}</div>
                <div><span className='font-medium'>University:</span> {memberView.student.university}</div>
                <div><span className='font-medium'>Admission Year:</span> {memberView.student.admissionYear}</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Create Project Modal ───
function CreateProjectModal({ form, setForm, descWords, formValid, memberSearch, setMemberSearch, memberSuggestions, searchLoading, selectedMembers, debouncedSearch, addMemberToSelection, removeMemberFromSelection, setMemberSuggestions, setSearchLoading, departmentsList, submitProject, closeCreateModal }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4'>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className='w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative max-h-[90vh] overflow-y-auto'>
        <button onClick={closeCreateModal} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl'>✕</button>
        <h2 className='font-semibold text-lg mb-1'>Create Project Group</h2>
        <p className='text-xs text-gray-500 mb-4'>Leader = You. Add up to 3 teammates (max 4 total).</p>
        <div className='grid md:grid-cols-2 gap-4 text-sm'>
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Project Title *</label>
            <input className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900 placeholder-gray-700' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder='e.g., Smart Attendance System' />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Domain *</label>
            <select className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900' value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}>
              <option value=''>Select Domain</option>
              {PROJECT_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Department</label>
            <select className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900' value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
              <option value=''>Auto-detect</option>
              {departmentsList.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Semester</label>
            <select className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900' value={form.semester} onChange={e => setForm({ ...form, semester: parseInt(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Technology Stack</label>
            <input className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900 placeholder-gray-700' value={form.technology} onChange={e => setForm({ ...form, technology: e.target.value })} placeholder='e.g., React, Node.js, MongoDB' />
          </div>
          <div className='flex flex-col gap-1' />
          <div className='md:col-span-2 flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Description *</label>
            <textarea className='px-3 py-2.5 border rounded bg-gray-50 min-h-[80px] text-gray-900 placeholder-gray-700' value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder='Problem statement, objective, impact... (max 200 words)' />
            <div className={`text-[10px] mt-1 ${descWords > 200 ? 'text-red-600' : 'text-gray-500'}`}>{descWords}/200 words</div>
          </div>
          <div className='md:col-span-2 flex flex-col gap-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Add Teammates</label>
            <div className='relative'>
              <input className='w-full px-3 py-2.5 border rounded bg-gray-50 text-gray-900 placeholder-gray-700' value={memberSearch} onChange={e => {
                const v = e.target.value; setMemberSearch(v)
                if (v.length < 2) { setMemberSuggestions([]); setSearchLoading(false) } else { setSearchLoading(true); debouncedSearch(v) }
              }} placeholder='Type student ID (e.g., 23dit015) or name (min 2 chars)...' />
              {searchLoading && <div className='absolute right-3 top-3'><div className='w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin' /></div>}
              {memberSuggestions.length > 0 && (
                <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {memberSuggestions.map(s => (
                    <div key={s.id} className='px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer border-b last:border-b-0 transition-colors' onClick={() => addMemberToSelection(s)}>
                      <div className='flex items-center gap-3'>
                        <span className='font-bold text-sm'>{s.studentId}</span>
                        <span className='text-sm'>{s.name}</span>
                        <span className='text-[10px] text-gray-400'>{s.department} • {s.institute}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <div className='mt-2'>
                <div className='text-[11px] font-medium uppercase tracking-wide text-gray-600 mb-2'>Selected ({selectedMembers.length}/3)</div>
                <div className='flex flex-wrap gap-2'>
                  {selectedMembers.map(m => (
                    <div key={m.email} className='flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm'>
                      <span>{m.name}</span><span className='text-xs text-gray-500'>({m.department})</span>
                      <button onClick={() => removeMemberFromSelection(m.email)} className='text-red-500 hover:text-red-700 ml-1'>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className='text-[10px] text-gray-400 mt-1'>Start typing student ID or name to see suggestions. Cross-department teams are allowed but must be same institute.</p>
          </div>
        </div>
        <div className='flex justify-end gap-2 mt-4'>
          <button type='button' onClick={closeCreateModal} className='px-4 py-2 text-sm rounded border hover:bg-gray-50'>Cancel</button>
          <button type='button' disabled={!formValid} onClick={submitProject} className={`px-5 py-2 rounded text-sm font-medium ${formValid ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}>Create Project</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Utility Components ───

function FilterGroup({ title, options, value, onSelect }) {
  const formatTitle = t => t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  const formatOption = (opt) => {
    if (title === 'STATUS' || title === 'GUIDE STATUS') return opt.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return opt
  }
  return (
    <div>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>{formatTitle(title)}</p>
      <div className='flex flex-wrap gap-3'>
        {options.map(opt => (
          <button key={opt} type='button' onClick={() => onSelect(opt)} className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${value === opt ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            {formatOption(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}

function FieldSelector({ fields, visible, toggle }) {
  return (
    <div className='border-t pt-6'>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Visible Fields</p>
      <div className='flex flex-wrap gap-3'>
        {fields.map(f => (
          <label key={f.key} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm cursor-pointer select-none font-semibold transition-all duration-200 ${visible.includes(f.key) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <input type='checkbox' className='hidden' checked={visible.includes(f.key)} onChange={() => toggle(f.key)} />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'under-review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    submitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || 'bg-gray-100 dark:bg-gray-700'}`}>{status}</span>
}

function GuideStatusBadge({ status }) {
  const map = {
    'not-assigned': { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', label: 'No Guide' },
    pending: { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', label: 'Pending' },
    accepted: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Accepted' },
    rejected: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rejected' },
  }
  const info = map[status] || map['not-assigned']
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${info.cls}`}>{info.label}</span>
}

function ReportStatusBadge({ status }) {
  const map = {
    submitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    graded: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'revision-needed': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || 'bg-gray-100'}`}>{status?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown'}</span>
}

function PaginationBar({ currentPage, totalPages, totalItems, startIndex, endIndex, itemsPerPage, setCurrentPage, setItemsPerPage }) {
  const maxVisible = 5
  const start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages, start + maxVisible - 1)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className='flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6 flex-wrap gap-2'>
      <div className='flex items-center gap-4'>
        <p className='text-sm text-gray-700 dark:text-gray-300'>
          Showing <span className='font-medium'>{startIndex + 1}</span>–<span className='font-medium'>{Math.min(endIndex, totalItems)}</span> of <span className='font-medium'>{totalItems}</span>
        </p>
        <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className='px-3 py-1 text-sm border rounded'>
          {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}/page</option>)}
        </select>
      </div>
      <nav className='inline-flex rounded-md shadow-sm -space-x-px'>
        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className='px-2 py-2 text-sm border rounded-l-md disabled:opacity-50 hover:bg-gray-50'>Prev</button>
        {start > 1 && <><button onClick={() => setCurrentPage(1)} className='px-3 py-2 text-sm border hover:bg-gray-50'>1</button>{start > 2 && <span className='px-3 py-2 text-sm border'>…</span>}</>}
        {pages.map(p => <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-2 text-sm border ${currentPage === p ? 'bg-blue-50 border-blue-500 text-blue-600 z-10' : 'hover:bg-gray-50'}`}>{p}</button>)}
        {end < totalPages && <>{end < totalPages - 1 && <span className='px-3 py-2 text-sm border'>…</span>}<button onClick={() => setCurrentPage(totalPages)} className='px-3 py-2 text-sm border hover:bg-gray-50'>{totalPages}</button></>}
        <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className='px-2 py-2 text-sm border rounded-r-md disabled:opacity-50 hover:bg-gray-50'>Next</button>
      </nav>
    </div>
  )
}
