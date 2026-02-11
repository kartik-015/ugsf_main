"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, AlertCircle, Download } from 'lucide-react'
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
  const [university, setUniversity] = useState('CHARUSAT')

  const FIELD_OPTIONS = [
    { key: 'department', label: 'Department' },
    { key: 'role', label: 'Role' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'education', label: 'Education' },
    { key: 'email', label: 'Email' },
    { key: 'university', label: 'University' },
    { key: 'institute', label: 'Institute' },
  ]
  const [visibleFields, setVisibleFields] = useState(['department','role','email','university'])
  const [showImport, setShowImport] = useState(false)
  const [importMode, setImportMode] = useState('append')
  const [importFile, setImportFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const departments = ['CSE','CE','IT']
  const roleOptions = ['guide','hod','admin','mainadmin']
  const toggleExclusive = (current,setter,val)=> setter(current===val?'':val)
  const toggleField = key => setVisibleFields(prev => prev.includes(key)? prev.filter(k=>k!==key):[...prev,key])

  const buildQuery = () => {
    const qs=[]
    if (dept) qs.push(`department=${dept}`)
    if (role) qs.push(`role=${role}`)
    if (search) qs.push(`search=${encodeURIComponent(search)}`)
    if (university) qs.push(`university=${university}`)
    qs.push(`institute=DEPSTAR`)
    return qs.length?'?'+qs.join('&'):''
  }

  const fetchGuides = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/guides'+buildQuery())
      if (res.ok){
        const data=await res.json()
        setResults(data.guides||[])
        setSubmitted(true)
      } else {
        const err=await res.json().catch(()=>({}))
        toast.error(err.message||'Failed to load')
      }
    } catch {
      toast.error('Failed to load')
    }
    setLoading(false)
  }

  const exportGuides = async () => {
    try {
      if(!results.length){ toast('No guides to export'); return }
      const ids = results.map(r=>r._id)
      const res = await fetch('/api/guides/export',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, fields: visibleFields }) })
      if(!res.ok){ const j=await res.json().catch(()=>({})); toast.error(j.message||'Export failed'); return }
      const blob = await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='guides_export.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch { toast.error('Export failed') }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/admin/import-export?type=template&userType=guide')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'guide_template.xlsx'
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
    formData.append('userType', 'guide')
    try {
      const res = await fetch('/api/admin/import-export', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        if (data.results?.errors?.length > 0) console.log('Import errors:', data.results.errors)
        setImportFile(null)
        setShowImport(false)
        if (submitted) await fetchGuides()
      } else {
        toast.error(data.message || 'Import failed')
      }
    } catch {
      toast.error('Error importing file')
    } finally {
      setUploading(false)
    }
  }

  const submit = e => { e.preventDefault(); fetchGuides() }
  const reset = () => { setDept(''); setRole(''); setSearch(''); setUniversity('CHARUSAT'); setResults([]); setSubmitted(false) }

  if(!session || !isAdmin) return null

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold'>Guides Directory</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>Academic staff listing</p>
        </div>
        <form onSubmit={submit} className='card p-6 mb-6 space-y-6'>
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
                <FilterGroup title='DEPARTMENT' options={departments} value={dept} onSelect={v=>toggleExclusive(dept,setDept,v)} />
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'>
                <FilterGroup title='ROLE' options={roleOptions} value={role} onSelect={v=>toggleExclusive(role,setRole,v)} />
              </div>
              <div className='w-full'>
                <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Guides</p>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Name/email' className='w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all duration-200'/>
              </div>
            </div>
          </div>
          <FieldSelector fields={FIELD_OPTIONS} visible={visibleFields} toggle={toggleField} />
          <div className='flex items-center gap-2 flex-wrap'>
            <button type='submit' className='px-4 py-2 rounded bg-blue-600 text-white font-semibold'>Submit</button>
            <button type='button' onClick={reset} className='px-3 py-2 rounded border'>Reset</button>
            <button type='button' onClick={exportGuides} className='ml-3 px-4 py-2 rounded bg-green-600 text-white font-semibold flex items-center gap-2'>
              <Download className='h-4 w-4' /> Export Data
            </button>
            {session?.user?.role === 'admin' && (
              <button type='button' onClick={() => setShowImport(!showImport)} className='px-4 py-2 rounded bg-purple-600 text-white font-semibold flex items-center gap-2'>
                <Upload className='h-4 w-4' /> Import Guides
              </button>
            )}
            <div className='ml-auto text-sm text-gray-500'>{submitted ? `${results.length} result(s)` : 'No results yet'}</div>
          </div>
        </form>

        {/* Import Section */}
        {showImport && session?.user?.role === 'admin' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className='card p-6 mb-6 space-y-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold flex items-center gap-2'><Upload className='h-5 w-5' /> Import Guides from Excel</h3>
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
                    <li>All imported guides will be automatically approved and activated</li>
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

        {/* Results */}
        {!submitted ? (
          <div className='text-center py-16'><p className='text-gray-500'>Use the filters above and click Submit.</p></div>
        ) : loading ? (
          <div className='text-center py-8 text-gray-500'>Loading...</div>
        ) : (
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden'>
            {results.length === 0 ? (
              <div className='text-center py-12'>
                <h3 className='mt-2 text-sm font-medium'>No guides found</h3>
              </div>
            ) : (
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
                      <motion.tr key={f._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>{f.academicInfo?.name || f.email.split('@')[0]}</td>
                        {visibleFields.includes('email') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.email}</td>}
                        {visibleFields.includes('department') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.department || '—'}</td>}
                        {visibleFields.includes('role') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm'>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${f.role === 'hod' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'}`}>
                              {f.role === 'hod' ? 'HOD' : f.role === 'guide' ? 'Guide' : f.role?.toUpperCase() || '—'}
                            </span>
                          </td>
                        )}
                        {visibleFields.includes('university') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.university || '—'}</td>}
                        {visibleFields.includes('institute') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.institute || '—'}</td>}
                        {visibleFields.includes('specialization') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.specialization || '—'}</td>}
                        {visibleFields.includes('education') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.education || '—'}</td>}
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
  const formatOptionText = (text) => {
    if (title === 'ROLE') return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    return text
  }
  return (
    <div>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>{formatTitle(title)}</p>
      <div className='flex flex-wrap gap-3'>
        {options.map(opt => {
          const checked = value === opt
          return (
            <button key={opt} type='button' onClick={()=>onSelect(opt)} className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
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

