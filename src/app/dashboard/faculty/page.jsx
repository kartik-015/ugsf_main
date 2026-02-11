'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function GuidesDirectoryPage(){
  const { data: session } = useSession()
  const [results, setResults] = useState([])
  const [dept, setDept] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedInstitute, setSelectedInstitute] = useState('')
  const isAdmin = ['admin','mainadmin'].includes(session?.user?.role)

  const instituteDepartments = {
    'DEPSTAR': ['CSE','CE','IT','EC','ME','CIVIL'],
    'GCET': ['CSE','CE','IT','EC','ME','CH'],
    'SCHOOL OF BUSINESS': ['MBA','BBA'],
  }
  const institutes = ['DEPSTAR','GCET','SCHOOL OF BUSINESS']


  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
  let url = '/api/guides'
      const qs = []
      if (dept) qs.push(`department=${dept}`)
      if (search) qs.push(`search=${encodeURIComponent(search)}`)
      // default to faculty if no role selected to avoid returning students
  const roleToUse = role || 'guide'
      if (roleToUse) qs.push(`role=${roleToUse}`)
      if (qs.length) url += `?${qs.join('&')}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json(); setResults(data.guides || [])
        setSubmitted(true)
      } else {
        const err = await res.json()
        toast.error(err.message || 'Failed to load results')
        setResults([])
      }
    } catch { toast.error('Failed to load results') }
    setLoading(false)
  }

  const handleReset = () => {
    setDept('')
    setSearch('')
    setRole('')
    setResults([])
    setSubmitted(false)
  }

  if (!session || !isAdmin) return null

  // departments list will be derived from selected institute or defaults
  const roles = [
    { value: '', label: 'All Roles' },
    { value: 'guide', label: 'Guide' },
    { value: 'admin', label: 'Admin' }
  ]
  const defaultDepartments = ['CSE','IT','CE','ME','EC','CH','DIT']
  const departments = selectedInstitute && instituteDepartments[selectedInstitute] ? instituteDepartments[selectedInstitute] : defaultDepartments

  return (
    <div className='space-y-6'>
      <form className='flex flex-wrap gap-4 items-end' onSubmit={handleSubmit}>
  <div>
          <h1 className='text-2xl font-bold'>Directory</h1>
          <p className='text-sm text-gray-500'>{isAdmin ? 'All departments' : `Department: ${session.user.department}`}</p>
        </div>
        {isAdmin && (
          <select value={selectedInstitute} onChange={e => setSelectedInstitute(e.target.value)} className='px-3 py-2 border rounded text-sm bg-white dark:bg-gray-800'>
            <option value=''>All Institutes</option>
            {institutes.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
        <select value={role} onChange={e => setRole(e.target.value)} className='px-3 py-2 border rounded text-sm bg-white dark:bg-gray-800'>
          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={dept} onChange={e => setDept(e.target.value)} className='px-3 py-2 border rounded text-sm bg-white dark:bg-gray-800'>
          <option value=''>All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className='flex items-center gap-2'>
          <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-semibold'>Submit</button>
          <button type='button' onClick={() => { setDept(''); setSearch(''); setRole(''); setResults([]); setSubmitted(false); setSelectedInstitute('') }} className='px-3 py-2 rounded border'>Reset</button>
          <button type='button' onClick={async () => {
            try {
              if (!results || results.length === 0) { toast('No results to export'); return }
              const ids = results.map(r => r._id)
              const res = await fetch('/api/students/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
              })
              if (!res.ok) { const j = await res.json().catch(()=>({})); toast.error(j.message || 'Export failed'); return }
              const blob = await res.blob()
              const urlObj = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = urlObj
              a.download = 'students_export.xlsx'
              document.body.appendChild(a)
              a.click()
              a.remove()
              window.URL.revokeObjectURL(urlObj)
            } catch (err) { console.error(err); toast.error('Export failed') }
          }} className='px-3 py-2 rounded bg-green-600 text-white'>Download</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search name/email' className='px-3 py-2 border rounded text-sm flex-1 min-w-[240px] bg-white dark:bg-gray-800' />
        <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-semibold'>Submit</button>
      </form>
      {loading ? (
        <div className='text-center py-8 text-gray-500'>Loading...</div>
      ) : (
        <div>
          <div className='flex items-center justify-between mb-4'>
            <div className='text-sm text-gray-500'>{submitted ? `${results.length} result(s)` : 'No results yet'}</div>
            <div>
              <button onClick={handleReset} className='px-3 py-1 mr-2 text-sm rounded border'>Reset</button>
            </div>
          </div>

          <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {results.length === 0 ? (
              <div className='col-span-full text-sm text-gray-500'>No results found.</div>
            ) : (
              results.map(f => (
                <motion.div key={f._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className='p-4 rounded-lg border bg-white dark:bg-gray-800 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-semibold text-sm'>{f.academicInfo?.name || f.email.split('@')[0]}</h3>
                    <span className='text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100'>{f.role}</span>
                  </div>
                  <p className='text-[11px] text-gray-500 break-all'>{f.email}</p>
                  <p className='text-[11px] text-gray-500'>{f.department}</p>
                  {f.specialization && <p className='text-[11px] text-gray-600 dark:text-gray-300'>Spec: {f.specialization}</p>}
                  {f.education && <p className='text-[11px] text-gray-600 dark:text-gray-300'>Edu: {f.education}</p>}
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
