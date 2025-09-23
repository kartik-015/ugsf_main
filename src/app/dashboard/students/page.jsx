'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const { data: session } = useSession()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  // Removed admissionYear per new requirements
  const [university, setUniversity] = useState('')
  const [institute, setInstitute] = useState('')
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
  const [visibleFields, setVisibleFields] = useState(['roll','semester','department','university','institute'])

  const toggleExclusive = (currentValue, setter, value) => {
    setter(currentValue === value ? '' : value)
  }
  const toggleField = (key) => setVisibleFields(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev,key])

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (department) params.append('department', department)
      if (semester) params.append('semester', semester)
  if (searchTerm) params.append('search', searchTerm)
  if (university) params.append('university', university)
  if (institute) params.append('institute', institute)
      const response = await fetch(`/api/students?${params.toString()}`)
      if (response.ok) {
        const data = await response.json(); setStudents(data.students || [])
      } else toast.error('Failed to fetch students')
    } catch { toast.error('Error fetching students') } finally { setLoading(false) }
  }, [searchTerm, department, semester, university, institute])

  const baseDepartments = ['CSE','CE','IT']
  const cspitExtras = ['ME','EC','CIVIL']
  const departments = institute === 'CSPIT' ? [...baseDepartments, ...cspitExtras] : baseDepartments
  const universities = ['CHARUSAT','Others']
  const institutes = ['CSPIT','DEPSTAR','Others']
  const semesters = ['1','2','3','4','5','6','7','8']
  // admissionYears removed

  const submitHandler = async (e) => { e.preventDefault(); setLoading(true); await fetchStudents(); setSubmitted(true) }
  const reset = () => { setDepartment(''); setSemester(''); setSearchTerm(''); setUniversity(''); setInstitute(''); setStudents([]); setSubmitted(false) }

  const exportExcel = async () => {
    try {
      if (!students.length) { toast('No students to export'); return }
      const ids = students.map(s=>s._id)
      const res = await fetch('/api/students/export', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, fields: visibleFields }) })
      if (!res.ok) { const j = await res.json().catch(()=>({})); toast.error(j.message || 'Export failed'); return }
      const blob = await res.blob(); const urlObj = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=urlObj; a.download='students_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlObj)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold'>Students</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>{session?.user?.role==='admin' ? 'Manage all students' : 'View students'}</p>
        </div>
        <form onSubmit={submitHandler} className='card p-6 mb-6 space-y-6'>
          <div className={`${session?.user?.role==='admin' ? 'space-y-6' : 'space-y-6'}`}>
            {/* Row 1: University, Institute, Department */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='w-full'><FilterGroup title='UNIVERSITY' options={universities} value={university} onSelect={v=>toggleExclusive(university,setUniversity,v)} /></div>
              <div className='w-full'><FilterGroup title='INSTITUTE' options={institutes} value={institute} onSelect={v=>toggleExclusive(institute,setInstitute,v)} /></div>
              <div className='w-full'><FilterGroup title='DEPARTMENT' options={departments} value={department} onSelect={v=>toggleExclusive(department,setDepartment,v)} /></div>
            </div>
            
            {/* Row 2: Semester and Search */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'><FilterGroup title='SEMESTER' options={semesters} value={semester} onSelect={v=>toggleExclusive(semester,setSemester,v)} /></div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Students</p>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5'/>
                  <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder='Name, email, roll number...' className='input pl-10 w-full h-11'/>
                </div>
              </div>
            </div>
          </div>
          <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
          <div className='flex items-center gap-2'>
            <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white'>Submit</button>
            <button type='button' onClick={reset} className='px-3 py-2 rounded border'>Reset</button>
            <button type='button' onClick={exportExcel} className='ml-3 px-4 py-2 rounded bg-green-600 text-white'>Download</button>
            <div className='ml-auto text-sm text-gray-600'>{submitted ? `${students.length} result(s)` : 'No results yet'}</div>
          </div>
        </form>
        {!submitted ? (<div className='text-center py-16'><p className='text-gray-500'>Use the filters above and click Submit.</p></div>) : (
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
                      <motion.tr
                        key={s._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150'
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {s.academicInfo?.name || s.email.split('@')[0]}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {s.email}
                        </td>
                        {visibleFields.includes('roll') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                            {s.academicInfo?.rollNumber || '—'}
                          </td>
                        )}
                        {visibleFields.includes('phone') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                            {s.academicInfo?.phoneNumber || '—'}
                          </td>
                        )}
                        {visibleFields.includes('semester') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                            {s.academicInfo?.semester || '—'}
                          </td>
                        )}
                        {visibleFields.includes('department') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                            {s.department || '—'}
                          </td>
                        )}
                        {visibleFields.includes('university') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                            {s.university || '—'}
                          </td>
                        )}
                        {visibleFields.includes('institute') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                            {s.institute || '—'}
                          </td>
                        )}
                        {visibleFields.includes('address') && (
                          <td className='px-6 py-4 text-sm text-gray-900 dark:text-gray-300 max-w-xs truncate'>
                            {s.academicInfo?.address || '—'}
                          </td>
                        )}
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
  // Format title to proper case
  const formatTitle = (text) => {
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }
  
  // Force all semesters to display in one line (no grid)
  const isSemester = title === 'SEMESTER'
  
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
