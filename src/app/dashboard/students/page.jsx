'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Search, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const { data: session } = useSession()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const searchRef = useRef(null)
  const searchTimeout = useRef(null)

  const FIELD_OPTIONS = [
    { key: 'roll', label: 'ID Number' },
    { key: 'semester', label: 'Semester' },
    { key: 'interests', label: 'Domain Interest' },
  ]
  const [visibleFields, setVisibleFields] = useState(['roll','semester','interests'])
  const [showUngroupedOnly, setShowUngroupedOnly] = useState(false)

  const toggleExclusive = (currentValue, setter, value) => {
    setter(currentValue === value ? '' : value)
  }
  const toggleField = (key) => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])

  // Dynamic search as user types
  const handleSearchInput = (value) => {
    setSearchTerm(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length >= 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/students/search?q=${encodeURIComponent(value)}`)
          if (res.ok) {
            const data = await res.json()
            setSearchResults(data.students || [])
            setShowSearchDropdown(true)
          }
        } catch { /* ignore */ }
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchDropdown(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (department) params.append('department', department)
      if (semester) params.append('semester', semester)
      if (searchTerm) params.append('search', searchTerm)
      const response = await fetch(`/api/students?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
        // Store project membership data
        if (data.projectMemberships) {
          window.__studentProjectMemberships = data.projectMemberships
        }
        // Fetch project details and grades for students
        await Promise.all([
          fetchProjectDetails(data.students || []),
          fetchGrades(data.students || []),
        ])
      } else toast.error('Failed to fetch students')
    } catch { toast.error('Error fetching students') } finally { setLoading(false) }
  }, [searchTerm, department, semester])

  // Fetch project details for the student list
  const [projectMap, setProjectMap] = useState({})
  const [gradeMap, setGradeMap] = useState({}) // studentId -> avgScore
  const fetchProjectDetails = async (studentList) => {
    try {
      const ids = studentList.map(s => s._id)
      if (!ids.length) return
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        const map = {}
        ;(data.projects || []).forEach(p => {
          p.members?.forEach(m => {
            const sid = String(m.student?._id || m.student)
            if (!map[sid]) map[sid] = []
            map[sid].push({
              title: p.title,
              domain: p.domain,
              status: p.status,
              hodApproval: p.hodApproval,
              guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || null,
            })
          })
        })
        setProjectMap(map)
      }
    } catch { /* ignore */ }
  }

  const fetchGrades = async (studentList) => {
    try {
      const res = await fetch('/api/projects/grades', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const gmap = {}
        ;(data.studentGrades || []).forEach(g => {
          const sid = String(g.studentId)
          if (!gmap[sid] || gmap[sid] === null) {
            gmap[sid] = g.avgScore
          }
        })
        setGradeMap(gmap)
      }
    } catch { /* ignore */ }
  }

  const baseDepartments = ['CSE','CE','IT']
  const departments = baseDepartments
  const semesters = ['1','2','3','4','5','6','7','8']

  const submitHandler = async (e) => { e.preventDefault(); setLoading(true); setShowSearchDropdown(false); await fetchStudents(); setSubmitted(true) }
  const reset = () => { setDepartment(''); setSemester(''); setSearchTerm(''); setStudents([]); setSubmitted(false); setProjectMap({}); setGradeMap({}); setShowUngroupedOnly(false) }

  const exportExcel = async () => {
    try {
      if (!students.length) { toast('No students to export'); return }
      const ids = students.map(s=>s._id)
      const res = await fetch('/api/students/export', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, fields: visibleFields, projectMap }) })
      if (!res.ok) { const j = await res.json().catch(()=>({})); toast.error(j.message || 'Export failed'); return }
      const blob = await res.blob(); const urlObj = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=urlObj; a.download='students_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlObj)
    } catch { toast.error('Export failed') }
  }

  const isAdmin = ['admin','mainadmin'].includes(session?.user?.role)

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Students</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>{session?.user?.role==='admin' ? 'Manage all students' : 'View students'}</p>
        </div>
        <form onSubmit={submitHandler} className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-5 mb-6 space-y-5'>
          <div className='space-y-6'>
            {/* Row 1: Department */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'><FilterGroup title='DEPARTMENT' options={departments} value={department} onSelect={v=>toggleExclusive(department,setDepartment,v)} /></div>
              <div className='w-full'><FilterGroup title='SEMESTER' options={semesters} value={semester} onSelect={v=>toggleExclusive(semester,setSemester,v)} /></div>
            </div>
            
            {/* Row 2: Dynamic Search */}
            <div className='w-full' ref={searchRef}>
              <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Students</p>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5'/>
                <input 
                  value={searchTerm} 
                  onChange={e => handleSearchInput(e.target.value)} 
                  placeholder='Start typing name, email, or roll number...' 
                  className='input pl-10 w-full h-11'
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                />
                {/* Dynamic dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-md max-h-60 overflow-y-auto'>
                    {searchResults.map((s, i) => (
                      <div key={s._id || i} className='px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0'
                        onClick={() => {
                          setSearchTerm(s.email || s.academicInfo?.name || '')
                          setShowSearchDropdown(false)
                        }}
                      >
                        <div className='w-8 h-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700'>
                          {(s.academicInfo?.name || s.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className='font-medium text-gray-900 dark:text-gray-100'>{s.academicInfo?.name || s.name || s.email?.split('@')[0]}</div>
                          <div className='text-xs text-gray-500'>{s.studentId || s.academicInfo?.rollNumber || ''} · {s.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
          <div className='flex items-center gap-2 flex-wrap'>
            <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-medium text-sm'>Submit</button>
            <button type='button' onClick={reset} className='px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm'>Reset</button>
            <button type='button' onClick={exportExcel} className='ml-3 px-4 py-2 rounded bg-green-600 text-white font-medium text-sm flex items-center gap-2'>
              <Download className='h-4 w-4' /> Download
            </button>

            <div className='ml-auto text-sm text-gray-600'>{submitted ? `${students.length} result(s)` : 'No results yet'}</div>
          </div>
          {/* Ungrouped students info */}
          {submitted && Object.keys(projectMap).length > 0 && (
            <div className='flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-3 py-2 border border-amber-200 dark:border-amber-800'>
              <Users className='w-3 h-3 flex-shrink-0' />
              <span><strong>{students.filter(s => !projectMap[String(s._id)]).length}</strong> student{students.filter(s => !projectMap[String(s._id)]).length !== 1 ? 's' : ''} not yet part of any group</span>
              <button
                type='button'
                onClick={() => setShowUngroupedOnly(!showUngroupedOnly)}
                className={`ml-auto px-3 py-1 rounded text-xs font-medium transition-colors ${showUngroupedOnly ? 'bg-amber-600 text-white' : 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40'}`}
              >
                {showUngroupedOnly ? 'Show All' : 'See All Ungrouped'}
              </button>
            </div>
          )}
        </form>



        {!submitted ? (<div className='text-center py-16'><p className='text-gray-500'>Use the filters above and click Submit.</p></div>) : (
          <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded overflow-hidden'>
            {students.length === 0 ? (
              <div className='text-center py-12'>
                <Users className='mx-auto h-12 w-12 text-gray-400'/>
                <h3 className='mt-2 text-sm font-medium'>No students found</h3>
              </div>
            ) : (() => {
              const displayStudents = showUngroupedOnly ? students.filter(s => !projectMap[String(s._id)]) : students
              return displayStudents.length === 0 ? (
                <div className='text-center py-12'>
                  <Users className='mx-auto h-12 w-12 text-gray-400'/>
                  <h3 className='mt-2 text-sm font-medium'>No ungrouped students found</h3>
                  <p className='text-xs text-gray-400 mt-1'>All students are part of a group</p>
                </div>
              ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[600px] divide-y divide-gray-200 dark:divide-gray-700'>
                  <thead className='bg-gray-50 dark:bg-gray-700'>
                    <tr>
                      <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[14%]'>Name</th>
                      <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[18%]'>Email</th>
                      {visibleFields.includes('roll') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]'>ID Number</th>}
                      {visibleFields.includes('semester') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[7%]'>Sem</th>}
                      {visibleFields.includes('interests') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[14%]'>Domain</th>}
                      <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]'>Overall Grade</th>
                    </tr>
                  </thead>
                  <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                    {displayStudents.map((s, index) => {
                      const proj = projectMap[String(s._id)]
                      const firstProject = proj?.[0]
                      return (
                      <motion.tr
                        key={s._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5) }}
                        className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150'
                      >
                        <td className='px-3 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                          {s.academicInfo?.name || s.email.split('@')[0]}
                        </td>
                        <td className='px-3 py-3 text-sm text-gray-900 dark:text-gray-300 truncate'>{s.email}</td>
                        {visibleFields.includes('roll') && <td className='px-3 py-3 text-sm text-gray-900 dark:text-gray-300 truncate'>{s.academicInfo?.rollNumber || '—'}</td>}
                        {visibleFields.includes('semester') && <td className='px-3 py-3 text-sm text-gray-900 dark:text-gray-300'>{s.academicInfo?.semester || '—'}</td>}
                        {visibleFields.includes('interests') && (
                          <td className='px-3 py-3 text-sm text-gray-900 dark:text-gray-300'>
                            {s.interests?.length > 0 ? (
                              <div className='flex flex-wrap gap-1'>
                                {s.interests.slice(0, 2).map((int, i) => (
                                  <span key={i} className='inline-flex px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 truncate max-w-[80px]'>{int}</span>
                                ))}
                                {s.interests.length > 2 && <span className='text-[10px] text-gray-400'>+{s.interests.length - 2}</span>}
                              </div>
                            ) : <span className='text-gray-400 text-xs'>NA</span>}
                          </td>
                        )}
                        <td className='px-3 py-3 text-sm'>
                          {(() => {
                            const score = gradeMap[String(s._id)]
                            if (score === null || score === undefined) return <span className='text-gray-400 text-xs'>—</span>
                            const color = score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : score >= 6 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : score >= 4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                            return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>{score}</span>
                          })()}
                        </td>
                      </motion.tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )
            })()}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function FilterGroup({ title, options, value, onSelect }) {
  const formatTitle = (text) => text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  return (
    <div>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>{formatTitle(title)}</p>
      <div className='flex flex-wrap gap-3'>
        {options.map(opt => {
          const checked = value === opt
          return (
            <button key={opt} type='button' onClick={()=>onSelect(opt)} className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700'}`}>{opt}</button>
          )
        })}
      </div>
    </div>
  )
}

function FieldSelector({ fields, visible, toggle }) {
  return (
    <div className='border-t border-gray-200 dark:border-gray-700 pt-5'>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Visible Info Fields</p>
      <div className='flex flex-wrap gap-2'>
        {fields.map(f => {
          const checked = visible.includes(f.key)
          return (
            <label key={f.key} className={`flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer select-none transition-colors font-medium ${checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700'}`}>
              <input type='checkbox' className='hidden' checked={checked} onChange={()=>toggle(f.key)} />
              {f.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}
