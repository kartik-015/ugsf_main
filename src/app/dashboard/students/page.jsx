'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Search, Upload, FileSpreadsheet, AlertCircle, Download } from 'lucide-react'
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

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importMode, setImportMode] = useState('append')
  const [importFile, setImportFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const FIELD_OPTIONS = [
    { key: 'roll', label: 'ID Number' },
    { key: 'semester', label: 'Semester' },
    { key: 'interests', label: 'Domain Interest' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'phone', label: 'Mobile Number' },
    { key: 'grouped', label: 'Grouped' },
  ]
  const [visibleFields, setVisibleFields] = useState(['roll','semester','interests','onboarding','phone','grouped'])

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
        // Fetch project details for students
        await fetchProjectDetails(data.students || [])
      } else toast.error('Failed to fetch students')
    } catch { toast.error('Error fetching students') } finally { setLoading(false) }
  }, [searchTerm, department, semester])

  // Fetch project details for the student list
  const [projectMap, setProjectMap] = useState({})
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

  const baseDepartments = ['CSE','CE','IT']
  const departments = baseDepartments
  const semesters = ['1','2','3','4','5','6','7','8']

  const submitHandler = async (e) => { e.preventDefault(); setLoading(true); setShowSearchDropdown(false); await fetchStudents(); setSubmitted(true) }
  const reset = () => { setDepartment(''); setSemester(''); setSearchTerm(''); setStudents([]); setSubmitted(false); setProjectMap({}) }

  const exportExcel = async () => {
    try {
      if (!students.length) { toast('No students to export'); return }
      const ids = students.map(s=>s._id)
      const res = await fetch('/api/students/export', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, fields: visibleFields, projectMap }) })
      if (!res.ok) { const j = await res.json().catch(()=>({})); toast.error(j.message || 'Export failed'); return }
      const blob = await res.blob(); const urlObj = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=urlObj; a.download='students_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlObj)
    } catch { toast.error('Export failed') }
  }

  // Import handlers
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Please upload an Excel file (.xlsx or .xls)')
        return
      }
      setImportFile(selectedFile)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/admin/import-export?type=template&userType=student')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'student_template.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
        toast.success('Template downloaded')
      } else toast.error('Failed to download template')
    } catch { toast.error('Error downloading template') }
  }

  const handleImport = async () => {
    if (!importFile) { toast.error('Please select a file first'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('mode', importMode)
    formData.append('userType', 'student')
    try {
      const res = await fetch('/api/admin/import-export', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setImportFile(null)
        setShowImport(false)
        if (submitted) { setLoading(true); await fetchStudents() }
      } else toast.error(data.message || 'Import failed')
    } catch { toast.error('Error importing file') }
    finally { setUploading(false) }
  }

  const isAdmin = ['admin','mainadmin'].includes(session?.user?.role)

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold'>Students</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>{session?.user?.role==='admin' ? 'Manage all students' : 'View students'}</p>
        </div>
        <form onSubmit={submitHandler} className='card p-6 mb-6 space-y-6'>
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
                  <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto'>
                    {searchResults.map((s, i) => (
                      <div key={s._id || i} className='px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0'
                        onClick={() => {
                          setSearchTerm(s.email || s.academicInfo?.name || '')
                          setShowSearchDropdown(false)
                        }}
                      >
                        <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700'>
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
            <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-semibold'>Submit</button>
            <button type='button' onClick={reset} className='px-3 py-2 rounded border'>Reset</button>
            <button type='button' onClick={exportExcel} className='ml-3 px-4 py-2 rounded bg-green-600 text-white font-semibold flex items-center gap-2'>
              <Download className='h-4 w-4' /> Download
            </button>
            {isAdmin && (
              <button type='button' onClick={() => setShowImport(!showImport)} className='px-4 py-2 rounded bg-purple-600 text-white font-semibold flex items-center gap-2'>
                <Upload className='h-4 w-4' /> Import Students
              </button>
            )}
            <div className='ml-auto text-sm text-gray-600'>{submitted ? `${students.length} result(s)` : 'No results yet'}</div>
          </div>
          {/* Ungrouped students info */}
          {submitted && Object.keys(projectMap).length > 0 && (
            <div className='flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800'>
              <Users className='w-3 h-3 flex-shrink-0' />
              <span><strong>{students.filter(s => !projectMap[String(s._id)]).length}</strong> student{students.filter(s => !projectMap[String(s._id)]).length !== 1 ? 's' : ''} not yet part of any group</span>
            </div>
          )}
        </form>

        {/* Import Section */}
        {showImport && isAdmin && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className='card p-6 mb-6 space-y-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold flex items-center gap-2'><Upload className='h-5 w-5' /> Import Students from Excel</h3>
              <button onClick={() => setShowImport(false)} className='text-gray-400 hover:text-gray-600'>✕</button>
            </div>
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                <div className='text-sm text-blue-800 dark:text-blue-200'>
                  <p className='font-semibold mb-1'>Import Instructions:</p>
                  <ul className='list-disc list-inside space-y-1'>
                    <li><strong>Create New:</strong> Skip existing entries (no duplicates)</li>
                    <li><strong>Append:</strong> Add new entries without affecting existing data</li>
                    <li>Download the template first to see the required format</li>
                    <li>All imported students will be auto-approved and activated</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <button onClick={handleDownloadTemplate} className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors'>
                <FileSpreadsheet className='h-4 w-4' /> Download Template
              </button>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Import Mode</label>
              <div className='grid grid-cols-2 gap-3'>
                {[
                  { value: 'append', label: 'Append to Existing', desc: 'Add new entries only' },
                  { value: 'create', label: 'Create New', desc: 'Skip existing entries' }
                ].map((mode) => (
                  <button key={mode.value} type='button' onClick={() => setImportMode(mode.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${importMode === mode.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}>
                    <div className='font-medium text-gray-900 dark:text-gray-100'>{mode.label}</div>
                    <div className='text-xs text-gray-600 dark:text-gray-400 mt-1'>{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Select Excel File</label>
              <input type='file' accept='.xlsx,.xls' onChange={handleFileChange} className='block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2' />
              {importFile && <p className='mt-2 text-sm text-green-600 dark:text-green-400'>Selected: {importFile.name}</p>}
            </div>
            <button onClick={handleImport} disabled={!importFile || uploading} className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {uploading ? (<><div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div> Importing...</>) : (<><Upload className='h-4 w-4' /> Import Data</>)}
            </button>
          </motion.div>
        )}

        {!submitted ? (<div className='text-center py-16'><p className='text-gray-500'>Use the filters above and click Submit.</p></div>) : (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden'>
            {students.length === 0 ? (
              <div className='text-center py-12'>
                <Users className='mx-auto h-12 w-12 text-gray-400'/>
                <h3 className='mt-2 text-sm font-medium'>No students found</h3>
              </div>
            ) : (
              <div className='overflow-hidden'>
                <table className='w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700'>
                  <thead className='bg-gray-50 dark:bg-gray-700'>
                    <tr>
                      <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[14%]'>Name</th>
                      <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[18%]'>Email</th>
                      {visibleFields.includes('roll') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]'>ID Number</th>}
                      {visibleFields.includes('semester') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[7%]'>Sem</th>}
                      {visibleFields.includes('interests') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[14%]'>Domain</th>}
                      {visibleFields.includes('onboarding') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]'>Onboarding</th>}
                      {visibleFields.includes('phone') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]'>Mobile</th>}
                      {visibleFields.includes('grouped') && <th className='px-3 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[9%]'>Grouped</th>}
                    </tr>
                  </thead>
                  <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                    {students.map((s, index) => {
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
                                  <span key={i} className='inline-flex px-1.5 py-0.5 rounded-full text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 truncate max-w-[80px]'>{int}</span>
                                ))}
                                {s.interests.length > 2 && <span className='text-[10px] text-gray-400'>+{s.interests.length - 2}</span>}
                              </div>
                            ) : <span className='text-gray-400 text-xs'>NA</span>}
                          </td>
                        )}
                        {visibleFields.includes('onboarding') && (
                          <td className='px-3 py-3 text-sm'>
                            {s.isOnboarded ? (
                              <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'>Onboarded</span>
                            ) : (
                              <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'>Pending</span>
                            )}
                          </td>
                        )}
                        {visibleFields.includes('phone') && <td className='px-3 py-3 text-sm text-gray-900 dark:text-gray-300 truncate'>{s.academicInfo?.phoneNumber || '—'}</td>}
                        {visibleFields.includes('grouped') && (
                          <td className='px-3 py-3 text-sm'>
                            {projectMap[String(s._id)] ? (
                              <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'>Grouped</span>
                            ) : (
                              <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'>Ungrouped</span>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
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
            <button key={opt} type='button' onClick={()=>onSelect(opt)} className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}>{opt}</button>
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
