"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

import dynamic from 'next/dynamic'
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false })
import { PROJECT_DOMAINS } from '@/lib/domains'
import { wordCount, semicolonListValid } from '@/lib/clientValidation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FolderKanban, Search, Filter, ChevronDown, ChevronUp, Download, Plus,
  Eye, CheckCircle2, XCircle, Clock, Users, UserPlus, FileText,
  BarChart3, Globe, GraduationCap, Building2, Layers, ArrowUpDown,
  Sparkles, TrendingUp, AlertTriangle, ExternalLink, Send, MessageSquare,
  X as XIcon, ChevronRight, Sliders, LayoutGrid, Table2, BookOpen,
  Calendar, UserCheck, ShieldCheck, CircleDot, Briefcase, Award, Upload, Star
} from 'lucide-react'

export default function ProjectsPage(){
  const { data: session } = useSession()
  const isStudent = session?.user?.role==='student'
  const isGuide = session?.user?.role==='guide'
  const isHod = session?.user?.role==='hod' || session?.user?.role==='project_coordinator'
  const isAdmin = session?.user?.role==='admin' || session?.user?.role==='mainadmin'

  // Student view state — students always see only their own projects
  
  // Enhanced member search
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Data
  const [projects, setProjects] = useState([])
  const [mine, setMine] = useState([])
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  // Filters (exclusive chip style like students/guides pages)
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [domain, setDomain] = useState('')
  const [guide, setGuide] = useState('')
  const [search, setSearch] = useState('')

  // Sorting state
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' or 'desc'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Field visibility
  const FIELD_OPTIONS = [
    { key: 'leader', label: 'Leader Name & ID' },
    { key: 'domain', label: 'Domain' },
    { key: 'internal', label: 'Internal Guide' },
    { key: 'external', label: 'External Guide' },
    { key: 'members', label: 'Team Members' },
  ]
  const [visibleFields, setVisibleFields] = useState(['leader','domain','internal','external','members'])
  const toggleField = key => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])
  const toggleExclusive = (current,setter,val)=> setter(current===val?'':val)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', domain:'', customDomain:'' })

  // Selection modal
  const [selected, setSelected] = useState(null)
  const [modalTab, setModalTab] = useState('overview')

  // Static option sets with HOD filtering
  const departmentsList = isHod 
    ? [session?.user?.academicInfo?.department].filter(Boolean)
    : ['CSE','CE','IT']
  const semesters = ['1','2','3','4','5','6','7','8']
  const statuses = ['under-review','submitted']

  const loadProjects = useCallback(async ()=>{
    setLoading(true)
    try {
      console.log('🔄 Loading projects for user:', { 
        role: session?.user?.role, 
        email: session?.user?.email,
        isStudent, 
        isAdmin 
      })
      
      const res = await fetch('/api/projects')
      
      if(res.ok){
        const data = await res.json()
        const list = data.projects||[]
        
        console.log('📦 Projects loaded:', { 
          totalCount: list.length,
          projects: list.map(p => ({ 
            id: p._id, 
            title: p.title, 
            department: p.department,
            status: p.status,
            memberCount: p.members?.length,
            members: p.members
          }))
        })
        
        setProjects(list)
        if(isStudent){
          setMine(list) // API already filters to student's own projects
          console.log('Student projects:', list.length)
        }
      } else {
        console.error('Failed to load projects:', res.status)
      }
    } finally { setLoading(false) }
  },[isStudent, isAdmin, session?.user?.id, session?.user?.role, session?.user?.email])

  const loadGuides = useCallback(async ()=>{
    if(!isHod) return
    const res = await fetch('/api/guides')
    if(res.ok){ const data = await res.json(); setGuides(data.guides||data.faculty||[]) }
  },[isHod])

  useEffect(()=>{ loadProjects(); loadGuides() },[loadProjects, loadGuides])

  // Derive selected project from latest projects data so modal always reflects fresh state
  const selectedProject = selected ? (projects.find(p => p._id === selected._id) || selected) : null

  // Enhanced member search functionality with debouncing
  const searchMembers = async (query) => {
    // Allow search from 2 characters instead of 3
    if (query.length < 2) {
      setMemberSuggestions([])
      return
    }
    
    setSearchLoading(true)
    try {
      // Exclude already selected members and current user from search results
      const excludeEmails = [
        session?.user?.email, // Exclude current user (leader)
        ...selectedMembers.map(m => m.email) // Exclude already selected members
      ].filter(Boolean).join(',')
      
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(query)}&exclude=${encodeURIComponent(excludeEmails)}`)
      if (res.ok) {
        const data = await res.json()
        setMemberSuggestions(data.students || [])
      }
    } catch (error) {
      console.error('Member search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounced search — keep a ref to the latest searchMembers to avoid stale closures
  const searchMembersRef = useRef(searchMembers)
  searchMembersRef.current = searchMembers
  const debounceTimerRef = useRef(null)

  const debouncedSearch = useCallback((query) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => searchMembersRef.current(query), 300)
  }, [])

  const addMemberToSelection = (student) => {
    if (!selectedMembers.find(m => m.email === student.email)) {
      setSelectedMembers(prev => [...prev, student])
      
      // Check for department/institute mixing with current user (leader)
      const leaderDept = session?.user?.academicInfo?.department
      const leaderInstitute = session?.user?.academicInfo?.institute
      const studentDept = student.department
      const studentInstitute = student.institute
      
      const differentDept = leaderDept && studentDept && leaderDept !== studentDept
      const differentInstitute = leaderInstitute && studentInstitute && leaderInstitute !== studentInstitute
      
      if (differentDept || differentInstitute) {
        let warningMsg = '⚠️ Warning: Adding student from different '
        if (differentDept && differentInstitute) {
          warningMsg += `department (${studentDept}) and institute (${studentInstitute})`
        } else if (differentDept) {
          warningMsg += `department (${studentDept})`
        } else {
          warningMsg += `institute (${studentInstitute})`
        }
        
        toast(warningMsg, {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#f59e0b',
            color: '#fff',
          },
          duration: 4000
        })
      } else {
        toast.success(`Added ${student.studentId} - ${student.name}`)
      }
    } else {
      toast(`${student.studentId} is already in your team`, {
        icon: 'ℹ️',
        style: {
          borderRadius: '10px',
          background: '#3b82f6',
          color: '#fff',
        },
      })
    }
    // Always clear the input and suggestions after clicking
    setMemberSearch('')
    setMemberSuggestions([])
    setSearchLoading(false)
  }

  const removeMemberFromSelection = (email) => {
    setSelectedMembers(prev => prev.filter(m => m.email !== email))
  }

  // Function to clear all form fields when opening modal
  const clearAllFormFields = () => {
    setForm({ title: '', description: '', domain: '', customDomain: '' })
    setSelectedMembers([])
    setMemberSearch('')
    setMemberSuggestions([])
    setSearchLoading(false)
  }

  // Function to open create modal with fresh form
  const openCreateModal = () => {
    clearAllFormFields()
    setShowCreate(true)
  }

  // Function to close modal and clear all fields
  const closeCreateModal = () => {
    clearAllFormFields()
    setShowCreate(false)
  }

  const descWords = wordCount(form.description)
  const effectiveDomain = form.domain === 'Other' ? form.customDomain?.trim() : form.domain
  const formValid = form.title.trim() && effectiveDomain && descWords<=200

  const submitProject = async () => {
    try {
      // Use effective domain (custom text if "Other" selected)
      const finalDomain = form.domain === 'Other' ? form.customDomain?.trim() : form.domain
      const payload = { title: form.title, description: form.description, domain: finalDomain }
      // Department and semester are auto-fetched on the backend from session
      
      // Check for cross-department/institute team
      const leaderDept = session?.user?.academicInfo?.department
      const leaderInstitute = session?.user?.academicInfo?.institute
      
      const differentDepts = selectedMembers.filter(m => leaderDept && m.department && m.department !== leaderDept)
      const differentInstitutes = selectedMembers.filter(m => leaderInstitute && m.institute && m.institute !== leaderInstitute)
      
      if (differentDepts.length > 0 || differentInstitutes.length > 0) {
        let warningMessage = '⚠️ WARNING: Your team includes students from different '
        const warnings = []
        
        if (differentDepts.length > 0) {
          const deptList = [...new Set(differentDepts.map(m => m.department))].join(', ')
          warnings.push(`departments (${deptList})`)
        }
        
        if (differentInstitutes.length > 0) {
          const instList = [...new Set(differentInstitutes.map(m => m.institute))].join(', ')
          warnings.push(`institutes (${instList})`)
        }
        
        warningMessage += warnings.join(' and ') + '.\n\n'
        warningMessage += 'This may affect project approval and guide assignment.\n\n'
        warningMessage += 'Do you want to proceed?'
        
        const confirmed = window.confirm(warningMessage)
        if (!confirmed) return
      }
      
      // Use selected members instead of raw input
      const memberEmails = selectedMembers.map(m => m.email)
      payload.memberEmails = memberEmails
      
      if(!finalDomain) {
        toast.error('Please select or enter a domain')
        return
      }
      if(descWords>200){ toast.error('Description exceeds 200 words'); return }
      
      const res = await fetch('/api/projects',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if(res.ok){ 
        toast.success('Project group created successfully!'); 
        closeCreateModal(); // Clear all fields and close modal
        loadProjects() 
      } else { 
        const e=await res.json(); 
        toast.error(e.error?.message||'Failed to create project') 
      }
    } catch { 
      toast.error('Failed to create project') 
    }
  }

  const approveProject = async (projectId, approve) => {
    // For HOD approval workflow
    if (session?.user?.role === 'hod') {
      const approval = approve ? 'approved' : 'rejected'
      const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, hodApproval: approval }) })
      if(res.ok){ toast.success(`Project ${approval}`); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Error') }
    } else {
      // Legacy approval for other roles
      const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, approve }) })
      if(res.ok){ toast.success('Updated'); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Error') }
    }
  }
  const assignInternal = async (projectId, internalGuideId, externalGuide) => {
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, internalGuideId, externalGuide }) })
    if(res.ok){ toast.success('Guide updated'); await loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Error') }
  }
  const addMember = async (projectId, memberValue) => {
    if(!memberValue) return toast.error('Enter student email or id')
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, addMember: memberValue }) })
    if(res.ok){ toast.success('Member added'); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Failed') }
  }
  const removeMember = async (projectId, memberId) => {
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, removeMember: memberId }) })
    if(res.ok){ toast.success('Removed'); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Failed') }
  }

  // Derived lists with HOD filtering
  let base = projects
  if (isStudent) {
    base = mine // Students always see only their own projects
  } else if (isHod) {
    // HOD can only see projects from their department and institute
    const hodDepartment = session?.user?.academicInfo?.department
    const hodInstitute = session?.user?.academicInfo?.institute
    base = projects.filter(p => {
      const matchesDepartment = hodDepartment ? p.department === hodDepartment : true
      const matchesInstitute = hodInstitute ? p.leader?.institute === hodInstitute : true
      return matchesDepartment && matchesInstitute
    })
  } else if (!isAdmin) {
    base = projects
  }
  
  // Filter available guides for HOD (only their department)
  const availableGuides = isHod 
    ? guides.filter(g => {
        const hodDepartment = session?.user?.department
        return hodDepartment ? g.department === hodDepartment : true
      })
    : guides
  
  // Helper to compute display status from monthly reports
  const getDisplayStatus = (p) => {
    const reports = p.monthlyReports || []
    const graded = reports.filter(r => r.status === 'graded').length
    return reports.length > 0 && graded === reports.length ? 'submitted' : 'under-review'
  }

  const filtered = base
    .filter(p => !department || p.department===department)
    .filter(p => !semester || String(p.semester)===semester)
    .filter(p => !status || getDisplayStatus(p)===status)
    .filter(p => !domain || p.domain===domain)
    .filter(p => !guide || (p.internalGuide && String(p.internalGuide._id)===guide))
    .filter(p => {
      if (!search) return true
      const keywords = search.toLowerCase().split(/\s+/).filter(Boolean)
      const title = (p.title || '').toLowerCase()
      return keywords.every(kw => title.includes(kw))
    })

  // Sort filtered results
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue, bValue
    
    switch (sortField) {
      case 'title':
        aValue = a.title || ''
        bValue = b.title || ''
        break
      case 'department':
        aValue = a.department || ''
        bValue = b.department || ''
        break
      case 'semester':
        aValue = a.semester || 0
        bValue = b.semester || 0
        break
      case 'domain':
        aValue = a.domain || ''
        bValue = b.domain || ''
        break
      case 'progress':
        aValue = a.progressScore || 0
        bValue = b.progressScore || 0
        break
      case 'status':
        aValue = a.hodApproval || 'pending'
        bValue = b.hodApproval || 'pending'
        break
      case 'members':
        aValue = a.members?.length || 0
        bValue = b.members?.length || 0
        break
      case 'leader':
        aValue = a.leader?.academicInfo?.name || a.leader?.email || ''
        bValue = b.leader?.academicInfo?.name || b.leader?.email || ''
        break
      default:
        return 0
    }
    
    // Handle different data types
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    } else {
      const comparison = String(aValue).localeCompare(String(bValue))
      return sortDirection === 'asc' ? comparison : -comparison
    }
  })

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className='w-3 h-3 text-gray-400 group-hover:text-gray-600' fill='currentColor' viewBox='0 0 20 20'>
          <path d='M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z'></path>
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className='w-3 h-3 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 12a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zM11 16a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z'></path>
      </svg>
    ) : (
      <svg className='w-3 h-3 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 8a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zM11 4a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z'></path>
      </svg>
    )
  }

  // Pagination logic
  const totalItems = sortedFiltered.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = sortedFiltered.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [department, semester, status, domain, guide, search])

  // Pagination component
  const Pagination = () => {
    const maxVisiblePages = 5
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    const pages = []
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className='flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl sm:px-6'>
        <div className='flex justify-between flex-1 sm:hidden'>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className='inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition'
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className='relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition'
          >
            Next
          </button>
        </div>
        <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              <span className='font-medium'>{startIndex + 1}</span>–<span className='font-medium'>{Math.min(endIndex, totalItems)}</span> of{' '}
              <span className='font-medium'>{totalItems}</span>
            </p>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className='px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition'
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div>
            <nav className='inline-flex rounded overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm' aria-label='Pagination'>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition border-r border-gray-200 dark:border-gray-700'
              >
                ‹
              </button>
              
              {startPage > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className='px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition border-r border-gray-200 dark:border-gray-700'
                  >
                    1
                  </button>
                  {startPage > 2 && (
                    <span className='px-2 py-2 text-sm text-gray-400 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700'>…</span>
                  )}
                </>
              )}
              
              {pages.map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3.5 py-2 text-sm font-medium transition border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && (
                    <span className='px-2 py-2 text-sm text-gray-400 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700'>…</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className='px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition border-r border-gray-200 dark:border-gray-700'
                  >
                    {totalPages}
                  </button>
                </>
              )}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className='px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition'
              >
                ›
              </button>
            </nav>
          </div>
        </div>
      </div>
    )
  }

  const submitFilters = e => { e.preventDefault(); setSubmitted(true) }
  const resetFilters = () => { 
    setDepartment(''); 
    setSemester(''); 
    setStatus(''); 
    setDomain(''); 
    setGuide(''); 
    setSearch(''); 
    setSubmitted(false);
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
  }

  // Export functionality — one row per member, grouped by project
  const exportToCSV = () => {
    const headers = [
      'Group ID', 'Project Title', 'Domain', 'Department', 'Semester', 'Status',
      'Internal Guide', 'External Guide',
      'Member Name', 'Member Email', 'Member Roll No', 'Member Role',
      'Total Reports', 'Graded Reports', 'Avg Report Score', 'Progress %'
    ]

    const rows = []
    for (const p of sortedFiltered) {
      const gradedReports = (p.monthlyReports || []).filter(r => r.status === 'graded')
      const avgScore = gradedReports.length > 0
        ? Math.round((gradedReports.reduce((s, r) => s + (r.score || 0), 0) / gradedReports.length) * 10) / 10
        : ''

      const internalGuide = p.internalGuide?.academicInfo?.name || p.internalGuide?.email || ''
      const externalGuide = p.externalGuide?.name || ''
      const members = p.members || []

      if (members.length === 0) {
        // No members — still show the project row
        rows.push([
          p.groupId || '', p.title || '', p.domain || '', p.department || '',
          p.semester || '', p.hodApproval || 'pending',
          internalGuide, externalGuide,
          '', '', '', '',
          (p.monthlyReports || []).length, gradedReports.length, avgScore, p.progressScore || 0
        ])
      } else {
        members.forEach((m, idx) => {
          const student = m.student || {}
          // Only first row of each group shows group info; rest are blank
          const groupCols = idx === 0
            ? [p.groupId || '', p.title || '', p.domain || '', p.department || '',
               p.semester || '', p.hodApproval || 'pending',
               internalGuide, externalGuide]
            : ['', '', '', '', '', '', '', '']
          rows.push([
            ...groupCols,
            student.academicInfo?.name || '', student.email || '',
            student.academicInfo?.rollNumber || '', m.role || 'member',
            (p.monthlyReports || []).length, gradedReports.length, avgScore, p.progressScore || 0
          ])
        })
      }
    }

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `projects-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Projects exported successfully!')
  }

  // Filter visibility toggle
  const [filtersOpen, setFiltersOpen] = useState(true)

  return (
    <div className='space-y-6'>
      {/* Page Title */}
      <div className='mb-2'>
        <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>Projects</h1>
        <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>{isAdmin ? 'Manage & monitor all project groups' : isHod ? 'Review & approve department projects' : 'Browse & manage your projects'}</p>
      </div>

      {/* Student View Controls */}
      {isStudent && (
        <div className='card p-4 mb-4'>
          <div className='flex flex-wrap gap-3'>
            <button 
              onClick={openCreateModal} 
              className='inline-flex items-center gap-2 px-6 py-3 rounded bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-sm transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]'
            >
              <Plus className='w-4 h-4' />
              Create Group Project
            </button>
          </div>
        </div>
      )}

      {/* Filters - Only for Admin/HOD/Guide users */}
      {!isStudent && (
        <div className='card overflow-hidden mb-6'>
          {/* Filter header - collapsible toggle */}
          <button 
            onClick={() => setFiltersOpen(f => !f)}
            className='w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'>
                <Filter className='w-4 h-4' />
              </div>
              <span className='font-semibold text-sm'>Filters & Options</span>
              {(department || semester || status || domain || guide || search) && (
                <span className='px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white'>
                  {[department, semester, status, domain, guide, search].filter(Boolean).length} active
                </span>
              )}
            </div>
            {filtersOpen ? <ChevronUp className='w-4 h-4 text-gray-400' /> : <ChevronDown className='w-4 h-4 text-gray-400' />}
          </button>
          
          <AnimatePresence>
            {filtersOpen && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={submitFilters} 
                className='overflow-hidden'
              >
                <div className='px-6 pb-6 space-y-5 border-t border-gray-100 dark:border-gray-800 pt-4'>
            {/* Row 1: Chip filters */}
            <div className={`grid gap-5 ${(isGuide || isHod) ? 'grid-cols-1 md:grid-cols-[auto_1fr]' : 'grid-cols-1 md:grid-cols-3'}`}>
              {!isGuide && !isHod && (
                <div className='w-full'>
                  <FilterGroup title='DEPARTMENT' options={departmentsList} value={department} onSelect={v=>toggleExclusive(department,setDepartment,v)} />
                </div>
              )}
              <div className='w-full'>
                <FilterGroup title='SEMESTER' options={semesters} value={semester} onSelect={v=>toggleExclusive(semester,setSemester,v)} />
              </div>
              <div className='w-full'>
                <FilterGroup title='STATUS' options={statuses} value={status} onSelect={v=>toggleExclusive(status,setStatus,v)} />
              </div>
            </div>
            
            {/* Row 2: Dropdowns + Search */}
            <div className={`grid gap-5 ${isGuide ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
              {!isGuide && (
                <div className='w-full'>
                  <p className='text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400'>Guide</p>
                  <select value={guide} onChange={e=>setGuide(e.target.value)} className='w-full px-3 py-2.5 border rounded text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all text-gray-700 dark:text-gray-300'>
                    <option value=''>All</option>
                    {availableGuides.filter(g=> !department || g.department===department).map(g=> <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}</option>)}
                  </select>
                </div>
              )}
              <div className='w-full'>
                <p className='text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400'>Domain</p>
                <select value={domain} onChange={e=>setDomain(e.target.value)} className='w-full px-3 py-2.5 border rounded text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all text-gray-700 dark:text-gray-300'>
                  <option value=''>All Domains</option>
                  {PROJECT_DOMAINS.map(d=> <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className='w-full'>
                <p className='text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400'>Search</p>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search by title...' className='w-full px-3 py-2.5 border rounded text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all'/>
              </div>
            </div>
          </div>
        <div className='px-6 pb-5'>
        <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
        <div className='flex items-center gap-3 pt-4'>
          <button type='submit' className='inline-flex items-center gap-2 px-5 py-2.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm hover:shadow'>
            <Search className='w-3.5 h-3.5' />
            Apply
          </button>
          <button type='button' onClick={resetFilters} className='inline-flex items-center gap-2 px-4 py-2.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium'>
            <XIcon className='w-3.5 h-3.5' />
            Reset
          </button>
          {sortedFiltered.length > 0 && (
            <button 
              type='button' 
              onClick={exportToCSV} 
              className='inline-flex items-center gap-2 px-4 py-2.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm'
            >
              <Download className='w-3.5 h-3.5' />
              Export CSV
            </button>
          )}
          <div className='ml-auto text-sm text-gray-500 dark:text-gray-400 font-medium'>
            {submitted ? <span className='inline-flex items-center gap-1.5'><BarChart3 className='w-3.5 h-3.5' />{sortedFiltered.length} result{sortedFiltered.length !== 1 ? 's' : ''}</span> : <span className='text-gray-400'>Apply filters to see results</span>}
          </div>
        </div>
        </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}

      {!isStudent && !submitted ? (
        <div className='flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500'>
          <div className='p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4'>
            <Filter className='w-8 h-8' />
          </div>
          <p className='font-semibold text-lg text-gray-600 dark:text-gray-300'>No filters applied</p>
          <p className='text-sm mt-1'>Use the filters above and click <span className='font-semibold text-indigo-500'>Apply</span> to view projects.</p>
        </div>
      ) : isStudent ? (
        <div className='grid gap-6'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500'>
              <div className='w-10 h-10 border border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4' />
              <p className='text-sm text-gray-500 dark:text-gray-400'>Loading your projects...</p>
            </div>
          ) : mine.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500'>
              <div className='p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4'>
                <FolderKanban className='w-8 h-8' />
              </div>
              <p className='font-semibold text-lg text-gray-600 dark:text-gray-300'>No projects yet</p>
              <p className='text-sm mt-1'>Create a project group or get added by a teammate.</p>
              <button onClick={openCreateModal} className='mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition'>
                <Plus className='w-4 h-4' /> Create Project
              </button>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {mine.map((p, i) => (
                <motion.div 
                  key={p._id} 
                  initial={{ opacity: 0, y: 16 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.04 }}
                  className='glass-card rounded p-5 flex flex-col group relative overflow-hidden'
                >
                  {/* Accent top bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    p.hodApproval === 'approved' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    p.hodApproval === 'rejected' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                    'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`} />
                  
                  <div className='flex items-start justify-between gap-3 mt-1'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-bold text-base text-gray-900 dark:text-white truncate'>{p.title}</h3>
                      <div className='flex items-center gap-2 mt-1'>
                        <span className='text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-700/50 text-indigo-700 dark:text-indigo-200 font-semibold'>{p.groupId}</span>
                        <StatusBadge status={p.hodApproval || 'pending'} reports={p.monthlyReports} />
                      </div>
                    </div>
                    {/* Progress ring */}
                    {(() => {
                      const graded = (p.monthlyReports || []).filter(r => r.status === 'graded' && r.score != null)
                      const avg = graded.length > 0 ? Math.round((graded.reduce((s, r) => s + r.score, 0) / graded.length) * 10) / 10 : 0
                      return (
                        <div className='relative w-12 h-12 flex-shrink-0'>
                          <svg className='w-12 h-12 -rotate-90' viewBox='0 0 36 36'>
                            <path d='M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831' fill='none' stroke='currentColor' className='text-gray-200 dark:text-gray-700' strokeWidth='3' />
                            <path d='M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831' fill='none' 
                              className={`${avg >= 7 ? 'text-green-500' : avg >= 4 ? 'text-amber-500' : 'text-red-400'}`}
                              strokeWidth='3' strokeDasharray={`${avg * 10}, 100`} strokeLinecap='round' />
                          </svg>
                          <span className='absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-200'>{avg}</span>
                        </div>
                      )
                    })()}
                  </div>
                  
                  <div className='text-[12px] text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5'>
                    <UserCheck className='w-3 h-3' />
                    <span className='font-medium'>{p.leader?.academicInfo?.name || p.leader?.email?.split('@')[0]}</span>
                  </div>
                  
                  <div className='grid grid-cols-2 gap-2 text-[11px] mt-3'>
                    <div className='flex items-center gap-1 text-gray-600 dark:text-gray-400 min-w-0'>
                      <Globe className='w-3 h-3 text-purple-500 flex-shrink-0' /> <span className='truncate'>{p.domain || '—'}</span>
                    </div>
                    <div className='flex items-center gap-1 text-gray-600 dark:text-gray-400 min-w-0'>
                      <Building2 className='w-3 h-3 text-blue-500 flex-shrink-0' /> <span className='truncate'>{p.department}</span>
                    </div>
                    <div className='flex items-center gap-1 text-gray-600 dark:text-gray-400'>
                      <Calendar className='w-3 h-3 text-green-500 flex-shrink-0' /> Sem {p.semester}
                    </div>
                    <div className='flex items-center gap-1 text-gray-600 dark:text-gray-400'>
                      <Users className='w-3 h-3 text-indigo-500 flex-shrink-0' /> {p.members?.length || 0} members
                    </div>
                  </div>
                  
                  {p.description && (
                    <p className='text-[11px] text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 leading-relaxed'>{p.description}</p>
                  )}
                  
                  <button 
                    onClick={() => setSelected(p)} 
                    className='w-full mt-4 px-4 py-2.5 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:shadow-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2'
                  >
                    <Eye className='w-3.5 h-3.5' /> View Details
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className='space-y-4'>
          {/* Skeleton loader */}
          {[1,2,3,4,5].map(i => (
            <div key={i} className='card p-0 overflow-hidden' style={{ animationDelay: `${i * 0.08}s` }}>
              <div className='flex items-center gap-4 px-6 py-4'>
                <div className='skeleton w-48 h-5 rounded' />
                <div className='skeleton w-16 h-5 rounded-full' />
                <div className='flex-1' />
                <div className='skeleton w-20 h-5 rounded' />
                <div className='skeleton w-24 h-3 rounded-full' />
                <div className='skeleton w-16 h-7 rounded-md' />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='space-y-6'>
          {sortedFiltered.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500'>
              <div className='p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4'>
                <Search className='w-8 h-8' />
              </div>
              <p className='font-semibold text-lg text-gray-600 dark:text-gray-300'>No matching projects</p>
              <p className='text-sm mt-1'>Try adjusting your filters or search terms.</p>
              <button onClick={resetFilters} className='mt-4 inline-flex items-center gap-2 px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition'>
                <XIcon className='w-3.5 h-3.5' /> Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* Results summary bar */}
              <div className='flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 px-5 py-3'>
                <div className='text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2'>
                  <Table2 className='w-4 h-4 text-indigo-500' />
                  <span>{sortedFiltered.length} project{sortedFiltered.length !== 1 ? 's' : ''}</span>
                  {sortField && (
                    <span className='inline-flex items-center gap-1 ml-1 text-indigo-600 dark:text-indigo-400'>
                      <ArrowUpDown className='w-3 h-3' /> {sortField} ({sortDirection})
                    </span>
                  )}
                </div>
                <div className='flex gap-2 text-xs'>
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-medium border border-green-200 dark:border-green-800'>
                    <CheckCircle2 className='w-3 h-3' /> {sortedFiltered.filter(p => p.hodApproval === 'approved').length}
                  </span>
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded font-medium border border-amber-200 dark:border-amber-800'>
                    <Clock className='w-3 h-3' /> {sortedFiltered.filter(p => p.hodApproval === 'pending' || !p.hodApproval).length}
                  </span>
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-medium border border-red-200 dark:border-red-800'>
                    <XCircle className='w-3 h-3' /> {sortedFiltered.filter(p => p.hodApproval === 'rejected').length}
                  </span>
                </div>
              </div>
              
              {/* Enhanced table */}
              <div className='card p-0 overflow-hidden shadow-sm rounded border border-gray-200 dark:border-gray-700'>
                <div className='overflow-x-auto max-h-[calc(100vh-280px)]'>
                  <table className='w-full min-w-[700px]'>
                    <thead className='bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10'>
                      <tr>
                        <th className='px-3 py-3 text-left text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[22%]'>
                          <button 
                            onClick={() => handleSort('title')}
                            className='flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group'
                          >
                            <FolderKanban className='w-3.5 h-3.5' />
                            Project Title
                            <SortIcon field='title' />
                          </button>
                        </th>
                        {visibleFields.includes('leader') && (
                          <th className='px-2 py-3 text-left text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[15%]'>
                            <button 
                              onClick={() => handleSort('leader')}
                              className='flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group'
                            >
                              <Award className='w-3.5 h-3.5' />
                              Leader
                              <SortIcon field='leader' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('domain') && (
                          <th className='px-2 py-3 text-left text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[12%]'>
                            <button 
                              onClick={() => handleSort('domain')}
                              className='flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group'
                            >
                              <Globe className='w-3.5 h-3.5' />
                              Domain
                              <SortIcon field='domain' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('internal') && (
                          <th className='px-2 py-3 text-left text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[14%]'>
                            <span className='flex items-center gap-1.5'><UserCheck className='w-3.5 h-3.5' /> Internal Guide</span>
                          </th>
                        )}
                        {visibleFields.includes('external') && (
                          <th className='px-2 py-3 text-left text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[14%]'>
                            <span className='flex items-center gap-1.5'><ExternalLink className='w-3.5 h-3.5' /> External Guide</span>
                          </th>
                        )}
                        {visibleFields.includes('members') && (
                          <th className='px-2 py-3 text-center text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[7%]'>
                            <button 
                              onClick={() => handleSort('members')}
                              className='flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group justify-center'
                            >
                              <Users className='w-3.5 h-3.5' />
                              Team
                              <SortIcon field='members' />
                            </button>
                          </th>
                        )}
                        <th className='px-2 py-3 text-center text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-[16%]'>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                      {currentItems.map((p, index) => (
                        <tr 
                          key={p._id} 
                          className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors duration-150 animate-row-in cursor-pointer ${index % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/20'}`}
                          style={{ animationDelay: `${index * 0.03}s` }}
                          onClick={() => setSelected(p)}
                        >
                          <td className='px-3 py-3'>
                            <div className='flex flex-col gap-0.5'>
                              <div className='font-semibold text-gray-900 dark:text-white text-[13px] leading-snug line-clamp-2'>{p.title || <span className='text-gray-400 italic'>No title</span>}</div>
                              <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold tracking-wide w-fit'>
                                {p.groupId}
                              </span>
                            </div>
                          </td>
                          
                          {visibleFields.includes('leader') && (
                            <td className='px-2 py-3'>
                              <div className='text-[12px] text-gray-900 dark:text-gray-100'>
                                <div className='font-medium truncate'>{p.leader?.academicInfo?.name || p.leader?.email?.split('@')[0] || '—'}</div>
                                {p.leader?.academicInfo?.rollNumber && (
                                  <div className='text-[10px] text-gray-500 dark:text-gray-400'>{p.leader.academicInfo.rollNumber}</div>
                                )}
                              </div>
                            </td>
                          )}
                          
                          {visibleFields.includes('domain') && (
                            <td className='px-2 py-3'>
                              <span className='inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 truncate max-w-full' title={p.domain || '—'}>
                                {p.domain ? (p.domain.length > 15 ? p.domain.split(/[+,&]/)[0].trim() : p.domain) : '—'}
                              </span>
                            </td>
                          )}
                          
                          {visibleFields.includes('internal') && (
                            <td className='px-2 py-3'>
                              <div className='text-[12px] text-gray-900 dark:text-gray-100'>
                                {p.internalGuide ? (
                                  <div className='flex items-center gap-1.5'>
                                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0'></div>
                                    <span className='truncate'>{p.internalGuide.academicInfo?.name || p.internalGuide.email}</span>
                                  </div>
                                ) : (
                                  <div className='flex items-center gap-1.5 text-gray-400'>
                                    <div className='w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0'></div>
                                    <span>Not Assigned</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          
                          {visibleFields.includes('external') && (
                            <td className='px-2 py-3'>
                              <div className='text-[12px] text-gray-900 dark:text-gray-100'>
                                {p.externalGuide ? (
                                  <div className='flex items-center gap-1.5'>
                                    <div className='w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0'></div>
                                    <span className='truncate'>{p.externalGuide.name}</span>
                                  </div>
                                ) : (
                                  <div className='flex items-center gap-1.5 text-gray-400'>
                                    <div className='w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0'></div>
                                    <span>Not Assigned</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          
                          {visibleFields.includes('members') && (
                            <td className='px-2 py-3 text-center'>
                              <span className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-xs font-medium'>
                                {p.members?.length || 0}
                              </span>
                            </td>
                          )}
                          
                          <td className='px-2 py-3 whitespace-nowrap'>
                            <div className='flex items-center justify-center gap-2 flex-wrap' onClick={e => e.stopPropagation()}>
                              {/* HOD Actions */}
                              {isHod && (
                                <>
                                  {p.hodApproval !== 'approved' && (
                                    <button 
                                      onClick={() => approveProject(p._id, true)} 
                                      className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow active:scale-95'
                                      title='Approve Project'
                                    >
                                      <CheckCircle2 className='w-3 h-3' />
                                      Approve
                                    </button>
                                  )}
                                  {p.hodApproval !== 'rejected' && (
                                    <button 
                                      onClick={() => approveProject(p._id, false)} 
                                      className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow active:scale-95'
                                      title='Reject Project'
                                    >
                                      <XCircle className='w-3 h-3' />
                                      Reject
                                    </button>
                                  )}
                                </>
                              )}
                              
                              {/* Admin Actions */}
                              {isAdmin && (
                                <>
                                  {p.hodApproval === 'approved' ? (
                                    !p.internalGuide ? (
                                      <button 
                                        onClick={() => setSelected(p)} 
                                        className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow active:scale-95'
                                        title='Assign Guide'
                                      >
                                        <UserPlus className='w-3 h-3' />
                                        Assign
                                      </button>
                                    ) : (
                                      <span className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' title='Guide Assigned'>
                                        <CheckCircle2 className='w-3 h-3' />
                                        Assigned
                                      </span>
                                    )
                                  ) : (
                                    <span className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' title='Awaiting HOD'>
                                      <Clock className='w-3 h-3' />
                                      Awaiting
                                    </span>
                                  )}
                                </>
                              )}
                              
                              {/* View Details Button removed - click row to view */}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && <Pagination />}
              </div>
            </>
          )}
        </div>
      )}

      {showCreate && isStudent && (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4' onClick={closeCreateModal}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='w-full max-w-2xl bg-white dark:bg-gray-900 rounded shadow-sm overflow-hidden'
            onClick={e => e.stopPropagation()}
          >
            {/* Create Modal Header */}
            <div className='bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='font-bold text-lg flex items-center gap-2'><Plus className='w-5 h-5' /> Create Project Group</h2>
                  <p className='text-white/70 text-xs mt-0.5'>You will be the leader. Add teammates now or later.</p>
                </div>
                <button onClick={closeCreateModal} className='p-1.5 rounded hover:bg-white/20 transition'>
                  <XIcon className='w-5 h-5' />
                </button>
              </div>
            </div>
            
            <div className='p-6 max-h-[70vh] overflow-y-auto'>
              {/* Team Leader (auto-fetched) */}
              <div className='mb-5 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded'>
                <div className='text-[11px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2 flex items-center gap-1.5'>
                  <ShieldCheck className='w-3.5 h-3.5' /> Team Leader (You)
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm'>
                    {(session?.user?.academicInfo?.name || session?.user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className='font-semibold text-sm text-gray-900 dark:text-gray-100'>
                      {session?.user?.academicInfo?.name || session?.user?.email?.split('@')[0]}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      {session?.user?.academicInfo?.rollNumber || session?.user?.email} · {session?.user?.department} · Sem {session?.user?.academicInfo?.semester}
                    </div>
                  </div>
                </div>
              </div>

              <div className='grid md:grid-cols-2 gap-4 text-sm'>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400'>Project Title</label>
                  <input className='px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition' value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder='e.g. UGSF' />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400'>Domain</label>
                  <select className='px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition' value={form.domain} onChange={e=>setForm({...form,domain:e.target.value, customDomain: e.target.value === 'Other' ? form.customDomain : ''})}>
                    <option value=''>Select Domain</option>
                    {PROJECT_DOMAINS.map(d=> <option key={d} value={d}>{d}</option>)}
                  </select>
                  {form.domain === 'Other' && (
                    <input 
                      className='mt-1.5 px-3 py-2.5 border border-amber-300 dark:border-amber-700 rounded bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 outline-none transition' 
                      value={form.customDomain} 
                      onChange={e=>setForm({...form,customDomain:e.target.value})} 
                      placeholder='Enter your domain...' 
                    />
                  )}
                </div>
                <div className='md:col-span-2 flex flex-col gap-1.5'>
                  <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400'>Problem Statement / Description</label>
                  <textarea className='px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 min-h-[80px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none' value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder='Problem statement, objective, impact... (≤200 words)' />
                  <div className={`text-[10px] font-medium ${descWords>200?'text-red-500':'text-gray-400'}`}>{descWords} / 200 words</div>
                </div>

                {/* Internal Guide info */}
                <div className='md:col-span-2 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded'>
                  <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
                    <UserCheck className='w-3.5 h-3.5' />
                    <span className='font-medium'>Internal Guide</span>
                    <span className='text-[10px] italic'>— Will be assigned by your HOD after submission</span>
                  </div>
                </div>

                <div className='md:col-span-2 flex flex-col gap-1.5'>
                  <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400'>Add Teammates</label>
                  <div className='relative'>
                    <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                      <Search className='w-4 h-4' />
                    </div>
                    <input 
                      className='w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition' 
                      value={memberSearch} 
                      onChange={(e) => {
                        const value = e.target.value
                        setMemberSearch(value)
                        if (value.length < 2) {
                          setMemberSuggestions([])
                          setSearchLoading(false)
                        } else {
                          setSearchLoading(true)
                          debouncedSearch(value)
                        }
                      }}
                      placeholder='Type student ID (e.g., 23dit015) or name...' 
                    />
                    {searchLoading && (
                      <div className='absolute right-3 top-3'>
                        <div className='w-4 h-4 border border-gray-300 border-t-indigo-600 rounded-full animate-spin'></div>
                      </div>
                    )}
                    
                    {memberSuggestions.length > 0 && (
                      <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm max-h-60 overflow-y-auto'>
                        {memberSuggestions.map((student) => (
                          <div 
                            key={student.id}
                            className='px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors'
                            onClick={() => addMemberToSelection(student)}
                          >
                            <div className='flex items-center gap-3'>
                              <div className='w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold'>
                                {student.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className='font-semibold text-sm text-gray-900 dark:text-gray-100'>{student.studentId}</div>
                                <div className='text-xs text-gray-500'>{student.name}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedMembers.length > 0 && (
                    <div className='mt-2'>
                      <div className='text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2'>Team Members ({selectedMembers.length})</div>
                      <div className='flex flex-wrap gap-2'>
                        {selectedMembers.map((member) => (
                          <div key={member.email} className='flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded text-sm'>
                            <div className='w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-[10px] font-bold'>
                              {member.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className='font-semibold text-gray-900 dark:text-gray-100 text-xs'>{member.studentId}</span>
                            <span className='text-xs text-gray-600 dark:text-gray-400'>— {member.name}</span>
                            <button 
                              onClick={() => removeMemberFromSelection(member.email)}
                              className='text-red-400 hover:text-red-600 transition ml-1'
                            >
                              <XIcon className='w-3 h-3' />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className='text-[10px] text-gray-400 mt-1'>
                    Start typing student ID (e.g., &quot;23&quot;) to see suggestions.
                  </div>
                </div>
              </div>
              <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800'>
                <button type='button' onClick={closeCreateModal} className='px-5 py-2.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition'>Cancel</button>
                <button 
                  type='button' 
                  disabled={!formValid} 
                  onClick={submitProject} 
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded text-sm font-semibold transition-all ${
                    formValid 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-sm active:scale-[0.98]' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className='w-4 h-4' /> Create Project
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {selectedProject && (
        <ProjectModal project={selectedProject} close={()=>setSelected(null)} session={session} isAdmin={!!isAdmin} isHod={!!isHod} guides={guides} assignInternal={assignInternal} approveProject={approveProject} addMember={addMember} removeMember={removeMember} loadProjects={loadProjects} />
      )}
    </div>
  )
}

function FilterGroup({ title, options, value, onSelect }) {
  const formatTitle = (text) => text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  const formatOptionText = (text) => title === 'STATUS' ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : text
  
  return (
    <div>
      <p className='text-[11px] font-bold tracking-widest mb-2.5 text-gray-500 dark:text-gray-400 uppercase'>{formatTitle(title)}</p>
      <div className='flex flex-wrap gap-2'>
        {options.map(opt => {
          const checked = value === opt
          return (
            <button 
              key={opt} type='button' onClick={()=>onSelect(opt)} 
              className={`px-3.5 py-2 rounded text-sm font-medium transition-all duration-200 ${
                checked 
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 dark:ring-indigo-800 scale-[1.02]' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {formatOptionText(opt)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FieldSelector({ fields, visible, toggle }) {
  return (
    <div className='border-t border-gray-100 dark:border-gray-800 pt-5'>
      <p className='text-[11px] font-bold tracking-widest mb-2.5 text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2'>
        <Sliders className='w-3.5 h-3.5' /> Visible Columns
      </p>
      <div className='flex flex-wrap gap-2'>
        {fields.map(f => {
          const checked = visible.includes(f.key)
          return (
            <label 
              key={f.key} 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-sm cursor-pointer select-none transition-all duration-200 font-medium ${
                checked 
                  ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-300 dark:ring-violet-800' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <input type='checkbox' className='hidden' checked={checked} onChange={()=>toggle(f.key)} />
              {checked && <CheckCircle2 className='w-3 h-3' />}
              {f.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status, reports }) {
  // Compute display status: if all reports graded → 'submitted', else 'under-review'
  const gradedCount = (reports || []).filter(r => r.status === 'graded').length
  const totalCount = (reports || []).length
  const displayStatus = totalCount > 0 && gradedCount === totalCount ? 'submitted' : 'under-review'

  const config = {
    'under-review': { bg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800', icon: Eye, label: 'Under Review' },
    'submitted': { bg: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800', icon: CheckCircle2, label: 'Submitted' },
  }
  const c = config[displayStatus] || config['under-review']
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${c.bg} badge-animate`}>
      <Icon className='w-2.5 h-2.5' />
      {c.label}
    </span>
  )
}

function ProjectModal({ project, close, session, isAdmin, isHod, guides, assignInternal, approveProject, addMember, removeMember, loadProjects }) {
  const [tab, setTab] = useState('overview')
  const [groupDetails, setGroupDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [memberView, setMemberView] = useState(null)
  const [externalGuideEmail, setExternalGuideEmail] = useState(project.externalGuide?.email || '')
  const [externalGuideName, setExternalGuideName] = useState(project.externalGuide?.name || '')
  const [progressDraft, setProgressDraft] = useState(project.progressScore||0)
  // Pending guide changes — only saved when HOD clicks Save
  const [pendingInternalGuide, setPendingInternalGuide] = useState(project.internalGuide?._id || '')
  const [changingGuide, setChangingGuide] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingReport, setAddingReport] = useState(false)
  const [reportUrl, setReportUrl] = useState('')
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackReport, setFeedbackReport] = useState('')
  const [addingMember, setAddingMember] = useState('')
  // Report upload states
  const [reportFile, setReportFile] = useState(null)
  const [reportTitle, setReportTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [turningIn, setTurningIn] = useState(false)
  // Auto month/year from current date
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()
  const isDeadlineOpen = true // deadline feature disabled
  const monthNames = ['','January','February','March','April','May','June','July','August','September','October','November','December']
  const monthNamesShort = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentMonthReport = (project.monthlyReports || []).find(r => r.month === currentMonth && r.year === currentYear)
  const alreadySubmittedThisMonth = !!currentMonthReport
  const isTurnedIn = currentMonthReport?.turnedIn === true
  // Grading states
  const [gradingReport, setGradingReport] = useState(null)
  const [rubrics, setRubrics] = useState([])
  const [selectedRubric, setSelectedRubric] = useState(null)
  const [criteriaScores, setCriteriaScores] = useState({})
  const [gradeScore, setGradeScore] = useState(0)
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [grading, setGrading] = useState(false)
  const [pdfLoadError, setPdfLoadError] = useState(false)
  const fileInputRef = useRef(null)
  const canManage = isAdmin || isHod
  const isGuide = session?.user?.role==='guide' && String(project.internalGuide?._id)===String(session.user.id)
  const isProjectCoordinator = session?.user?.role==='project_coordinator'
  const canProgress = isGuide
  const canViewProgress = canManage || isGuide || isProjectCoordinator
  const isMember = project.members.some(m=> String(m.student?._id||m.student)===String(session.user.id))
  const isLeader = String(project.leader?._id || project.leader) === String(session.user.id)
  // Can submit: member, deadline open, and either no report yet OR existing draft (not turned in)
  const canSubmitReport = isMember && (!alreadySubmittedThisMonth || !isTurnedIn)

  // Compute average progress from graded monthly reports
  const gradedReports = (project.monthlyReports || []).filter(r => r.status === 'graded' && r.score !== undefined && r.score !== null)
  const avgProgress = gradedReports.length > 0 ? Math.round((gradedReports.reduce((sum, r) => sum + r.score, 0) / gradedReports.length) * 10) / 10 : 0
  const avgProgressPct = gradedReports.length > 0 ? (avgProgress / 10) * 100 : 0

  const availableGuidesModal = isHod 
    ? guides.filter(g => {
        const hodDepartment = session?.user?.department
        return hodDepartment ? g.department === hodDepartment : true
      })
    : guides

  const updateProgress = async () => {
    if(!canProgress) return
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project._id, progressScore: progressDraft }) })
    if(res.ok){ toast.success('Progress saved') }
  }
  const addReport = async () => {
    if (!reportFile || !reportTitle.trim()) return toast.error('Please select a PDF and enter a title')
    setUploading(true)
    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', reportFile)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) { const e = await uploadRes.json(); toast.error(e.error || 'Upload failed'); return }
      const { url } = await uploadRes.json()
      // Submit report (creates draft or replaces existing draft)
      const res = await fetch('/api/projects', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project._id, submitReport: { month: currentMonth, year: currentYear, title: reportTitle.trim(), pdfUrl: url } })
      })
      if (res.ok) { toast.success(currentMonthReport ? 'Report replaced!' : 'Report uploaded as draft!'); setReportFile(null); setReportTitle(''); setAddingReport(false); if (fileInputRef.current) fileInputRef.current.value = ''; await loadProjects() }
      else { const e = await res.json(); toast.error(e.error?.message || 'Failed to submit') }
    } catch (err) { toast.error('Something went wrong') }
    finally { setUploading(false) }
  }
  const turnInReport = async (reportId) => {
    setTurningIn(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project._id, turnInReport: reportId })
      })
      if (res.ok) { toast.success('Report turned in! Your guide can now review it.'); await loadProjects() }
      else { const e = await res.json(); toast.error(e.error?.message || 'Failed to turn in') }
    } catch { toast.error('Something went wrong') }
    finally { setTurningIn(false) }
  }
  const submitGrade = async () => {
    if (!gradingReport) return
    setGrading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project._id, gradeReport: { reportId: gradingReport._id, score: gradeScore, feedback: gradeFeedback, reportStatus: 'graded' } })
      })
      if (res.ok) { toast.success('Report graded!'); setGradingReport(null); setGradeScore(0); setGradeFeedback(''); await loadProjects() }
      else { const e = await res.json(); toast.error(e.error?.message || 'Grading failed') }
    } catch (err) { toast.error('Something went wrong') }
    finally { setGrading(false) }
  }
  const giveFeedback = async () => {
    if(!feedbackReport || !feedbackDraft.trim()) return
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project._id, feedback: feedbackDraft, feedbackReportId: feedbackReport }) })
    if(res.ok){ toast.success('Feedback added'); setFeedbackDraft(''); setFeedbackReport('') }
  }
  // Check if there are unsaved manage-tab changes
  const hasGuideChanges = (() => {
    const origInternal = project.internalGuide?._id || ''
    const origExtName = project.externalGuide?.name || ''
    const origExtEmail = project.externalGuide?.email || ''
    return pendingInternalGuide !== origInternal || externalGuideName !== origExtName || externalGuideEmail !== origExtEmail
  })()

  const saveManageChanges = async () => {
    setSaving(true)
    try {
      // Save internal guide if changed
      const origInternal = project.internalGuide?._id || ''
      if (pendingInternalGuide !== origInternal) {
        await assignInternal(project._id, pendingInternalGuide || undefined)
      }
      // Save external guide if changed
      const origExtName = project.externalGuide?.name || ''
      const origExtEmail = project.externalGuide?.email || ''
      if (externalGuideName !== origExtName || externalGuideEmail !== origExtEmail) {
        if (externalGuideEmail.trim()) {
          const ext = { name: externalGuideName || externalGuideEmail.split('@')[0], email: externalGuideEmail }
          const res = await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project._id, externalGuide: ext }) })
          if (!res.ok) { const e = await res.json(); toast.error(e.error?.message || 'Failed to save external guide') }
        }
      }
      toast.success('Changes saved successfully!')
      await loadProjects()
    } catch { toast.error('Failed to save changes') }
    finally { setSaving(false) }
  }

  useEffect(()=>{
    if(tab==='members' && !groupDetails){
      setLoadingDetails(true)
      fetch(`/api/projects/group-details?groupId=${project.groupId}`).then(async r=>{
        if(r.ok){ const d = await r.json(); setGroupDetails(d.group) }
      }).finally(()=> setLoadingDetails(false))
    }
  },[tab, groupDetails, project.groupId])

  // Load rubrics when anyone opens reports tab
  useEffect(()=>{
    if(tab==='reports' && rubrics.length === 0){
      fetch(`/api/rubrics?department=${project.department}`).then(async r=>{
        if(r.ok){ const d = await r.json(); setRubrics(d.rubrics||[]) }
      })
    }
  },[tab, project.department])

  // Auto-select first rubric when rubrics load
  useEffect(()=>{
    if(rubrics.length > 0 && !selectedRubric){
      setSelectedRubric(rubrics[0])
    }
  },[rubrics, selectedRubric])

  // Compute total score from criteria scores
  useEffect(()=>{
    if(selectedRubric && selectedRubric.criteria?.length > 0){
      const total = selectedRubric.criteria.reduce((sum, c) => sum + (Number(criteriaScores[c._id]) || 0), 0)
      const maxTotal = selectedRubric.criteria.reduce((sum, c) => sum + (c.maxScore || 10), 0)
      // Normalize to /10, rounded to nearest integer
      const normalized = maxTotal > 0 ? Math.round((total / maxTotal) * 10) : 0
      setGradeScore(normalized)
    }
  },[criteriaScores, selectedRubric])

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'members', label: 'Members', icon: Users },
    ...(canManage || isGuide || isProjectCoordinator ? [{ key: 'manage', label: 'Manage', icon: Sliders }] : []),
    { key: 'reports', label: 'Reports', icon: FileText },
  ]

  return (
    <div className='fixed inset-0 z-50 flex flex-col'>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className='w-full h-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden'
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className='relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-4 sm:px-6 py-4 sm:py-5 text-white'>
          <div className='absolute inset-0 opacity-10'>
            <div className='absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/3' />
          </div>
          <div className='relative z-10'>
            <div className='flex items-start justify-between'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-3 mb-1'>
                  <h3 className='text-lg md:text-xl font-bold truncate'>{project.title}</h3>
                  <span className='text-[10px] px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm font-bold tracking-wide flex-shrink-0'>{project.groupId}</span>
                </div>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-white/70 text-[12px]'>
                  <span className='flex items-center gap-1'><Building2 className='w-3 h-3' /> {project.department}</span>
                  <span className='text-white/30 hidden sm:inline'>|</span>
                  <span className='flex items-center gap-1'><GraduationCap className='w-3 h-3' /> Sem {project.semester}</span>
                  <span className='text-white/30 hidden sm:inline'>|</span>
                  <span className='flex items-center gap-1'><Globe className='w-3 h-3' /> {project.domain || 'No domain'}</span>
                </div>
              </div>
              <button onClick={close} className='p-1.5 rounded hover:bg-white/20 transition-colors flex-shrink-0'>
                <XIcon className='w-5 h-5' />
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className='px-2 sm:px-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 overflow-x-auto'>
          <div className='flex gap-0.5 sm:gap-1 min-w-max'>
            {tabs.map(t => {
              const Icon = t.icon
              const isActive = tab === t.key
              return (
                <button 
                  key={t.key} 
                  onClick={() => setTab(t.key)} 
                  className={`relative flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className='w-3.5 h-3.5' />
                  {t.label}
                  {isActive && <div className='absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full tab-active-line' />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className='p-4 sm:p-6 flex-1 overflow-y-auto'>
          <AnimatePresence mode='wait'>
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          
          {tab === 'overview' && (
            <div className='space-y-5'>
              <div className='grid md:grid-cols-2 gap-4'>
                {[
                  { label: 'Leader', value: project.leader?.academicInfo?.name || project.leader?.email, icon: Award },
                  { label: 'Members', value: `${project.members.length} member${project.members.length !== 1 ? 's' : ''}`, icon: Users },
                  { label: 'Internal Guide', value: project.internalGuide?.academicInfo?.name || project.internalGuide?.email || '—', icon: UserCheck },
                  { label: 'External Guide', value: project.externalGuide?.name || '—', icon: ExternalLink },
                ].map(item => (
                  <div key={item.label} className='flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800'>
                    <div className='p-2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'>
                      <item.icon className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>{item.label}</div>
                      <div className='text-sm font-semibold text-gray-900 dark:text-white'>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {project.description && (
                <div className='p-4 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800'>
                  <div className='text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Description</div>
                  <p className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed'>{project.description}</p>
                </div>
              )}
              {/* Progress visualization */}
              <div className='p-4 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>Progress</div>
                  <div className='text-[10px] text-gray-400'>{gradedReports.length} report{gradedReports.length !== 1 ? 's' : ''} graded</div>
                </div>
                <div className='flex items-center gap-4'>
                  <div className='flex-1'>
                    <div className='w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                      <div className={`h-full transition-all duration-700 rounded-full ${
                        avgProgress >= 8 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                        avgProgress >= 5 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                        'bg-gradient-to-r from-red-400 to-rose-500'
                      }`} style={{ width: `${avgProgressPct}%` }} />
                    </div>
                  </div>
                  <span className='text-lg font-bold text-gray-700 dark:text-gray-200'>{avgProgress}<span className='text-sm text-gray-400'>/10</span></span>
                </div>
              </div>
              {isLeader && (
                <div className='space-y-2'>
                  <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400'>Add Member</h4>
                  <div className='flex gap-2'>
                    <input value={addingMember} onChange={e=>setAddingMember(e.target.value)} placeholder='student email or id' className='flex-1 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition'/>
                    <button onClick={()=>{addMember(project._id, addingMember); setAddingMember('')}} className='px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition'>Add</button>
                  </div>
                  <div className='grid sm:grid-cols-2 gap-2 text-[11px]'>
                    {project.members.map(m => (
                      <div key={m.student._id||m.student} className='px-3 py-2 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800/50'>
                        <span className='font-medium'>{m.student?.academicInfo?.name || m.student?.email || m.student}</span>
                        {(isAdmin || isHod || (isLeader && m.role!=='leader')) && (
                          <button onClick={()=>removeMember(project._id, m.student._id||m.student)} className='text-red-500 hover:text-red-700 text-[10px] font-medium'>Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className='space-y-4'>
              {loadingDetails && (
                <div className='space-y-3'>
                  {[1,2,3].map(i => <div key={i} className='skeleton h-20 rounded' />)}
                </div>
              )}
              {!loadingDetails && groupDetails && (
                <div className='grid sm:grid-cols-2 gap-3'>
                  {groupDetails.members.map(m => (
                    <div key={m.student._id} className='p-4 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:shadow-md transition-shadow'>
                      <div className='flex justify-between items-start mb-2'>
                        <div className='flex items-center gap-2'>
                          <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm'>
                            {(m.student.academicInfo?.name || m.student.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className='font-semibold text-sm'>{m.student.academicInfo?.name || m.student.email}</div>
                            <div className='text-[10px] text-gray-500'>{m.student.email}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          m.role === 'leader' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        }`}>{m.role}</span>
                      </div>
                      <div className='text-[10px] text-gray-500'>Dept: {m.student.department}</div>
                      <button onClick={()=>setMemberView(m)} className='text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-2 hover:underline flex items-center gap-1'>
                        <Eye className='w-3 h-3' /> View Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!loadingDetails && !groupDetails && (
                <div className='text-center py-8 text-gray-400'>
                  <Users className='w-8 h-8 mx-auto mb-2 opacity-50' />
                  <p className='text-sm'>No member data available</p>
                </div>
              )}
            </div>
          )}

          {tab === 'manage' && (canManage || isGuide || isProjectCoordinator) && (
            <div className='space-y-6'>
              {/* HOD Approval Section */}
              <div className='p-4 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-3'>
                <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2'>
                  <ShieldCheck className='w-3.5 h-3.5' />
                  {isHod ? 'HOD Approval' : 'Status & Actions'}
                </h4>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] text-gray-500'>Current Status:</span>
                  <StatusBadge status={project.hodApproval || 'pending'} reports={project.monthlyReports} />
                </div>
                {isHod && (project.hodApproval !== 'approved') && (
                  <div className='flex flex-wrap gap-2'>
                    {project.hodApproval !== 'approved' && (
                      <button onClick={()=>approveProject(project._id,true)} className='inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition font-medium'>
                        <CheckCircle2 className='w-3.5 h-3.5' /> Approve
                      </button>
                    )}
                    {project.hodApproval !== 'rejected' && (
                      <button onClick={()=>approveProject(project._id,false)} className='inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition font-medium'>
                        <XCircle className='w-3.5 h-3.5' /> Reject
                      </button>
                    )}
                  </div>
                )}
                {isAdmin && project.hodApproval !== 'approved' && (
                  <div className='p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2'>
                    <AlertTriangle className='w-4 h-4 flex-shrink-0' />
                    This project must be approved by HOD before you can assign guides.
                  </div>
                )}
              </div>
              
              {/* Guide Assignment */}
              {(isHod || (isAdmin && project.hodApproval === 'approved')) && (
                <div className='p-4 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-3'>
                  <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2'>
                    <UserPlus className='w-3.5 h-3.5' /> Assign Guides
                  </h4>
                  <div>
                    <label className='text-[11px] text-gray-500 font-medium mb-1 block'>Internal Guide</label>
                    {pendingInternalGuide && !changingGuide ? (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-3 p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'>
                          <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                          <span className='text-sm font-medium text-green-800 dark:text-green-200'>
                            {(() => { const g = availableGuidesModal.find(g => g._id === pendingInternalGuide); return g ? (g.academicInfo?.name || g.email) + (g.role === 'hod' ? ' (HOD)' : '') : project.internalGuide?.academicInfo?.name || project.internalGuide?.email || 'Selected Guide' })()}
                          </span>
                        </div>
                        <button 
                          onClick={() => setChangingGuide(true)} 
                          className='text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium'
                        >
                          Change Internal Guide
                        </button>
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        <select 
                          className='w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition' 
                          value={pendingInternalGuide} 
                          onChange={e => { setPendingInternalGuide(e.target.value); if(e.target.value) setChangingGuide(false) }}
                        >
                          <option value=''>Select Internal Guide</option>
                          {availableGuidesModal.filter(g=> g.department===project.department).map(g => (
                            <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}{g.role==='hod'?' (HOD)':''}</option>
                          ))}
                        </select>
                        {changingGuide && (
                          <button 
                            onClick={() => setChangingGuide(false)} 
                            className='text-xs text-gray-500 hover:underline font-medium'
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                    {pendingInternalGuide !== (project.internalGuide?._id || '') && (
                      <p className='text-[10px] text-amber-600 dark:text-amber-400 mt-1'>⚠ Unsaved — click Save to apply</p>
                    )}
                  </div>
                  <div className='grid sm:grid-cols-2 gap-2'>
                    <div>
                      <label className='text-[11px] text-gray-500 font-medium mb-1 block'>External Name</label>
                      <input value={externalGuideName} onChange={e=>setExternalGuideName(e.target.value)} placeholder='Name' className='w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition'/>
                    </div>
                    <div>
                      <label className='text-[11px] text-gray-500 font-medium mb-1 block'>External Email</label>
                      <input value={externalGuideEmail} onChange={e=>setExternalGuideEmail(e.target.value)} placeholder='Email' className='w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition'/>
                    </div>
                  </div>
                  {(externalGuideName !== (project.externalGuide?.name || '') || externalGuideEmail !== (project.externalGuide?.email || '')) && (
                    <p className='text-[10px] text-amber-600 dark:text-amber-400'>⚠ Unsaved — click Save to apply</p>
                  )}
                </div>
              )}
              
              {/* Progress */}
              <div className='p-4 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-3'>
                <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2'>
                  <TrendingUp className='w-3.5 h-3.5' /> Progress Score
                  <span className='text-[9px] text-gray-400 font-normal normal-case'>(Auto-calculated from graded reports)</span>
                </h4>
                <div className='flex items-center gap-4'>
                  <div className='flex-1'>
                    <div className='w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                      <div className={`h-full transition-all duration-700 rounded-full ${
                        avgProgress >= 8 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                        avgProgress >= 5 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                        'bg-gradient-to-r from-red-400 to-rose-500'
                      }`} style={{ width: `${avgProgressPct}%` }} />
                    </div>
                  </div>
                  <span className='text-lg font-bold text-gray-700 dark:text-gray-200 min-w-[48px] text-center'>{avgProgress}<span className='text-sm text-gray-400'>/10</span></span>
                </div>
                <p className='text-[10px] text-gray-400'>{gradedReports.length} report{gradedReports.length !== 1 ? 's' : ''} graded</p>
              </div>
            </div>
          )}
          
          {tab === 'manage' && !canManage && !isGuide && !isProjectCoordinator && (
            <div className='text-center py-12 text-gray-400'>
              <Sliders className='w-8 h-8 mx-auto mb-2 opacity-50' />
              <p className='text-sm'>You do not have permission to manage this project.</p>
            </div>
          )}

          {tab === 'reports' && (
            <div className='space-y-5'>
              {/* Monthly Reports List */}
              <div className='space-y-3'>
                <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2'>
                  <FileText className='w-3.5 h-3.5' /> Monthly Reports
                </h4>
                {(() => {
                  // For guides: only show turned-in reports; for others: show all
                  const visibleReports = isGuide
                    ? (project.monthlyReports || []).filter(r => r.turnedIn)
                    : (project.monthlyReports || [])
                  return visibleReports.length > 0 ? (
                  <div className='space-y-2'>
                    {[...visibleReports].sort((a,b) => (b.year - a.year) || (b.month - a.month)).map(r => {
                      const statusColors = { draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', graded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', 'revision-needed': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
                      return (
                        <div key={r._id} className='p-4 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:shadow-sm transition-shadow'>
                          <div className='flex flex-wrap items-center gap-3'>
                            <div className='flex items-center gap-3 flex-1 min-w-0'>
                              <div className={`w-10 h-10 rounded flex-shrink-0 flex items-center justify-center ${r.status === 'draft' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                                <FileText className={`w-5 h-5 ${r.status === 'draft' ? 'text-gray-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                              </div>
                              <div className='min-w-0'>
                                <p className='font-semibold text-sm text-gray-900 dark:text-white truncate'>{r.title}</p>
                                <p className='text-[11px] text-gray-500'>{monthNamesShort[r.month]} {r.year}{r.turnedIn ? ` • Turned in ${new Date(r.turnedInAt || r.submittedAt).toLocaleDateString()}` : ` • Draft ${new Date(r.submittedAt).toLocaleDateString()}`}</p>
                              </div>
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${statusColors[r.status] || ''}`}>
                                {r.status === 'graded' ? (isMember ? 'Graded' : `${r.score}/10`) : r.status === 'draft' ? 'Draft' : r.status}
                              </span>
                              {/* Student: Turn In button for drafts */}
                              {isMember && r.status === 'draft' && !r.turnedIn && (
                                <button onClick={() => turnInReport(r._id)} disabled={turningIn}
                                  className='inline-flex items-center gap-1 px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition disabled:opacity-50'>
                                  {turningIn ? <div className='w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin' /> : <Send className='w-3 h-3' />} Turn In
                                </button>
                              )}
                              {/* Guide: Grade button for turned-in reports */}
                              {(isGuide && r.turnedIn && r.status === 'submitted') && (
                                <button onClick={() => { setGradingReport(r); setGradeScore(r.score || 0); setGradeFeedback(r.feedback || ''); setCriteriaScores({}); setPdfLoadError(false) }}
                                  className='inline-flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition'>
                                  <Star className='w-3 h-3' /> Grade
                                </button>
                              )}
                              {/* Guide: Re-grade button for already graded */}
                              {(isGuide && r.status === 'graded') && (
                                <button onClick={() => { setGradingReport(r); setGradeScore(r.score || 0); setGradeFeedback(r.feedback || ''); setCriteriaScores({}); setPdfLoadError(false) }}
                                  className='inline-flex items-center gap-1 px-3 py-1.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/30 transition'>
                                  <Star className='w-3 h-3' /> Re-grade
                                </button>
                              )}
                              {/* View PDF — anyone can view turned-in reports; students can view own drafts */}
                              {r.pdfUrl && (r.turnedIn || isMember) && (
                                <button onClick={() => { setGradingReport(r); setPdfLoadError(false); setCriteriaScores({}) }}
                                  className='inline-flex items-center gap-1 px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition'>
                                  <Eye className='w-3 h-3' /> View PDF
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Grade display — hidden from students */}
                          {r.status === 'graded' && r.score !== undefined && !isMember && (
                            <div className='mt-3 p-2.5 rounded bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2'>
                              <Star className='w-3 h-3 flex-shrink-0' />
                              <span><span className='font-semibold'>Grade: {r.score}/10</span>{r.grade ? ` (${r.grade})` : ''}</span>
                            </div>
                          )}
                          {r.feedback && !isMember && (
                            <div className='mt-2 p-2.5 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-[11px] text-green-700 dark:text-green-300 flex items-start gap-1.5'>
                              <MessageSquare className='w-3 h-3 mt-0.5 flex-shrink-0' />
                              <div><span className='font-semibold'>Feedback:</span> {r.feedback}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className='text-center py-10 text-gray-400'>
                    <FileText className='w-8 h-8 mx-auto mb-2 opacity-50' />
                    <p className='text-sm'>{isGuide ? 'No reports turned in yet.' : 'No reports submitted yet.'}</p>
                  </div>
                )
                })()}
              </div>

              {/* Overall Grade Summary — hidden from students */}
              {!isMember && gradedReports.length > 0 && (
                <div className='p-4 rounded bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800'>
                  <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3'>Overall Progress</h4>
                  <div className='flex items-center gap-4'>
                    <div className='flex-1'>
                      <div className='w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                        <div className={`h-full transition-all duration-700 rounded-full ${
                          avgProgress >= 8 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          avgProgress >= 5 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                          'bg-gradient-to-r from-red-400 to-rose-500'
                        }`} style={{ width: `${avgProgressPct}%` }} />
                      </div>
                    </div>
                    <span className='text-lg font-bold text-gray-700 dark:text-gray-200'>{avgProgress}<span className='text-sm text-gray-400'>/10</span></span>
                  </div>
                  <p className='text-[10px] text-gray-500 mt-1'>Average across {gradedReports.length} graded report{gradedReports.length !== 1 ? 's' : ''}</p>
                </div>
              )}

              {/* Student: Submit/Replace Report */}
              {isMember && (
                <div className='space-y-3 border-t border-gray-200 dark:border-gray-700 pt-5'>

                  {/* Status messages */}
                  {isTurnedIn && (
                    <div className='p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-[12px] text-green-700 dark:text-green-300 flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 flex-shrink-0' />
                      Report for {monthNames[currentMonth]} {currentYear} has been turned in. {currentMonthReport?.status === 'graded' ? 'Graded by guide.' : 'Awaiting grade from guide.'}
                    </div>
                  )}
                  {alreadySubmittedThisMonth && !isTurnedIn && (
                    <div className='p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-700 dark:text-amber-300 flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 flex-shrink-0' />
                      Draft uploaded for {monthNames[currentMonth]} {currentYear}. You can replace the file or turn it in.
                    </div>
                  )}

                  {/* Upload/Replace button */}
                  {canSubmitReport && (
                    <button onClick={()=>setAddingReport(a=>!a)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition ${addingReport ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {addingReport ? <><XIcon className='w-3 h-3' /> Cancel</> : currentMonthReport && !isTurnedIn ? <><Upload className='w-3 h-3' /> Replace Report for {monthNamesShort[currentMonth]} {currentYear}</> : <><Plus className='w-3 h-3' /> Submit Report for {monthNamesShort[currentMonth]} {currentYear}</>}
                    </button>
                  )}
                  {addingReport && canSubmitReport && (
                    <div className='p-4 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3'>
                      <div className='p-2.5 rounded bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-[12px] text-indigo-700 dark:text-indigo-300 font-medium'>
                        {currentMonthReport && !isTurnedIn ? `Replacing report for: ${monthNames[currentMonth]} ${currentYear}` : `Submitting for: ${monthNames[currentMonth]} ${currentYear}`}
                      </div>
                      <div>
                        <label className='text-[11px] text-gray-500 font-medium mb-1 block'>Report Title</label>
                        <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder='e.g. Monthly Progress Report - February'
                          className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none' />
                      </div>
                      <div>
                        <label className='text-[11px] text-gray-500 font-medium mb-1 block'>Upload PDF <span className='text-gray-400'>(only .pdf files, max 10MB)</span></label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative border border-dashed rounded p-6 text-center cursor-pointer transition-all ${reportFile ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'}`}
                        >
                          <input ref={fileInputRef} type='file' accept='.pdf,application/pdf' className='hidden'
                            onChange={e => { const f = e.target.files[0]; if (f) { if (f.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); e.target.value = ''; return } setReportFile(f) } }} />
                          {reportFile ? (
                            <div className='flex items-center justify-center gap-2'>
                              <CheckCircle2 className='w-5 h-5 text-green-600' />
                              <span className='text-sm font-medium text-green-700 dark:text-green-300'>{reportFile.name}</span>
                              <span className='text-[10px] text-gray-400'>({(reportFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                          ) : (
                            <div>
                              <Upload className='w-8 h-8 mx-auto mb-2 text-gray-400' />
                              <p className='text-sm text-gray-500'>Click to select PDF file</p>
                              <p className='text-[10px] text-gray-400 mt-1'>Only .pdf files • Max size: 10MB</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={addReport} disabled={uploading || !reportFile || !reportTitle.trim()}
                        className='w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed'>
                        {uploading ? (
                          <><div className='w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin' /> Uploading...</>
                        ) : (
                          <><Upload className='w-4 h-4' /> {currentMonthReport && !isTurnedIn ? 'Replace File' : 'Upload Report'}</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Guide: Submission Status */}
              {isGuide && (
                <div className='space-y-3 border-t border-gray-200 dark:border-gray-700 pt-5'>
                  <h4 className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2'>
                    <Calendar className='w-3.5 h-3.5' /> Submission Status — {monthNamesShort[currentMonth]} {currentYear}
                  </h4>
                  {(() => {
                    const turnedInThisMonth = (project.monthlyReports||[]).find(r => r.month===currentMonth && r.year===currentYear && r.turnedIn)
                    return turnedInThisMonth ? (
                    <div className='p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-[12px] text-green-700 dark:text-green-300 flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 flex-shrink-0' />
                      <span>Report for {monthNames[currentMonth]} turned in on {new Date(turnedInThisMonth.turnedInAt || turnedInThisMonth.submittedAt).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className='p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-700 dark:text-amber-300 flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 flex-shrink-0' />
                      <span>Not yet turned in for {monthNames[currentMonth]} {currentYear}</span>
                    </div>
                  )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Report Viewer + Rubric + Grading Overlay */}
          {gradingReport && (
            <div className='fixed inset-0 z-[70] flex bg-black/70 backdrop-blur-sm' onClick={() => { setGradingReport(null); setPdfLoadError(false) }}>
              <div className='flex w-full h-full' onClick={e => e.stopPropagation()}>
                {/* PDF Viewer - Left side */}
                <div className='flex-1 flex flex-col bg-gray-900'>
                  <div className='flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700'>
                    <div className='flex items-center gap-3'>
                      <FileText className='w-4 h-4 text-indigo-400' />
                      <span className='text-sm font-medium text-white'>{gradingReport.title}</span>
                      <span className='text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-300'>
                        {monthNamesShort[gradingReport.month]} {gradingReport.year}
                      </span>
                      {gradingReport.status === 'graded' && !isMember && (
                        <span className='text-[10px] px-2 py-0.5 rounded bg-green-700 text-green-200 font-semibold'>
                          Graded: {gradingReport.score}/10
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      {(() => {
                        // Convert /uploads/reports/filename.pdf → /api/reports/pdf?file=filename.pdf
                        const pdfApiUrl = gradingReport.pdfUrl?.startsWith('/uploads/reports/')
                          ? `/api/reports/pdf?file=${gradingReport.pdfUrl.split('/').pop()}`
                          : gradingReport.pdfUrl
                        return (
                          <>
                          <a href={pdfApiUrl} target='_blank' rel='noopener noreferrer'
                            className='p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition' title='Open in new tab'>
                            <ExternalLink className='w-4 h-4' />
                          </a>
                          </>
                        )
                      })()}
                      <button onClick={() => { setGradingReport(null); setPdfLoadError(false) }} className='p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition'>
                        <XIcon className='w-5 h-5' />
                      </button>
                    </div>
                  </div>
                  <div className='flex-1 relative'>
                    {(() => {
                      const pdfApiUrl = gradingReport.pdfUrl?.startsWith('/uploads/reports/')
                        ? `/api/reports/pdf?file=${gradingReport.pdfUrl.split('/').pop()}`
                        : gradingReport.pdfUrl
                      return (
                        <>
                        {/* Toggle between direct embed and Google Docs viewer */}
                        <div className='absolute top-2 right-2 z-10 flex items-center gap-1'>
                          <button onClick={() => setPdfLoadError(prev => !prev)}
                            className='px-2 py-1 rounded text-[10px] font-medium bg-gray-800/80 text-gray-300 hover:bg-gray-700 backdrop-blur-sm transition' title='Switch viewer'>
                            {pdfLoadError ? 'Native Viewer' : 'Alt Viewer'}
                          </button>
                          <a href={pdfApiUrl} download
                            className='px-2 py-1 rounded text-[10px] font-medium bg-gray-800/80 text-gray-300 hover:bg-gray-700 backdrop-blur-sm transition' title='Download PDF'>
                            <Download className='w-3 h-3 inline' /> PDF
                          </a>
                        </div>
                        {!pdfLoadError ? (
                          <embed
                            src={pdfApiUrl}
                            type='application/pdf'
                            className='w-full h-full border-0'
                            title='Report PDF'
                            style={{ minHeight: '80vh' }}
                          />
                        ) : (
                          <iframe
                            src={pdfApiUrl}
                            className='w-full h-full border-0'
                            title='Report PDF'
                            style={{ minHeight: '80vh' }}
                            allowFullScreen
                          />
                        )}
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Rubric + Grading - Right sidebar (hidden from students) */}
                {!isMember && (
                <div className='w-[400px] flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto'>
                  <div className='px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'>
                    <h3 className='text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                      {isGuide ? <><Star className='w-4 h-4 text-amber-500' /> Evaluate Report</> : <><BookOpen className='w-4 h-4 text-indigo-500' /> Report Details &amp; Rubric</>}
                    </h3>
                    <p className='text-[11px] text-gray-500 dark:text-gray-400 mt-0.5'>
                      {isGuide ? 'Grade this report using the rubric criteria below' : 'View rubric criteria and grading details'}
                    </p>
                  </div>

                  <div className='flex-1 p-5 space-y-5'>
                    {/* Report Info */}
                    <div className='p-3 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <span className='text-[11px] text-gray-500'>Status</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          gradingReport.status === 'graded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          gradingReport.status === 'submitted' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>{gradingReport.status}</span>
                      </div>
                      {gradingReport.status === 'graded' && gradingReport.score != null && !isMember && (
                        <div className='flex items-center justify-between'>
                          <span className='text-[11px] text-gray-500'>Current Score</span>
                          <span className='text-sm font-bold text-green-600 dark:text-green-400'>{gradingReport.score}/10</span>
                        </div>
                      )}
                      <div className='flex items-center justify-between'>
                        <span className='text-[11px] text-gray-500'>Submitted</span>
                        <span className='text-[11px] font-medium text-gray-700 dark:text-gray-300'>{new Date(gradingReport.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Existing Feedback Display (for HOD/admin only, not students) */}
                    {gradingReport.feedback && !isGuide && !isMember && (
                      <div className='p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'>
                        <p className='text-[11px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-1.5 flex items-center gap-1.5'>
                          <MessageSquare className='w-3 h-3' /> Guide Feedback
                        </p>
                        <p className='text-[12px] text-green-700 dark:text-green-300'>{gradingReport.feedback}</p>
                      </div>
                    )}

                    {/* Rubric Selection — guides only */}
                    {!isMember && rubrics.length > 0 && (
                      <div>
                        <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block'>Rubric</label>
                        <select value={selectedRubric?._id || ''} onChange={e => { const r = rubrics.find(r => r._id === e.target.value); setSelectedRubric(r || null); setCriteriaScores({}) }}
                          className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none'>
                          <option value=''>Select rubric...</option>
                          {rubrics.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Rubric Criteria with Per-Criteria Scoring — guides only */}
                    {!isMember && selectedRubric && (
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <p className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400'>Evaluation Criteria</p>
                          {isGuide && selectedRubric.criteria?.length > 0 && (
                            <span className='text-[11px] font-bold text-indigo-600 dark:text-indigo-400'>
                              {selectedRubric.criteria.reduce((s,c)=>s+(criteriaScores[c._id]||0),0)}
                              <span className='text-gray-400 font-normal'>/{selectedRubric.criteria.reduce((s,c)=>s+(c.maxScore||10),0)} pts</span>
                            </span>
                          )}
                        </div>
                        <div className='space-y-2'>
                          {selectedRubric.criteria.map((c, i) => {
                            const score = criteriaScores[c._id] ?? ''
                            const filled = score !== '' && Number(score) > 0
                            return (
                            <div key={c._id || i} className='p-3 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800'>
                              <div className='flex items-center justify-between mb-1'>
                                <span className='text-[12px] font-semibold text-gray-800 dark:text-gray-200 flex-1 pr-2'>{i+1}. {c.name}</span>
                                {isGuide ? (
                                  <div className='flex items-center gap-1.5 flex-shrink-0'>
                                    <input
                                      type='number' min='0' max={c.maxScore} step='1'
                                      value={score}
                                      placeholder='0'
                                      onChange={e => {
                                        const v = e.target.value === '' ? '' : Math.max(0, Math.min(c.maxScore, Math.round(Number(e.target.value))))
                                        setCriteriaScores(prev => ({ ...prev, [c._id]: v }))
                                      }}
                                      onBlur={e => {
                                        if (e.target.value === '') setCriteriaScores(prev => ({ ...prev, [c._id]: 0 }))
                                      }}
                                      className={`w-16 px-2 py-1.5 border rounded text-sm text-center font-bold bg-white dark:bg-gray-800 outline-none transition-colors ${
                                        filled
                                          ? 'border-indigo-500 text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500'
                                          : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400'
                                      }`}
                                    />
                                    <span className='text-[11px] text-gray-400 font-medium'>/{c.maxScore}</span>
                                  </div>
                                ) : (
                                  <span className='text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded'>Max {c.maxScore}</span>
                                )}
                              </div>
                              {c.description && <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-1'>{c.description}</p>}
                              {/* Progress bar for filled score */}
                              {isGuide && score !== '' && (
                                <div className='mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                                  <div
                                    className={`h-full rounded-full transition-all duration-200 ${Number(score)/c.maxScore >= 0.7 ? 'bg-green-500' : Number(score)/c.maxScore >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${Math.min(100, (Number(score)/(c.maxScore||10))*100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      </div>
                    )}

                    {/* No rubrics message — guides only */}
                    {!isMember && rubrics.length === 0 && (
                      <div className='p-4 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-700 dark:text-amber-300 flex items-start gap-2'>
                        <AlertTriangle className='w-4 h-4 mt-0.5 flex-shrink-0' />
                        <div>{isGuide ? 'No rubrics defined for this department. You can still grade manually below. Ask your HOD to create rubrics from Settings.' : 'No rubrics have been defined for this department yet.'}</div>
                      </div>
                    )}

                    {/* Total Score Display (for all) */}
                    {isGuide && (
                      <div className='p-4 rounded bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800'>
                        <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block'>
                          Total Score (out of 10)
                          {selectedRubric?.criteria?.length > 0 && <span className='ml-1.5 text-[10px] text-indigo-400 normal-case font-normal'>auto-calculated from criteria</span>}
                        </label>
                        {selectedRubric?.criteria?.length > 0 ? (
                          /* Auto mode: show big number computed from criteria */
                          <div className='flex items-center gap-4'>
                            <div className='flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                              <div className={`h-full rounded-full transition-all duration-300 ${gradeScore >= 7 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : gradeScore >= 4 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} style={{ width: `${(gradeScore/10)*100}%` }} />
                            </div>
                            <span className={`text-3xl font-black tabular-nums w-20 text-right ${gradeScore >= 7 ? 'text-green-600 dark:text-green-400' : gradeScore >= 4 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                              {gradeScore}<span className='text-sm font-normal text-gray-400'>/10</span>
                            </span>
                          </div>
                        ) : (
                          /* Manual mode: slider + input when no rubric */
                          <div className='flex items-center gap-3'>
                            <input type='range' min='0' max='10' step='1' value={gradeScore} onChange={e => setGradeScore(Number(e.target.value))}
                              className='flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded appearance-none cursor-pointer accent-indigo-600' />
                            <input type='number' min='0' max='10' step='1' value={gradeScore}
                              onChange={e => setGradeScore(Math.max(0, Math.min(10, Math.round(Number(e.target.value)))))}
                              className='w-16 px-2 py-1.5 border border-indigo-400 rounded text-center text-xl font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none' />
                            <span className='text-sm text-gray-400 font-medium'>/10</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback */}
                    {isGuide && (
                      <div>
                        <label className='text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block'>Feedback</label>
                        <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={3} placeholder='Write your feedback for the student...'
                          className='w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none' />
                      </div>
                    )}
                  </div>

                  {/* Submit Grade Button (guides only) */}
                  {isGuide && (
                    <div className='px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
                      <button onClick={submitGrade} disabled={grading || gradeScore === 0}
                        className='w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50'>
                        {grading ? (
                          <><div className='w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin' /> Saving...</>
                        ) : (
                          <><CheckCircle2 className='w-4 h-4' /> {gradingReport.status === 'graded' ? 'Update Grade' : 'Submit Grade'}</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Close button for non-guide users */}
                  {!isGuide && (
                    <div className='px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
                      <button onClick={() => { setGradingReport(null); setPdfLoadError(false) }}
                        className='w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700 transition'>
                        <XIcon className='w-4 h-4' /> Close
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          )}
          
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className='px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3'>
          <button 
            onClick={close} 
            className='inline-flex items-center gap-2 px-5 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition'
          >
            <XIcon className='w-4 h-4' /> Close
          </button>
          {canManage && (
            <button 
              onClick={saveManageChanges} 
              disabled={saving || !hasGuideChanges}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold transition ${hasGuideChanges ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}
            >
              {saving ? (
                <><div className='w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin' /> Saving...</>
              ) : (
                <><CheckCircle2 className='w-4 h-4' /> Save</>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Member Detail Overlay */}
      {memberView && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4' onClick={()=>setMemberView(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className='w-full max-w-md bg-white dark:bg-gray-900 rounded shadow-sm overflow-hidden'
            onClick={e => e.stopPropagation()}
          >
            <div className='bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-lg'>
                    {(memberView.student.academicInfo?.name || memberView.student.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className='font-bold'>{memberView.student.academicInfo?.name || memberView.student.email}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      memberView.role === 'leader' ? 'bg-amber-400/30' : 'bg-white/20'
                    }`}>{memberView.role}</span>
                  </div>
                </div>
                <button onClick={()=>setMemberView(null)} className='p-1.5 rounded hover:bg-white/20 transition'>
                  <XIcon className='w-4 h-4' />
                </button>
              </div>
            </div>
            <div className='p-5 space-y-3 text-sm'>
              {[
                { label: 'Email', value: memberView.student.email },
                { label: 'Department', value: memberView.student.department },
                { label: 'Institute', value: memberView.student.institute },
                { label: 'University', value: memberView.student.university },
                { label: 'Admission Year', value: memberView.student.admissionYear },
                { label: 'Role in Project', value: memberView.role },
              ].map(item => (
                <div key={item.label} className='flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0'>
                  <span className='text-gray-500 dark:text-gray-400 text-[12px] font-medium'>{item.label}</span>
                  <span className='font-semibold text-gray-900 dark:text-white text-[12px]'>{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}


    </div>
  )
}
