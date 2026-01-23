"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function GuidesPage(){
  const { data: session } = useSession()
  const isAdmin = ['admin','mainadmin','principal','hod'].includes(session?.user?.role)

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dept, setDept] = useState('')
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [university, setUniversity] = useState('')
  const [institute, setInstitute] = useState('')

  const FIELD_OPTIONS = [
    { key: 'department', label: 'Department' },
    { key: 'role', label: 'Role' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'education', label: 'Education' },
    { key: 'email', label: 'Email' },
    { key: 'university', label: 'University' },
    { key: 'institute', label: 'Institute' }
  ]
  const [visibleFields, setVisibleFields] = useState(['department','role','email','university','institute'])

  const baseDepartments = ['CSE','CE','IT']
  //const cspitExtras = ['ME','EC','CIVIL']
  const departments = institute === 'CSPIT' ? [...baseDepartments, ...cspitExtras] : baseDepartments
  const roleOptions = ['guide','hod','admin','mainadmin']
  const universities = ['CHARUSAT','Others']
  const institutes = ['DEPSTAR','Others']
  const toggleExclusive = (current,setter,val)=> setter(current===val?'':val)
  const toggleField = key => setVisibleFields(prev => prev.includes(key)? prev.filter(k=>k!==key):[...prev,key])

  const buildQuery = () => {
    const qs=[]
  if (dept) qs.push(`department=${dept}`)
  if (role) qs.push(`role=${role}`)
  if (search) qs.push(`search=${encodeURIComponent(search)}`)
  if (university) qs.push(`university=${university}`)
  if (institute) qs.push(`institute=${institute}`)
    return qs.length?'?'+qs.join('&'):''
  }
  const fetchGuides = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/guides'+buildQuery())
      if (res.ok){ const data=await res.json(); setResults(data.guides||[]); setSubmitted(true) }
      else { const err=await res.json().catch(()=>({})); toast.error(err.message||'Failed to load') }
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  const exportGuides = async () => {
    try { if(!results.length){ toast('No guides to export'); return }
      const ids = results.map(r=>r._id)
      const res = await fetch('/api/guides/export',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, fields: visibleFields }) })
      if(!res.ok){ const j=await res.json().catch(()=>({})); toast.error(j.message||'Export failed'); return }
      const blob = await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='guides_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { toast.error('Export failed') }
  }
  const submit = e => { e.preventDefault(); fetchGuides() }
  const reset = () => { setDept(''); setRole(''); setSearch(''); setUniversity(''); setInstitute(''); setResults([]); setSubmitted(false) }
  if(!session || !isAdmin) return null

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold'>Guides Directory</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>Academic staff listing</p>
        </div>
        <form onSubmit={submit} className='card p-6 mb-6 space-y-6'>
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
                <FilterGroup title='DEPARTMENT' options={departments} value={dept} onSelect={v=>toggleExclusive(dept,setDept,v)} />
              </div>
            </div>
            
            {/* Row 2: Role and Search */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'>
                <FilterGroup title='ROLE' options={roleOptions} value={role} onSelect={v=>toggleExclusive(role,setRole,v)} />
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Guides</p>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Name/email' className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200'/>
              </div>
            </div>
          </div>
        <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
        <div className='flex items-center gap-2'>
          <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-semibold'>Submit</button>
          <button type='button' onClick={reset} className='px-3 py-2 rounded border'>Reset</button>
          <button type='button' onClick={exportGuides} className='ml-3 px-4 py-2 rounded bg-green-600 text-white'>Download</button>
          <div className='ml-auto text-sm text-gray-500'>{submitted ? `${results.length} result(s)` : 'No results yet'}</div>
        </div>
      </form>
      </motion.div>
      {loading ? <div className='text-center py-8 text-gray-500'>Loading...</div> : (
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden'>
          {submitted && results.length === 0 ? (
            <div className='text-center py-12'>
              <h3 className='mt-2 text-sm font-medium'>No guides found</h3>
            </div>
          ) : results.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Name</th>
                    {visibleFields.includes('email') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Email</th>}
                    {visibleFields.includes('department') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Department</th>}
                    {visibleFields.includes('role') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Role</th>}
                    {visibleFields.includes('university') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>University</th>}
                    {visibleFields.includes('institute') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Institute</th>}
                    {visibleFields.includes('specialization') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Specialization</th>}
                    {visibleFields.includes('education') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Education</th>}
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                  {results.map((f, index) => (
                    <motion.tr
                      key={f._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {f.academicInfo?.name || f.email.split('@')[0]}
                      </td>
                      {visibleFields.includes('email') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {f.email}
                        </td>
                      )}
                      {visibleFields.includes('department') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {f.department || '—'}
                        </td>
                      )}
                      {visibleFields.includes('role') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-300 font-medium'>
                          {f.role || '—'}
                        </td>
                      )}
                      {visibleFields.includes('university') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {f.university || '—'}
                        </td>
                      )}
                      {visibleFields.includes('institute') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {f.institute || '—'}
                        </td>
                      )}
                      {visibleFields.includes('specialization') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {f.specialization || '—'}
                        </td>
                      )}
                      {visibleFields.includes('education') && (
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>
                          {f.education || '—'}
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
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
  
  // Only format role options, keep others as they are
  const formatOptionText = (text) => {
    if (title === 'ROLE') {
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

