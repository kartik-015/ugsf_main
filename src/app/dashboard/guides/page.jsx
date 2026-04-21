"use client"

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, AlertCircle, Download, Search, Copy, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GuidesPage(){
  const { data: session } = useSession()
  const canViewGuides = ['admin','mainadmin','principal','hod','project_coordinator'].includes(session?.user?.role)
  const canManageGuides = ['admin','mainadmin','hod','project_coordinator'].includes(session?.user?.role)

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dept, setDept] = useState('')
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef(null)
  const searchTimeout = useRef(null)

  const FIELD_OPTIONS = [
    { key: 'email', label: 'Email' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'status', label: 'Status' },
  ]
  const [visibleFields, setVisibleFields] = useState(['email','specialization','status'])
  const [guideProjectMap, setGuideProjectMap] = useState({})
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [importedCredentials, setImportedCredentials] = useState([])
  const [showCredentials, setShowCredentials] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)

  const departments = ['CSE','CE','IT']
  const roleOptions = ['guide','project_coordinator']
  const toggleExclusive = (current,setter,val)=> setter(current===val?'':val)
  const toggleField = key => setVisibleFields(prev => prev.includes(key)? prev.filter(k=>k!==key):[...prev,key])

  // Dynamic search
  const handleSearchInput = (value) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length >= 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const qs = [`search=${encodeURIComponent(value)}`]
          if (dept) qs.push(`department=${dept}`)
          const res = await fetch('/api/guides?' + qs.join('&'))
          if (res.ok) {
            const data = await res.json()
            setSearchResults(data.guides || [])
            setShowSearchDropdown(true)
          }
        } catch { /* ignore */ }
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchDropdown(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buildQuery = () => {
    const qs=[]
    if (dept) qs.push(`department=${dept}`)
    if (role) qs.push(`role=${role}`)
    if (search) qs.push(`search=${encodeURIComponent(search)}`)
    return qs.length?'?'+qs.join('&'):''
  }

  const fetchGuides = async () => {
    setLoading(true)
    setShowSearchDropdown(false)
    try {
      const res = await fetch('/api/guides'+buildQuery())
      if (res.ok){
        const data=await res.json()
        const guides = data.guides||[]
        setResults(guides)
        setSubmitted(true)
        // Fetch project assignment status for guides
        try {
          const projRes = await fetch('/api/projects')
          if (projRes.ok) {
            const projData = await projRes.json()
            const map = {}
            ;(projData.projects || []).forEach(p => {
              if (p.internalGuide?._id) {
                const gid = String(p.internalGuide._id)
                if (!map[gid]) map[gid] = []
                map[gid].push(p.title || p.groupId)
              }
            })
            setGuideProjectMap(map)
          }
        } catch { /* ignore */ }
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
      const res = await fetch('/api/guides/import')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'guide_import_template.xlsx'
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

  const handleImport = async (sendCredentials = false) => {
    if (!importFile) { toast.error('Please select a file first'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('sendCredentials', String(sendCredentials))
    try {
      const res = await fetch('/api/guides/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setImportFile(null)
        setShowImport(false)
        if (data.created?.length > 0) {
          setImportedCredentials(data.created)
          setShowCredentials(true)
        }
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

  const handleSendEmailsNow = async () => {
    if (!importedCredentials.length) return
    setSendingEmails(true)
    try {
      // Re-import with sendCredentials=true but only pass the credential list
      // Call a lightweight endpoint — we just need to send emails
      const res = await fetch('/api/guides/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmailsOnly: true, credentials: importedCredentials })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Credential emails sent to all guides')
      } else {
        toast.error(data.message || 'Failed to send emails')
      }
    } catch {
      toast.error('Failed to send emails')
    } finally {
      setSendingEmails(false)
    }
  }

  const copyToClipboard = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch { /* ignore */ }
  }

  const submit = e => { e.preventDefault(); fetchGuides() }
  const reset = () => { setDept(''); setRole(''); setSearch(''); setResults([]); setSubmitted(false) }

  if(!session || !canViewGuides) return null

  return (
    <div className='space-y-6'>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
        <div className='mb-6'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Guides Directory</h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>Academic staff listing</p>
        </div>
        <form onSubmit={submit} className='card p-6 mb-6 space-y-6'>
          <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='w-full'>
                <FilterGroup title='DEPARTMENT' options={departments} value={dept} onSelect={v=>toggleExclusive(dept,setDept,v)} />
              </div>
              <div className='w-full'>
                <FilterGroup title='ROLE' options={roleOptions} value={role} onSelect={v=>toggleExclusive(role,setRole,v)} />
              </div>
            </div>
            <div className='w-full' ref={searchRef}>
              <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>Search Guides</p>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5'/>
                <input value={search} onChange={e=>handleSearchInput(e.target.value)} placeholder='Start typing name or email...' className='w-full pl-10 px-4 py-2.5 border rounded text-sm bg-white dark:bg-gray-800 h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all duration-200'
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                />
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm max-h-60 overflow-y-auto'>
                    {searchResults.slice(0,10).map((g, i) => (
                      <div key={g._id || i} className='px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0'
                        onClick={() => { setSearch(g.email || g.academicInfo?.name || ''); setShowSearchDropdown(false) }}
                      >
                        <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700'>
                          {(g.academicInfo?.name || g.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className='font-medium text-gray-900 dark:text-gray-100'>{g.academicInfo?.name || g.email?.split('@')[0]}</div>
                          <div className='text-xs text-gray-500'>{g.department || ''} · {g.role || ''}</div>
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
            <button type='button' onClick={exportGuides} className='ml-3 px-4 py-2 rounded bg-green-600 text-white font-semibold flex items-center gap-2'>
              <Download className='h-4 w-4' /> Export Data
            </button>
            {canManageGuides && session?.user?.role === 'admin' && (
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
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                <div className='text-sm text-blue-800 dark:text-blue-200'>
                  <p className='font-semibold mb-1'>How Guide Import Works:</p>
                  <ul className='list-disc list-inside space-y-1'>
                    <li>Download the template and fill in: <strong>Name, Department, Phone, Specialization, Education</strong></li>
                    <li>Email is <strong>auto-generated</strong>: <code>firstname+lastname.dcs/dce/dit@charusat.ac.in</code></li>
                    <li>Password is <strong>auto-generated</strong>: e.g. <code>AkashPatel@DIT24</code></li>
                    <li>Existing guide emails are automatically skipped</li>
                    <li>After import, you can view and send credentials by email</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <button onClick={handleDownloadTemplate} className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors'>
                <FileSpreadsheet className='h-4 w-4' /> Download Template
              </button>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Select Excel File</label>
              <input type='file' accept='.xlsx,.xls' onChange={handleFileChange} className='block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2' />
              {importFile && <p className='mt-2 text-sm text-green-600 dark:text-green-400'>Selected: {importFile.name}</p>}
            </div>
            <div className='flex gap-3'>
              <button onClick={() => handleImport(false)} disabled={!importFile || uploading} className='flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                {uploading ? (<><div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div> Importing...</>) : (<><Upload className='h-4 w-4' /> Import & Show Credentials</>)}
              </button>
              <button onClick={() => handleImport(true)} disabled={!importFile || uploading} className='flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                {uploading ? (<><div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div> Importing...</>) : (<><Upload className='h-4 w-4' /> Import & Send Emails</>)}
              </button>
            </div>
          </motion.div>
        )}

        {/* Credentials Modal */}
        {showCredentials && importedCredentials.length > 0 && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className='bg-white dark:bg-gray-800 rounded shadow-sm w-full max-w-2xl max-h-[80vh] flex flex-col'>
              <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
                <div>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white'>Import Complete — {importedCredentials.length} Guide(s) Created</h3>
                  <p className='text-sm text-gray-500 mt-1'>Save these credentials. Passwords cannot be recovered later.</p>
                </div>
                <button onClick={() => setShowCredentials(false)} className='text-gray-400 hover:text-gray-600 text-xl font-bold'>✕</button>
              </div>
              <div className='overflow-y-auto flex-1 p-6 space-y-3'>
                {importedCredentials.map((cred, idx) => (
                  <div key={idx} className='rounded border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='font-semibold text-gray-900 dark:text-gray-100'>{cred.name}</span>
                      <span className='text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded'>{cred.department}</span>
                    </div>
                    <div className='space-y-1 text-sm'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-gray-500 w-20 flex-shrink-0'>Email</span>
                        <span className='font-mono text-gray-800 dark:text-gray-200 truncate flex-1'>{cred.email}</span>
                        <button onClick={() => copyToClipboard(cred.email, `e${idx}`)} className='text-gray-400 hover:text-blue-600 flex-shrink-0'>
                          {copiedIdx === `e${idx}` ? <CheckCheck className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4' />}
                        </button>
                      </div>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-gray-500 w-20 flex-shrink-0'>Password</span>
                        <span className='font-mono text-gray-800 dark:text-gray-200 flex-1'>{cred.password}</span>
                        <button onClick={() => copyToClipboard(cred.password, `p${idx}`)} className='text-gray-400 hover:text-blue-600 flex-shrink-0'>
                          {copiedIdx === `p${idx}` ? <CheckCheck className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4' />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className='p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3'>
                <button onClick={handleSendEmailsNow} disabled={sendingEmails} className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold transition-colors disabled:opacity-50'>
                  {sendingEmails ? (<><div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div> Sending...</>) : 'Send Credentials via Email'}
                </button>
                <button onClick={() => setShowCredentials(false)} className='px-6 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold'>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Results */}
        {!submitted ? (
          <div className='text-center py-16'><p className='text-gray-500'>Use the filters above and click Submit.</p></div>
        ) : loading ? (
          <div className='text-center py-8 text-gray-500'>Loading...</div>
        ) : (
          <div className='bg-white dark:bg-gray-800 rounded shadow overflow-hidden'>
            {results.length === 0 ? (
              <div className='text-center py-12'>
                <h3 className='mt-2 text-sm font-medium'>No guides found</h3>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full min-w-[500px] divide-y divide-gray-200 dark:divide-gray-700'>
                  <thead className='bg-gray-50 dark:bg-gray-700'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Name</th>
                      {visibleFields.includes('email') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Email</th>}
                      {visibleFields.includes('specialization') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Specialization</th>}
                      {visibleFields.includes('status') && <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>Status</th>}
                    </tr>
                  </thead>
                  <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                    {results.map((f, index) => (
                      <motion.tr key={f._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>{f.academicInfo?.name || f.email.split('@')[0]}</td>
                        {visibleFields.includes('email') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.email}</td>}
                        {visibleFields.includes('specialization') && <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300'>{f.specialization || '—'}</td>}
                        {visibleFields.includes('status') && (
                          <td className='px-6 py-4 whitespace-nowrap text-sm'>
                            {guideProjectMap[String(f._id)] ? (
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' title={guideProjectMap[String(f._id)].join(', ')}>
                                Assigned ({guideProjectMap[String(f._id)].length} group{guideProjectMap[String(f._id)].length !== 1 ? 's' : ''})
                              </span>
                            ) : (
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'>
                                Not Assigned
                              </span>
                            )}
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
  const formatTitle = (text) => text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  const formatOptionText = (text) => {
    if (title === 'ROLE') {
      // Replace underscores with spaces and capitalize each word
      return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    }
    return text
  }
  return (
    <div>
      <p className='text-sm font-bold tracking-wider mb-3 text-gray-600 dark:text-gray-300'>{formatTitle(title)}</p>
      <div className='flex flex-wrap gap-3'>
        {options.map(opt => {
          const checked = value === opt
          return (
            <button key={opt} type='button' onClick={()=>onSelect(opt)} className={`px-4 py-2.5 rounded border text-sm font-semibold transition-all duration-200 ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
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
            <label key={f.key} className={`flex items-center gap-2 px-4 py-2.5 rounded border text-sm cursor-pointer select-none transition-all duration-200 font-semibold ${checked ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <input type='checkbox' className='hidden' checked={checked} onChange={()=>toggle(f.key)} />
              {f.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

