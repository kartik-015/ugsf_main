"use client"

import { useState, useEffect, useCallback } from 'react'
import { PROJECT_DOMAINS } from '@/lib/domains'
import { wordCount, semicolonListValid } from '@/lib/clientValidation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ProjectsPage(){
  const { data: session } = useSession()
  const isStudent = session?.user?.role==='student'
  const isHod = session?.user?.role==='hod'
  const isAdmin = session?.user?.role==='admin'

  // Student view state
  const [studentView, setStudentView] = useState('all') // 'create', 'all', 'mine'
  
  // Enhanced member search
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Data
  const [projects, setProjects] = useState([])
  const [mine, setMine] = useState([])
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Filters (exclusive chip style like students/guides pages)
  const [university, setUniversity] = useState('')
  const [institute, setInstitute] = useState('')
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
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'domain', label: 'Domain' },
    { key: 'internal', label: 'Internal Guide' },
    { key: 'external', label: 'External Guide' },
    { key: 'progress', label: 'Progress' },
    { key: 'status', label: 'HOD Status' },
    { key: 'description', label: 'Description' },
    { key: 'members', label: 'Members Count' }
  ]
  const [visibleFields, setVisibleFields] = useState(['department','semester','domain','internal','status','progress','members'])
  const toggleField = key => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])
  const toggleExclusive = (current,setter,val)=> setter(current===val?'':val)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', domain:'', department:'', semester:1 })

  // Selection modal
  const [selected, setSelected] = useState(null)
  const [addingMember, setAddingMember] = useState('')
  const [modalTab, setModalTab] = useState('overview')

  // Static option sets with HOD filtering
  const universities = ['CHARUSAT','Others']
  const institutes = isHod 
    ? [session?.user?.academicInfo?.institute].filter(Boolean) // HOD sees only their institute
    : ['CSPIT','DEPSTAR','Others'] // Admin sees all institutes
  const departmentsList = isHod 
    ? [session?.user?.academicInfo?.department].filter(Boolean) // HOD sees only their department
    : ['CSE','CE','IT'] // Admin sees all departments
  const semesters = ['1','2','3','4','5','6','7','8']
  const statuses = ['submitted','under-review','approved','rejected']

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
          const my = list.filter(p=> p.members.some(m=> String(m.student?._id||m.student)===String(session.user.id)))
          setMine(my)
          console.log('👨‍🎓 Student projects filtered:', my.length)
        }
      } else {
        console.error('❌ Failed to load projects:', res.status)
      }
    } finally { setLoading(false) }
  },[isStudent, isAdmin, session?.user?.id, session?.user?.role, session?.user?.email])

  const loadGuides = useCallback(async ()=>{
    if(!isHod) return
    const res = await fetch('/api/guides')
    if(res.ok){ const data = await res.json(); setGuides(data.guides||data.faculty||[]) }
  },[isHod])

  useEffect(()=>{ loadProjects(); loadGuides() },[loadProjects, loadGuides])

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

  // Debounced search using useCallback and useRef for timeout
  const searchTimeoutRef = useCallback(() => {
    let timeoutId = null
    return (query) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => searchMembers(query), 300)
    }
  }, [])()

  const debouncedSearch = searchTimeoutRef

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
        toast.success(`✅ Added ${student.studentId} - ${student.name}`)
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
    setForm({ title: '', description: '', domain: '', department: '', semester: 1 })
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
  const formValid = form.title.trim() && form.domain && descWords<=200

  const submitProject = async () => {
    try {
      const payload = { ...form }
      if(!payload.department) payload.department = session?.user?.academicInfo?.department
      if(payload.department) payload.department = payload.department.toUpperCase()
      
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
      
      if(payload.domain && !PROJECT_DOMAINS.includes(payload.domain)) {
        toast.error('Select a valid domain from list')
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
    if(res.ok){ toast.success('Guide updated'); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Error') }
  }
  const addMember = async (projectId) => {
    if(!addingMember) return toast.error('Enter student email or id')
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, addMember: addingMember }) })
    if(res.ok){ toast.success('Member added'); setAddingMember(''); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Failed') }
  }
  const removeMember = async (projectId, memberId) => {
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, removeMember: memberId }) })
    if(res.ok){ toast.success('Removed'); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Failed') }
  }

  // Derived lists with HOD filtering
  let base = projects
  if (isStudent) {
    base = studentView === 'mine' ? mine : projects
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
        const hodDepartment = session?.user?.academicInfo?.department
        const hodInstitute = session?.user?.academicInfo?.institute
        const matchesDepartment = hodDepartment ? g.department === hodDepartment : true
        const matchesInstitute = hodInstitute ? g.academicInfo?.institute === hodInstitute : true
        return matchesDepartment && matchesInstitute
      })
    : guides
  
  const domainsAll = Array.from(new Set(base.map(p=>p.domain).filter(Boolean)))
  const filtered = base.filter(p => !university || p.leader?.university===university)
    .filter(p => !institute || p.leader?.institute===institute)
    .filter(p => !department || p.department===department)
    .filter(p => !semester || String(p.semester)===semester)
    .filter(p => !status || p.status===status)
    .filter(p => !domain || p.domain===domain)
    .filter(p => !guide || (p.internalGuide && String(p.internalGuide._id)===guide))
    .filter(p => !search || (p.title||'').toLowerCase().includes(search.toLowerCase()))

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
  }, [university, institute, department, semester, status, domain, guide, search])

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
      <div className='flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6'>
        <div className='flex justify-between flex-1 sm:hidden'>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className='relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className='relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Next
          </button>
        </div>
        <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-gray-700 dark:text-gray-300'>
              Showing <span className='font-medium'>{startIndex + 1}</span> to <span className='font-medium'>{Math.min(endIndex, totalItems)}</span> of{' '}
              <span className='font-medium'>{totalItems}</span> results
            </p>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className='px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
          <div>
            <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px' aria-label='Pagination'>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Previous
              </button>
              
              {startPage > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className='relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  >
                    1
                  </button>
                  {startPage > 2 && (
                    <span className='relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300'>
                      ...
                    </span>
                  )}
                </>
              )}
              
              {pages.map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    currentPage === page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && (
                    <span className='relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300'>
                      ...
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className='relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  >
                    {totalPages}
                  </button>
                </>
              )}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className='relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    )
  }

  const submitFilters = e => { e.preventDefault(); setSubmitted(true) }
  const resetFilters = () => { 
    setUniversity(''); 
    setInstitute(''); 
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

  // Export functionality
  const exportToCSV = () => {
    const headers = ['Title', 'Group ID', 'Leader', 'Department', 'Semester', 'Domain', 'HOD Status', 'Progress', 'Members Count']
    const rows = sortedFiltered.map(p => [
      p.title || '',
      p.groupId || '',
      p.leader?.academicInfo?.name || p.leader?.email || '',
      p.department || '',
      p.semester || '',
      p.domain || '',
      p.hodApproval || 'pending',
      p.progressScore || 0,
      p.members?.length || 0
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
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

  return (
    <div className='space-y-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Projects</h1>
        <p className='text-gray-600 dark:text-gray-300 mt-1'>{isAdmin? 'Manage project groups':'Project groups'}</p>
      </div>

      {/* Student View Controls */}
      {isStudent && (
        <div className='card p-4 mb-4'>
          <div className='flex flex-wrap gap-3'>
            <button 
              onClick={openCreateModal} 
              className='px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105'
            >
              ✨ Create Group Project
            </button>
            <button 
              onClick={()=>setStudentView('all')} 
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                studentView === 'all' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🔍 See All Projects
            </button>
            <button 
              onClick={()=>setStudentView('mine')} 
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                studentView === 'mine' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📁 See My Projects
            </button>
          </div>
        </div>
      )}

      {/* Filters - Only for Admin/HOD/Guide users */}
      {!isStudent && (
        <form onSubmit={submitFilters} className='card p-6 mb-6 space-y-6'>
          <div className={`${isAdmin ? 'space-y-6' : 'space-y-6'}`}>
            {/* Row 1: University, Institute, Department */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='w-full'>
                <FilterGroup title='UNIVERSITY' options={universities} value={university} onSelect={v=>toggleExclusive(university,setUniversity,v)} />
              </div>
              <div className='w-full'>
                <FilterGroup title='INSTITUTE' options={institutes} value={institute} onSelect={v=>toggleExclusive(institute,setInstitute,v)} />
              </div>
              <div className='w-full'>
                <FilterGroup title='DEPARTMENT' options={departmentsList} value={department} onSelect={v=>toggleExclusive(department,setDepartment,v)} />
              </div>
            </div>
            
            {/* Row 2: Semester and Status */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'>
                <FilterGroup title='SEMESTER' options={semesters} value={semester} onSelect={v=>toggleExclusive(semester,setSemester,v)} />
              </div>
              <div className='w-full'>
                <FilterGroup title='STATUS' options={statuses} value={status} onSelect={v=>toggleExclusive(status,setStatus,v)} />
              </div>
            </div>
            
            {/* Row 3: Guide, Domain, and Search */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Guide</p>
                <select value={guide} onChange={e=>setGuide(e.target.value)} className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-700 dark:text-gray-300 font-semibold'>
                  <option value=''>All</option>
                  {availableGuides.filter(g=> !department || g.department===department).map(g=> <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}</option>)}
                </select>
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Domain</p>
                <select value={domain} onChange={e=>setDomain(e.target.value)} className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-700 dark:text-gray-300 font-semibold'>
                  <option value=''>All Domains</option>
                  {domainsAll.map(d=> <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Projects</p>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Title...' className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200'/>
              </div>
            </div>
          </div>
        <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
        <div className='flex items-center gap-2'>
          <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors'>Apply</button>
          <button type='button' onClick={resetFilters} className='px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors'>Reset</button>
          {sortedFiltered.length > 0 && (
            <button 
              type='button' 
              onClick={exportToCSV} 
              className='px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2'
            >
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z' clipRule='evenodd'></path>
              </svg>
              Export
            </button>
          )}
          <div className='ml-auto text-sm text-gray-600'>{submitted ? `${sortedFiltered.length} result(s)` : 'No results yet'}</div>
        </div>
      </form>
      )}

      {!isStudent && !submitted ? (
        <div className='text-center py-12 text-gray-500'>Use the filters above and click Apply.</div>
      ) : isStudent ? (
        <div className='grid gap-6'>
          {(studentView === 'mine' ? mine : projects).length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              {studentView === 'mine' ? 'You are not part of any projects yet.' : 'No projects available.'}
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {(studentView === 'mine' ? mine : projects).map(p => (
                <motion.div key={p._id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className='card p-5 flex flex-col group relative'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex flex-col gap-1'>
                      <div className='font-semibold text-lg flex items-center gap-2'>
                        <span>{p.title}</span>
                        <span className='text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100'>{p.groupId}</span>
                      </div>
                      <div className='text-[12px] text-gray-600 dark:text-gray-400'>Leader: {p.leader?.academicInfo?.name || p.leader?.email?.split('@')[0]}</div>
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <StatusBadge status={p.status} />
                      <div className='flex items-center gap-2 text-[10px] font-medium'>
                        <span className='px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700'>{p.progressScore ?? 0}/10</span>
                        <div className='h-1.5 w-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden'>
                          <div className='h-full bg-blue-600' style={{ width: `${(p.progressScore||0)*10}%` }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-3 text-[11px] mt-3'>
                    <div><strong>Domain:</strong> {p.domain}</div>
                    <div><strong>Department:</strong> {p.department}</div>
                    <div><strong>Semester:</strong> {p.semester}</div>
                    <div><strong>Members:</strong> {p.members?.length || 0}</div>
                  </div>
                  {p.description && (
                    <div className='text-[12px] text-gray-600 dark:text-gray-400 mt-3 line-clamp-2'>
                      {p.description}
                    </div>
                  )}
                  <button onClick={() => setSelected(p)} className='w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
                    View Details
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className='text-center py-12 text-gray-500'>Loading...</div>
      ) : (
        <div className='space-y-6'>
          {sortedFiltered.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>No projects match filters.</div>
          ) : (
            <>
              {/* Results summary */}
              <div className='flex justify-between items-center'>
                <div className='text-sm text-gray-600 dark:text-gray-400'>
                  Showing {sortedFiltered.length} project{sortedFiltered.length !== 1 ? 's' : ''}
                  {sortField && <span className='ml-2 text-blue-600'>• Sorted by {sortField} ({sortDirection})</span>}
                </div>
                <div className='flex gap-2 text-xs'>
                  <span className='px-2 py-1 bg-green-100 text-green-700 rounded'>✓ Approved: {sortedFiltered.filter(p => p.hodApproval === 'approved').length}</span>
                  <span className='px-2 py-1 bg-orange-100 text-orange-700 rounded'>⏳ Pending: {sortedFiltered.filter(p => p.hodApproval === 'pending' || !p.hodApproval).length}</span>
                  <span className='px-2 py-1 bg-red-100 text-red-700 rounded'>✗ Rejected: {sortedFiltered.filter(p => p.hodApproval === 'rejected').length}</span>
                </div>
              </div>
              
              {/* Enhanced table */}
              <div className='card p-0 overflow-hidden shadow-lg'>
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[1000px]'>
                    <thead className='bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
                      <tr>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                          <button 
                            onClick={() => handleSort('title')}
                            className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                          >
                            📋 Project Details
                            <SortIcon field='title' />
                          </button>
                        </th>
                        {visibleFields.includes('department') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            <button 
                              onClick={() => handleSort('department')}
                              className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                            >
                              🏢 Department
                              <SortIcon field='department' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('semester') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            <button 
                              onClick={() => handleSort('semester')}
                              className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                            >
                              📚 Semester
                              <SortIcon field='semester' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('domain') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            <button 
                              onClick={() => handleSort('domain')}
                              className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                            >
                              🎯 Domain
                              <SortIcon field='domain' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('internal') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            👨‍🏫 Internal Guide
                          </th>
                        )}
                        {visibleFields.includes('external') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            👩‍💼 External Guide
                          </th>
                        )}
                        {visibleFields.includes('status') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            <button 
                              onClick={() => handleSort('status')}
                              className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                            >
                              🔍 HOD Status
                              <SortIcon field='status' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('progress') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            <button 
                              onClick={() => handleSort('progress')}
                              className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                            >
                              📊 Progress
                              <SortIcon field='progress' />
                            </button>
                          </th>
                        )}
                        {visibleFields.includes('members') && (
                          <th className='px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                            <button 
                              onClick={() => handleSort('members')}
                              className='flex items-center gap-2 hover:text-blue-600 transition-colors group'
                            >
                              👥 Team
                              <SortIcon field='members' />
                            </button>
                          </th>
                        )}
                        <th className='px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700'>
                          ⚡ Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                      {currentItems.map((p, index) => (
                        <tr 
                          key={p._id} 
                          className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/30' : ''} group`}
                        >
                          <td className='px-6 py-4'>
                            <div className='flex flex-col space-y-2'>
                              {/* Title and Group ID */}
                              <div className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                                <span className='text-lg'>{p.title}</span>
                                <span className='text-[9px] px-2 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold'>
                                  {p.groupId}
                                </span>
                              </div>
                              
                              {/* Leader info */}
                              <div className='text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2'>
                                <span className='inline-flex items-center gap-1'>
                                  👤 <strong>Leader:</strong> {p.leader?.academicInfo?.name || p.leader?.email?.split('@')[0]}
                                </span>
                              </div>
                              
                              {/* Description (if visible) */}
                              {visibleFields.includes('description') && p.description && (
                                <div className='text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded-md line-clamp-2 max-w-md'>
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {visibleFields.includes('department') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                                {p.department || '—'}
                              </span>
                            </td>
                          )}
                          
                          {visibleFields.includes('semester') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                                Sem {p.semester || '—'}
                              </span>
                            </td>
                          )}
                          
                          {visibleFields.includes('domain') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'>
                                {p.domain || '—'}
                              </span>
                            </td>
                          )}
                          
                          {visibleFields.includes('internal') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <div className='text-sm text-gray-900 dark:text-gray-100'>
                                {p.internalGuide ? (
                                  <div className='flex items-center gap-2'>
                                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                    {p.internalGuide.academicInfo?.name || p.internalGuide.email}
                                  </div>
                                ) : (
                                  <div className='flex items-center gap-2'>
                                    <div className='w-2 h-2 bg-gray-300 rounded-full'></div>
                                    <span className='text-gray-400'>Not Assigned</span>
                                    {isHod && (
                                      <button 
                                        onClick={() => setSelected(p)} 
                                        className='ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200'
                                        title='Assign Internal Guide'
                                      >
                                        Assign
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          
                          {visibleFields.includes('external') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <div className='text-sm text-gray-900 dark:text-gray-100'>
                                {p.externalGuide ? (
                                  <div className='flex items-center gap-2'>
                                    <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                                    {p.externalGuide.name}
                                  </div>
                                ) : (
                                  <div className='flex items-center gap-2 text-gray-400'>
                                    <div className='w-2 h-2 bg-gray-300 rounded-full'></div>
                                    Not Assigned
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          
                          {visibleFields.includes('status') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <StatusBadge status={p.hodApproval || 'pending'} />
                            </td>
                          )}
                          
                          {visibleFields.includes('progress') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <div className='flex items-center gap-3'>
                                <span className='text-sm font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-w-[45px] text-center'>
                                  {p.progressScore ?? 0}/10
                                </span>
                                <div className='flex-1 min-w-[80px]'>
                                  <div className='w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                                    <div 
                                      className={`h-full transition-all duration-500 rounded-full ${
                                        (p.progressScore || 0) >= 8 ? 'bg-green-500' :
                                        (p.progressScore || 0) >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${(p.progressScore || 0) * 10}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                          
                          {visibleFields.includes('members') && (
                            <td className='px-4 py-4 whitespace-nowrap'>
                              <div className='flex items-center gap-2'>
                                <span className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium'>
                                  {p.members?.length || 0}
                                </span>
                                <div className='text-xs text-gray-500'>
                                  <div>members</div>
                                  {p.members?.length > 0 && (
                                    <div className='text-[10px] text-gray-400 mt-1'>
                                      {p.members.filter(m => m.role === 'leader').length} leader,{' '}
                                      {p.members.filter(m => m.role === 'member').length} members
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center justify-center gap-2 flex-wrap'>
                              {/* HOD Actions */}
                              {isHod && (
                                <>
                                  {p.hodApproval !== 'approved' && (
                                    <button 
                                      onClick={() => approveProject(p._id, true)} 
                                      className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 shadow-sm hover:shadow-md'
                                      title='Approve Project'
                                    >
                                      <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                        <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd'></path>
                                      </svg>
                                      Approve
                                    </button>
                                  )}
                                  {p.hodApproval !== 'rejected' && (
                                    <button 
                                      onClick={() => approveProject(p._id, false)} 
                                      className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 shadow-sm hover:shadow-md'
                                      title='Reject Project'
                                    >
                                      <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                        <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd'></path>
                                      </svg>
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
                                        className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md'
                                        title='Assign Guide'
                                      >
                                        <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                          <path d='M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z'></path>
                                        </svg>
                                        Assign
                                      </button>
                                    ) : (
                                      <span className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' title='Guide Assigned'>
                                        <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                          <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd'></path>
                                        </svg>
                                        Guide Assigned
                                      </span>
                                    )
                                  ) : (
                                    <span className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' title='Awaiting HOD Approval'>
                                      <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' clipRule='evenodd'></path>
                                      </svg>
                                      Awaiting HOD
                                    </span>
                                  )}
                                </>
                              )}
                              
                              {/* View Details Button */}
                              <button 
                                onClick={() => setSelected(p)} 
                                className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200 shadow-sm hover:shadow-md'
                                title='View Details'
                              >
                                <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                                  <path d='M10 12a2 2 0 100-4 2 2 0 000 4z'></path>
                                  <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0v-.5A1.5 1.5 0 0114.5 6c.526 0 .988-.27 1.256-.679a6.012 6.012 0 011.912 2.706 8.012 8.012 0 01-.135 1.018A6.006 6.006 0 0115.5 8.5h-.165a4 4 0 01-7.67 0H7.5A6.006 6.006 0 015.467 9.044a8.012 8.012 0 01-.135-1.017z' clipRule='evenodd'></path>
                                </svg>
                                View
                              </button>
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
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative'>
            <button onClick={closeCreateModal} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'>✕</button>
            <h2 className='font-semibold text-lg mb-1'>Create Project Group</h2>
            <p className='text-xs text-gray-500 mb-4'>Leader = You. Add teammates now or later.</p>
            <div className='grid md:grid-cols-2 gap-4 text-sm'>
              <div className='flex flex-col gap-1'>
                <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Project Title</label>
                <input className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900 placeholder-gray-700' value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder='UGSF' />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Domain</label>
                <select className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900' value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})}>
                  <option value='' className='text-gray-900 bg-white'>Select Domain</option>
                  {PROJECT_DOMAINS.map(d=> <option key={d} value={d} className='text-gray-900 bg-white'>{d}</option>)}
                </select>
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Department</label>
                <select className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900' value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
                  <option value='' className='text-gray-900 bg-white'>Select</option>
                  {departmentsList.map(d=> <option key={d} className='text-gray-900 bg-white'>{d}</option>)}
                </select>
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Semester</label>
                <select className='px-3 py-2.5 border rounded bg-gray-50 text-gray-900' value={form.semester} onChange={e=>setForm({...form,semester:parseInt(e.target.value)})}>
                  {[1,2,3,4,5,6,7,8].map(s=> <option key={s} className='text-gray-900 bg-white'>{s}</option>)}
                </select>
              </div>
              <div className='md:col-span-2 flex flex-col gap-1'>
                <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Description</label>
                <textarea className='px-3 py-2.5 border rounded bg-gray-50 min-h-[80px] text-gray-900 placeholder-gray-700' value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder='Problem statement, objective, impact... (<=200 words)' />
                <div className={`text-[10px] mt-1 ${descWords>200?'text-red-600':'text-gray-500'}`}>{descWords} / 200 words</div>
              </div>
              <div className='md:col-span-2 flex flex-col gap-1'>
                <label className='text-[11px] font-medium uppercase tracking-wide text-gray-600'>Add Teammates</label>
                <div className='relative'>
                  <input 
                    className='w-full px-3 py-2.5 border rounded bg-gray-50 text-gray-900 placeholder-gray-700' 
                    value={memberSearch} 
                    onChange={(e) => {
                      const value = e.target.value
                      setMemberSearch(value)
                      // Clear suggestions immediately if less than 2 chars or empty
                      if (value.length < 2) {
                        setMemberSuggestions([])
                        setSearchLoading(false)
                      } else {
                        setSearchLoading(true)
                        debouncedSearch(value)
                      }
                    }}
                    placeholder='Type student ID (e.g., 23dit015) or name (min 2 characters)...' 
                  />
                  {searchLoading && (
                    <div className='absolute right-3 top-3 text-gray-400'>
                      <div className='w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin'></div>
                    </div>
                  )}
                  
                  {/* Search Suggestions */}
                  {memberSuggestions.length > 0 && (
                    <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {memberSuggestions.map((student) => (
                        <div 
                          key={student.id}
                          className='px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer border-b last:border-b-0 transition-colors'
                          onClick={() => addMemberToSelection(student)}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='font-bold text-sm text-white'>{student.studentId}</div>
                            <div className='font-medium text-sm text-white'>{student.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected Members */}
                {selectedMembers.length > 0 && (
                  <div className='mt-2'>
                    <div className='text-[11px] font-medium uppercase tracking-wide text-gray-600 mb-2'>Selected Members ({selectedMembers.length})</div>
                    <div className='flex flex-wrap gap-2'>
                      {selectedMembers.map((member) => (
                        <div key={member.email} className='flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm'>
                          <span>{member.name}</span>
                          <span className='text-xs text-gray-500'>({member.department})</span>
                          <button 
                            onClick={() => removeMemberFromSelection(member.email)}
                            className='text-red-500 hover:text-red-700 ml-1'
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className='text-[10px] text-gray-500 mt-1'>
                  💡 Start typing student ID (e.g., "23") to see dynamic suggestions. Mix of departments will show a warning.
                  {memberSearch.length > 0 && ` • ${memberSearch.length} characters typed`}
                </div>
              </div>
            </div>
            <div className='flex justify-end gap-2 mt-4'>
              <button type='button' onClick={closeCreateModal} className='px-4 py-2 text-sm rounded border'>Cancel</button>
              <button type='button' disabled={!formValid} onClick={submitProject} className={`px-5 py-2 rounded text-sm ${formValid? 'bg-blue-600 text-white':'bg-gray-400 text-gray-200 cursor-not-allowed'}`}>Create</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <ProjectModal project={selected} close={()=>setSelected(null)} session={session} isAdmin={!!isAdmin} isHod={!!isHod} guides={guides} assignInternal={assignInternal} approveProject={approveProject} addMember={addMember} removeMember={removeMember} />
      )}
    </div>
  )
}

function FilterGroup({ title, options, value, onSelect }) {
  // Format title to proper case
  const formatTitle = (text) => {
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }
  
  // Only format status options, keep others as they are
  const formatOptionText = (text) => {
    if (title === 'STATUS') {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }
    return text // Keep original text for all other filters
  }
  
  return (
    <div>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>{formatTitle(title)}</p>
      <div className='flex flex-wrap gap-3'>
        {options.map(opt => {
          const checked = value === opt
          return (
            <button key={opt} type='button' onClick={()=>onSelect(opt)} className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}>
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
    <div className='border-t pt-6'>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Visible Info Fields</p>
      <div className='flex flex-wrap gap-3'>
        {fields.map(f => {
          const checked = visible.includes(f.key)
          return (
            <label key={f.key} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm cursor-pointer select-none transition-all duration-200 font-semibold ${checked ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}>
              <input type='checkbox' className='hidden' checked={checked} onChange={()=>toggle(f.key)} />
              {f.label}
            </label>
          )
        })}
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
    submitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
  }
  return <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${map[status]||'bg-gray-100 dark:bg-gray-700'}`}>{status}</span>
}

function ProjectModal({ project, close, session, isAdmin, isHod, guides, assignInternal, approveProject, addMember, removeMember }) {
  const [tab, setTab] = useState('overview')
  const [groupDetails, setGroupDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [memberView, setMemberView] = useState(null)
  const [externalGuideEmail, setExternalGuideEmail] = useState('')
  const [externalGuideName, setExternalGuideName] = useState('')
  const [progressDraft, setProgressDraft] = useState(project.progressScore||0)
  const [addingReport, setAddingReport] = useState(false)
  const [reportUrl, setReportUrl] = useState('')
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackReport, setFeedbackReport] = useState('')
  const canManage = isAdmin || isHod
  const isGuide = session?.user?.role==='guide' && String(project.internalGuide?._id)===String(session.user.id)
  const canProgress = canManage || isGuide
  const isMember = project.members.some(m=> String(m.student?._id||m.student)===String(session.user.id))

  // Filter guides based on user role
  const availableGuidesModal = isHod 
    ? guides.filter(g => {
        const hodDepartment = session?.user?.academicInfo?.department
        const hodInstitute = session?.user?.academicInfo?.institute
        const matchesDepartment = hodDepartment ? g.department === hodDepartment : true
        const matchesInstitute = hodInstitute ? g.academicInfo?.institute === hodInstitute : true
        return matchesDepartment && matchesInstitute
      })
    : guides

  const updateProgress = async () => {
    if(!canProgress) return
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project._id, progressScore: progressDraft }) })
    if(res.ok){ toast.success('Progress saved') }
  }
  const addReport = async () => {
    if(!reportUrl.trim()) return
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project._id, addReport:true, reportPdfUrl: reportUrl }) })
    if(res.ok){ toast.success('Report added'); setReportUrl(''); setAddingReport(false) }
  }
  const giveFeedback = async () => {
    if(!feedbackReport || !feedbackDraft.trim()) return
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project._id, feedback: feedbackDraft, feedbackReportId: feedbackReport }) })
    if(res.ok){ toast.success('Feedback added'); setFeedbackDraft(''); setFeedbackReport('') }
  }
  const assignExternal = async () => {
    if(!externalGuideEmail.trim()) return
    const ext = { name: externalGuideName||externalGuideEmail.split('@')[0], email: externalGuideEmail }
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project._id, externalGuide: ext }) })
    if(res.ok){ toast.success('External guide set') }
  }

  useEffect(()=>{
    if(tab==='members' && !groupDetails){
      setLoadingDetails(true)
      fetch(`/api/projects/group-details?groupId=${project.groupId}`).then(async r=>{
        if(r.ok){ const d = await r.json(); setGroupDetails(d.group) }
      }).finally(()=> setLoadingDetails(false))
    }
  },[tab, groupDetails, project.groupId])

  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4'>
      <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} className='w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-0 relative'>
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <div>
            <h3 className='text-lg md:text-xl font-semibold flex items-center gap-2'>{project.title}<span className='text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100'>{project.groupId}</span></h3>
            <p className='text-[11px] text-gray-500 dark:text-gray-400 mt-1'>Dept {project.department} • Sem {project.semester} • {project.domain||'No domain'}</p>
          </div>
          <button onClick={close} className='text-gray-500 hover:text-gray-700 text-sm'>Close</button>
        </div>
        <div className='px-6 pt-4 flex gap-4 border-b text-[11px]'>
          {['overview','members','manage','reports'].map(t=> <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 rounded-t ${tab===t?'bg-gray-100 dark:bg-gray-800 font-semibold':''}`}>{t}</button>)}
        </div>
          {tab==='members' && (
            <div className='space-y-4'>
              {loadingDetails && <div className='text-xs text-gray-500'>Loading members...</div>}
              {!loadingDetails && groupDetails && (
                <div className='grid sm:grid-cols-2 gap-3 text-[11px]'>
                  {groupDetails.members.map(m => (
                    <div key={m.student._id} className='p-2 rounded border flex flex-col gap-1 bg-gray-50 dark:bg-gray-800/40'>
                      <div className='flex justify-between items-center'>
                        <span className='font-medium'>{m.student.academicInfo?.name || m.student.email}</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 uppercase'>{m.role}</span>
                      </div>
                      <div className='text-gray-600 dark:text-gray-400 truncate'>{m.student.email}</div>
                      <div className='text-[10px] text-gray-500'>Dept: {m.student.department}</div>
                      <button onClick={()=>setMemberView(m)} className='text-[10px] text-blue-600 underline self-start'>View</button>
                    </div>
                  ))}
                </div>
              )}
              {!loadingDetails && !groupDetails && <div className='text-xs text-gray-500'>No data</div>}
            </div>
          )}
      {memberView && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl p-5 relative text-sm'>
            <button onClick={()=>setMemberView(null)} className='absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xs'>✕</button>
            <h4 className='font-semibold mb-2 flex items-center gap-2'>
              {memberView.student.academicInfo?.name || memberView.student.email}
              <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 uppercase'>{memberView.role}</span>
            </h4>
            <div className='space-y-1'>
              <div><span className='font-medium'>Email:</span> {memberView.student.email}</div>
              <div><span className='font-medium'>Department:</span> {memberView.student.department}</div>
              <div><span className='font-medium'>Institute:</span> {memberView.student.institute}</div>
              <div><span className='font-medium'>University:</span> {memberView.student.university}</div>
              <div><span className='font-medium'>Admission Year:</span> {memberView.student.admissionYear}</div>
              <div><span className='font-medium'>Role in Project:</span> {memberView.role}</div>
            </div>
          </div>
        </div>
      )}
        <div className='p-6 space-y-6 max-h-[70vh] overflow-y-auto text-sm'>
          {tab==='overview' && (
            <div className='space-y-4'>
              <div className='grid md:grid-cols-2 gap-4 text-[12px]'>
                <div><span className='font-medium'>Leader:</span> {project.leader?.academicInfo?.name || project.leader?.email}</div>
                <div><span className='font-medium'>Members:</span> {project.members.length}</div>
                <div><span className='font-medium'>Internal Guide:</span> {project.internalGuide?.academicInfo?.name || project.internalGuide?.email || '—'}</div>
                <div><span className='font-medium'>External Guide:</span> {project.externalGuide?.name || '—'}</div>
                <div className='md:col-span-2'><span className='font-medium'>Description:</span> {project.description||'—'}</div>
              </div>
              {isMember && (
                <div className='space-y-2'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Add Member</h4>
                  <div className='flex gap-2'>
                    <input value={addingMember} onChange={e=>setAddingMember(e.target.value)} placeholder='student email or id' className='flex-1 px-2 py-1 rounded border text-xs'/>
                    <button onClick={()=>addMember(project._id)} className='px-3 py-1 rounded bg-indigo-600 text-white text-xs'>Add</button>
                  </div>
                  <div className='grid sm:grid-cols-2 gap-2 text-[11px]'>
                    {project.members.map(m => (
                      <div key={m.student._id||m.student} className='px-2 py-1 rounded border flex items-center justify-between'>
                        <span>{m.student?.academicInfo?.name || m.student?.email || m.student}</span>
                        {(isAdmin || isHod || (isMember && m.role!=='leader' && String(project.leader?._id||project.leader)===String(session.user.id))) && (
                          <button onClick={()=>removeMember(project._id, m.student._id||m.student)} className='text-red-600 text-[10px]'>Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab==='manage' && (canManage || isGuide) && (
            <div className='space-y-6'>
              <div className='space-y-2'>
                <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                  {isHod ? 'HOD Approval' : 'Status & Actions'}
                </h4>
                
                {/* Show current HOD approval status */}
                <div className='mb-2'>
                  <span className='text-[11px] text-gray-500'>HOD Approval: </span>
                  <StatusBadge status={project.hodApproval || 'pending'} />
                </div>
                
                {/* HOD approval buttons */}
                {isHod && (
                  <div className='flex flex-wrap gap-2'>
                    {project.hodApproval !== 'approved' && <button onClick={()=>approveProject(project._id,true)} className='px-4 py-2 text-[11px] rounded bg-green-600 text-white'>Approve</button>}
                    {project.hodApproval !== 'rejected' && <button onClick={()=>approveProject(project._id,false)} className='px-4 py-2 text-[11px] rounded bg-red-600 text-white'>Reject</button>}
                  </div>
                )}
                
                {/* Admin restriction notice */}
                {isAdmin && project.hodApproval !== 'approved' && (
                  <div className='p-2 bg-orange-50 border border-orange-200 rounded text-[11px] text-orange-700'>
                    ⚠️ This project must be approved by HOD before you can assign guides.
                  </div>
                )}
              </div>
              {(isHod || (isAdmin && project.hodApproval === 'approved')) && (
                <div className='space-y-3'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Assign Guides</h4>
                  <div className='flex flex-wrap gap-2 items-center'>
                    <select className='px-2 py-2 border rounded text-xs min-w-[200px]' value={project.internalGuide?._id||''} onChange={e=>assignInternal(project._id, e.target.value||undefined)}>
                      <option value=''>Select Internal Guide</option>
                      {availableGuidesModal.filter(g=> g.department===project.department).map(g => (
                        <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}{g.role==='hod'?' (HOD)':''}</option>
                      ))}
                    </select>
                  </div>
                  <div className='flex flex-wrap gap-2 items-center'>
                    <input value={externalGuideName} onChange={e=>setExternalGuideName(e.target.value)} placeholder='External name' className='px-2 py-1 rounded border text-xs'/>
                    <input value={externalGuideEmail} onChange={e=>setExternalGuideEmail(e.target.value)} placeholder='External email' className='px-2 py-1 rounded border text-xs'/>
                    <button onClick={assignExternal} className='px-3 py-1 rounded bg-indigo-600 text-white text-[11px]'>Save External</button>
                  </div>
                </div>
              )}
              <div className='space-y-2'>
                <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Progress</h4>
                <div className='flex items-center gap-3'>
                  <input type='range' min={0} max={10} value={progressDraft} onChange={e=>setProgressDraft(parseInt(e.target.value))} disabled={!canProgress} />
                  <span className='text-xs'>{progressDraft}/10</span>
                  {canProgress && <button onClick={updateProgress} className='px-3 py-1 text-[11px] rounded bg-blue-600 text-white'>Save</button>}
                </div>
              </div>
            </div>
          )}
          {tab==='reports' && (
            <div className='space-y-4 text-[11px]'>
              <h4 className='font-semibold uppercase tracking-wide text-gray-500'>Reports</h4>
              <div className='space-y-3'>
                {project.reports?.length ? project.reports.slice().sort((a,b)=>a.week-b.week).map(r=>(
                  <div key={r._id} className='p-3 rounded border bg-gray-50 dark:bg-gray-800/40 flex flex-col gap-1'>
                    <div className='flex items-center justify-between'><span className='font-medium'>Week {r.week}</span><a href={r.pdfUrl} target='_blank' rel='noreferrer' className='text-blue-600'>Open</a></div>
                    <span className='text-gray-500'>Submitted {new Date(r.submittedAt).toLocaleDateString()}</span>
                    {r.feedback && <span className='text-green-600'>Feedback: {r.feedback}</span>}
                  </div>
                )) : <p className='text-gray-500'>No reports yet.</p>}
              </div>
              {isMember && (
                <div className='space-y-2'>
                  <button onClick={()=>setAddingReport(a=>!a)} className='px-3 py-1 rounded border bg-white'>{addingReport?'Cancel':'Add Report'}</button>
                  {addingReport && (
                    <div className='flex gap-2 items-center'>
                      <input value={reportUrl} onChange={e=>setReportUrl(e.target.value)} placeholder='PDF URL' className='flex-1 px-2 py-1 rounded border'/>
                      <button onClick={addReport} className='px-3 py-1 rounded bg-indigo-600 text-white'>Submit</button>
                    </div>
                  )}
                </div>
              )}
              {(isGuide || isAdmin || isHod) && project.reports?.length>0 && (
                <div className='space-y-2 border-t pt-4'>
                  <h5 className='font-semibold uppercase tracking-wide text-gray-500'>Give Feedback</h5>
                  <div className='flex flex-wrap gap-2 items-center'>
                    <select value={feedbackReport} onChange={e=>setFeedbackReport(e.target.value)} className='px-2 py-1 rounded border'>
                      <option value=''>Select report</option>
                      {project.reports.map(r=> <option key={r._id} value={r._id}>Week {r.week}</option>)}
                    </select>
                    <input value={feedbackDraft} onChange={e=>setFeedbackDraft(e.target.value)} placeholder='Feedback' className='flex-1 px-2 py-1 rounded border'/>
                    <button onClick={giveFeedback} className='px-3 py-1 rounded bg-blue-600 text-white'>Save</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}


