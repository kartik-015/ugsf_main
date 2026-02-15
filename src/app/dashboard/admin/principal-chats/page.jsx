"use client"
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function PrincipalChatsPage(){
  const { data: session } = useSession()
  const [pages,setPages] = useState([])
  const [loading,setLoading] = useState(true)
  const isAdmin = ['admin','mainadmin'].includes(session?.user?.role)

  useEffect(()=>{
    if(!isAdmin) return
    const load = async () => {
      try { const res = await fetch('/api/principal-chat?mode=pages'); if(res.ok){ const data=await res.json(); setPages(data.pages||[]) } } catch{} finally { setLoading(false) }
    }
    load()
  },[isAdmin])

  if(!isAdmin) return null
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Principal Feedback Pages</h1>
        <p className="text-sm text-gray-500">Recent pages where principal sent messages</p>
      </div>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-3">
          {pages.length===0 && <div className="text-sm text-gray-500">No messages yet.</div>}
          {pages.map(p=> (
            <div key={p._id} className="p-4 rounded border bg-white dark:bg-gray-800 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{p._id}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{p.lastMessage}</div>
              </div>
              <Link href={p._id} className="text-xs text-blue-600 underline">Open Page</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
