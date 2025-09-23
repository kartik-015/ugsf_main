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

  // Field visibility
  const FIELD_OPTIONS = [
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'domain', label: 'Domain' },
    { key: 'internal', label: 'Internal Guide' },
    { key: 'external', label: 'External Guide' },
    { key: 'progress', label: 'Progress' },
    { key: 'description', label: 'Description' },
    { key: 'members', label: 'Members Count' }
  ]
  const [visibleFields, setVisibleFields] = useState(['department','semester','domain','internal','progress'])
  const toggleField = key => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])
  const toggleExclusive = (current,setter,val)=> setter(current===val?'':val)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', domain:'', department:'', semester:1 })

  // Selection modal
  const [selected, setSelected] = useState(null)
  const [addingMember, setAddingMember] = useState('')
  const [modalTab, setModalTab] = useState('overview')

  // Static option sets
  const universities = ['CHARUSAT','Others']
  const institutes = ['CSPIT','DEPSTAR','Others']
  const departmentsList = ['CSE','CE','IT']
  const semesters = ['1','2','3','4','5','6','7','8']
  const statuses = ['submitted','under-review','approved','rejected']

  const loadProjects = useCallback(async ()=>{
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      if(res.ok){
        const data = await res.json()
        const list = data.projects||[]
        setProjects(list)
        if(isStudent){
          const my = list.filter(p=> p.members.some(m=> String(m.student?._id||m.student)===String(session.user.id)))
          setMine(my)
        }
      }
    } finally { setLoading(false) }
  },[isStudent, session?.user?.id])

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
    const res = await fetch('/api/projects',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId, approve }) })
    if(res.ok){ toast.success('Updated'); loadProjects() } else { const e=await res.json(); toast.error(e.error?.message||'Error') }
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

  // Derived lists
  let base = projects
  if (isStudent) {
    base = studentView === 'mine' ? mine : projects
  } else if (!isAdmin) {
    base = projects
  }
  
  const domainsAll = Array.from(new Set(projects.map(p=>p.domain).filter(Boolean)))
  const filtered = base.filter(p => !university || p.leader?.university===university)
    .filter(p => !institute || p.leader?.institute===institute)
    .filter(p => !department || p.department===department)
    .filter(p => !semester || String(p.semester)===semester)
    .filter(p => !status || p.status===status)
    .filter(p => !domain || p.domain===domain)
    .filter(p => !guide || (p.internalGuide && String(p.internalGuide._id)===guide))
    .filter(p => !search || (p.title||'').toLowerCase().includes(search.toLowerCase()))

  const submitFilters = e => { e.preventDefault(); setSubmitted(true) }
  const resetFilters = () => { setUniversity(''); setInstitute(''); setDepartment(''); setSemester(''); setStatus(''); setDomain(''); setGuide(''); setSearch(''); setSubmitted(false) }

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
                  {guides.filter(g=> !department || g.department===department).map(g=> <option key={g._id} value={g._id}>{g.academicInfo?.name || g.email}</option>)}
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
          <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white'>Apply</button>
          <button type='button' onClick={resetFilters} className='px-3 py-2 rounded border'>Reset</button>
          <div className='ml-auto text-sm text-gray-600'>{submitted ? `${filtered.length} result(s)` : 'No results yet'}</div>
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
        <div className='grid gap-6'>
          {filtered.length===0 ? <div className='text-center py-8 text-gray-500'>No projects match filters.</div> : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {filtered.map(p => (
                <motion.div key={p._id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className='card p-5 flex flex-col group relative'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex flex-col gap-1'>
                      <div className='font-semibold text-lg flex items-center gap-2'>
                        <span>{p.title}</span>
                        <span className='text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100'>{p.groupId}</span>
                      </div>
                      <div className='text-[12px] text-gray-600 dark:text-gray-400'>Leader: {p.leader?.academicInfo?.name || p.leader?.email?.split('@')[0]}</div>
                    </div>
                    {visibleFields.includes('progress') && (
                      <div className='flex flex-col items-end gap-1'>
                        <StatusBadge status={p.status} />
                        <div className='flex items-center gap-2 text-[10px] font-medium'>
                          <span className='px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700'>{p.progressScore ?? 0}/10</span>
                          <div className='h-1.5 w-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden'>
                            <div className='h-full bg-blue-600' style={{ width: `${(p.progressScore||0)*10}%` }}/>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className='grid grid-cols-2 gap-3 text-[11px] mt-3'>
                    {visibleFields.includes('department') && <div><span className='font-medium'>Dept:</span> {p.department||'—'}</div>}
                    {visibleFields.includes('semester') && <div><span className='font-medium'>Sem:</span> {p.semester||'—'}</div>}
                    {visibleFields.includes('domain') && <div className='col-span-2'><span className='font-medium'>Domain:</span> {p.domain||'—'}</div>}
                    {visibleFields.includes('internal') && <div className='col-span-2'><span className='font-medium'>Internal:</span> {p.internalGuide?.academicInfo?.name || p.internalGuide?.email || '—'}</div>}
                    {visibleFields.includes('external') && <div className='col-span-2'><span className='font-medium'>External:</span> {p.externalGuide?.name || '—'}</div>}
                    {visibleFields.includes('members') && <div><span className='font-medium'>Members:</span> {p.members?.length||0}</div>}
                    {visibleFields.includes('description') && <div className='col-span-2 line-clamp-2'><span className='font-medium'>Desc:</span> {p.description||'—'}</div>}
                  </div>
                  {(isAdmin || isHod) && (
                    <div className='flex gap-2 mt-3'>
                      {p.status!=='approved' && <button onClick={()=>approveProject(p._id,true)} className='px-3 py-1 text-[11px] rounded bg-green-600 text-white'>Approve</button>}
                      {p.status!=='rejected' && <button onClick={()=>approveProject(p._id,false)} className='px-3 py-1 text-[11px] rounded bg-red-600 text-white'>Reject</button>}
                      {isHod && !p.internalGuide && <button onClick={()=>setSelected(p)} className='px-3 py-1 text-[11px] rounded bg-indigo-600 text-white'>Assign Guide</button>}
                    </div>
                  )}
                  <button onClick={()=>setSelected(p)} className='mt-3 text-[11px] text-blue-600 underline self-start'>Open</button>
                </motion.div>
              ))}
            </div>
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
      fetch(`/api/projects/group-details?projectId=${project._id}`).then(async r=>{
        if(r.ok){ const d = await r.json(); setGroupDetails(d) }
      }).finally(()=> setLoadingDetails(false))
    }
  },[tab, groupDetails, project._id])

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
                    <div key={m.id} className='p-2 rounded border flex flex-col gap-1 bg-gray-50 dark:bg-gray-800/40'>
                      <div className='flex justify-between items-center'>
                        <span className='font-medium'>{m.name || m.email}</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 uppercase'>{m.role}</span>
                      </div>
                      <div className='text-gray-600 dark:text-gray-400 truncate'>{m.email}</div>
                      {m.derived && <div className='text-[10px] text-gray-500'>Roll: {m.derived.rollNumber}</div>}
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
            <h4 className='font-semibold mb-2 flex items-center gap-2'>{memberView.name || memberView.email}<span className='text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 uppercase'>{memberView.role}</span></h4>
            <div className='space-y-1'>
              <div><span className='font-medium'>Email:</span> {memberView.email}</div>
              {memberView.derived && (
                <>
                  <div><span className='font-medium'>Roll:</span> {memberView.derived.rollNumber}</div>
                  <div><span className='font-medium'>Dept:</span> {memberView.derived.department}</div>
                  <div><span className='font-medium'>Institute:</span> {memberView.derived.institute}</div>
                  <div><span className='font-medium'>Admission Year:</span> {memberView.derived.admissionYear}</div>
                </>
              )}
              {memberView.interests?.length>0 && <div><span className='font-medium'>Interests:</span> {memberView.interests.slice(0,5).join(', ')}{memberView.interests.length>5?'…':''}</div>}
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
                <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Status & Actions</h4>
                <div className='flex flex-wrap gap-2'>
                  {project.status!=='approved' && <button onClick={()=>approveProject(project._id,true)} className='px-4 py-2 text-[11px] rounded bg-green-600 text-white'>Approve</button>}
                  {project.status!=='rejected' && <button onClick={()=>approveProject(project._id,false)} className='px-4 py-2 text-[11px] rounded bg-red-600 text-white'>Reject</button>}
                </div>
              </div>
              {isHod && (
                <div className='space-y-3'>
                  <h4 className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>Assign Guides</h4>
                  <div className='flex flex-wrap gap-2 items-center'>
                    <select className='px-2 py-2 border rounded text-xs min-w-[200px]' value={project.internalGuide?._id||''} onChange={e=>assignInternal(project._id, e.target.value||undefined)}>
                      <option value=''>Select Internal Guide</option>
                      {guides.filter(g=> g.department===project.department).map(g => (
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


