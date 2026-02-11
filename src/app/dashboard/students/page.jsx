'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Search, Upload, FileSpreadsheet, AlertCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const { data: session } = useSession()
  const isAdmin = ['admin','mainadmin','principal','hod'].includes(session?.user?.role)

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [university, setUniversity] = useState('CHARUSAT')
  const [submitted, setSubmitted] = useState(false)

  const FIELD_OPTIONS = [
    { key: 'roll', label: 'Roll Number' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'semester', label: 'Semester' },
    { key: 'department', label: 'Department' },
    { key: 'university', label: 'University' },
    { key: 'institute', label: 'Institute' },
  ]
  const [visibleFields, setVisibleFields] = useState(['roll','semester','department','university'])
  const [showImport, setShowImport] = useState(false)
  const [importMode, setImportMode] = useState('append')
  const [importFile, setImportFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const toggleExclusive = (currentValue, setter, value) => {
    setter(currentValue === value ? '' : value)
  }
  const toggleField = (key) => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])

  const departments = ['CSE','CE','IT']
  const semesters = ['1','2','3','4','5','6','7','8']

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (department) params.append('department', department)
      if (semester) params.append('semester', semester)
      if (searchTerm) params.append('search', searchTerm)
      if (university) params.append('university', university)
      params.append('institute', 'DEPSTAR')
      const response = await fetch(`/api/students?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      } else {
        toast.error('Failed to fetch students')
      }
    } catch {
      toast.error('Error fetching students')
    } finally { setLoading(false) }
  }, [searchTerm, department, semester, university])

  const submitHandler = async (e) => { e.preventDefault(); setLoading(true); await fetchStudents(); setSubmitted(true) }
  const reset = () => { setDepartment(''); setSemester(''); setSearchTerm(''); setUniversity('CHARUSAT'); setStudents([]); setSubmitted(false) }

  const exportExcel = async () => {
    try {
      if (!students.length) { toast('No students to export'); return }
      const ids = students.map(s=>s._id)
      const res = await fetch('/api/students/export', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, fields: visibleFields }) })
      if (!res.ok) { const j = await res.json().catch(()=>({})); toast.error(j.message || 'Export failed'); return }
      const blob = await res.blob(); const urlObj = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=urlObj; a.download='students_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlObj)
    } catch { toast.error('Export failed') }
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
      } else {
        toast.error('Failed to download template')
      }
    } catch {
      toast.error('Error downloading template')
    }
  }

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
        if (data.results?.errors?.length > 0) console.log('Import errors:', data.results.errors)
        setImportFile(null)
        setShowImport(false)
        if (submitted) await fetchStudents()
      } else {
        toast.error(data.message || 'Import failed')
      }
    } catch {
      toast.error('Error importing file')
    } finally {
      setUploading(false)
    }
  }

  if (!session || !isAdmin) return null

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold'>Student Directory</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>{session?.user?.role==='admin' ? 'Manage all students' : 'View students'}</p>
        </div>
        <form onSubmit={submitHandler} className='card p-6 mb-6 space-y-6'>
          <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>University</p>
                <div className='flex flex-wrap gap-3'>
                  <button type='button' disabled className='px-4 py-2.5 rounded-lg border text-sm font-semibold bg-blue-600 text-white border-blue-600 shadow-md cursor-default'>CHARUSAT</button>
                </div>
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Institute</p>
                <div className='flex flex-wrap gap-3'>
                  <button type='button' disabled className='px-4 py-2.5 rounded-lg border text-sm font-semibold bg-blue-600 text-white border-blue-600 shadow-md cursor-default'>DEPSTAR</button>
                </div>
              </div>
              <div className='w-full'>
                <FilterGroup title='DEPARTMENT' options={departments} value={department} onSelect={v=>toggleExclusive(department,setDepartment,v)} />
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'>
                <FilterGroup title='SEMESTER' options={semesters} value={semester} onSelect={v=>toggleExclusive(semester,setSemester,v)} />
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Student</p>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5'/>
                  <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder='Name, email, roll number...' className='w-full px-4 py-2.5 pl-10 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all duration-200'/>
                </div>
              </div>
            </div>
          </div>
          <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
          <div className='flex items-center gap-2 flex-wrap'>
            <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-medium'>Submit</button>
            <button type='button' onClick={reset} className='px-3 py-2 rounded border font-medium'>Reset</button>
            <button type='button' onClick={exportExcel} className='ml-3 px-4 py-2 rounded bg-green-600 text-white font-medium flex items-center gap-2'>
              <Download className='h-4 w-4' /> Export Data
            </button>
            {session?.user?.role === 'admin' && (
              <button type='button' onClick={() => setShowImport(!showImport)} className='px-4 py-2 rounded bg-purple-600 text-white font-medium flex items-center gap-2'>
                <Upload className='h-4 w-4' /> Import Students
              </button>
            )}
            <div className='ml-auto text-sm text-gray-600'>{submitted ? `${students.length} result(s)` : 'No results yet'}</div>
          </div>
        </form>

        {/* Import Section */}
        {showImport && session?.user?.role === 'admin' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className='card p-6 mb-6 space-y-4'>
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
                    <li>All imported students will be automatically approved and activated</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <button onClick={handleDownloadTemplate} className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors'>
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
            <button onClick={handleImport} disabled={!importFile || uploading} className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {uploading ? (<><div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div> Importing...</>) : (<><Upload className='h-4 w-4' /> Import Data</>)}
            </button>
          </motion.div>
        )}

        {/* Results */}
        {!submitted ? (
          <div className='text-center py-16'><p className='text-gray-500'>Use the filters above and click Submit.</p></div>
        ) : loading ? (
          <div className='text-center py-8 text-gray-500'>Loading...</div>
        ) : (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden'>
            {students.length === 0 ? (
              <div className='text-center py-12'>
                <Users className='mx-auto h-12 w-12 text-gray-400'/>
                <h3 className='mt-2 text-sm font-medium'>No students found</h3>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                  <thead className='bg-gray-50 dark:bg-gray-700'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Name</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Email</th>
                      {visibleFields.includes('roll') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Roll Number</th>}
                      {visibleFields.includes('phone') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Phone</th>}
                      {visibleFields.includes('semester') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Semester</th>}
                      {visibleFields.includes('department') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Department</th>}
                      {visibleFields.includes('university') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>University</th>}
                      {visibleFields.includes('institute') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Institute</th>}
                      {visibleFields.includes('address') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Address</th>}
                    </tr>
                  </thead>
                  <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                    {students.map((s, index) => (
                      <motion.tr key={s._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>{s.academicInfo?.name || s.email.split('@')[0]}</td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.email}</td>
                        {visibleFields.includes('roll') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.academicInfo?.rollNumber || '—'}</td>}
                        {visibleFields.includes('phone') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.academicInfo?.phoneNumber || '—'}</td>}
                        {visibleFields.includes('semester') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.academicInfo?.semester || '—'}</td>}
                        {visibleFields.includes('department') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.department || '—'}</td>}
                        {visibleFields.includes('university') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.university || '—'}</td>}
                        {visibleFields.includes('institute') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{s.institute || '—'}</td>}
                        {visibleFields.includes('address') && <td className='px-6 py-4 text-sm text-gray-900 dark:text-gray-300 max-w-xs truncate'>{s.academicInfo?.address || '—'}</td>}
                      </motion.tr>
                    ))}
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
            <button key={opt} type='button' onClick={()=>onSelect(opt)} className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{opt}</button>
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
            <label key={f.key} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm cursor-pointer select-none transition-all duration-200 font-semibold ${checked ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <input type='checkbox' className='hidden' checked={checked} onChange={()=>toggle(f.key)} />
              {f.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}
