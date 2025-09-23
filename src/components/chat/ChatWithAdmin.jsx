"use client"
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send } from 'lucide-react'

export default function ChatWithAdmin(){
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open,setOpen] = useState(false)
  const [messages,setMessages] = useState([])
  const [input,setInput] = useState('')
  const [loading,setLoading] = useState(false)
  const [initialLoaded,setInitialLoaded] = useState(false)
  const bottomRef = useRef(null)

  const isPrincipal = session?.user?.role === 'principal'
  const isAdmin = ['admin','mainadmin'].includes(session?.user?.role)

  useEffect(()=>{
    if(!session) return
    // identify user to socket server for targeted events
    try { window?.socket?.emit && window.socket.emit('auth:identify', session.user.id) } catch {}
  },[session])

  const loadMessages = useCallback(async () => {
    if(!pathname) return
    setLoading(true)
    try {
      const res = await fetch(`/api/principal-chat?page=${encodeURIComponent(pathname)}`)
      if(res.ok){ const data = await res.json(); setMessages(data.messages||[]) }
    } catch{} finally { setLoading(false); setInitialLoaded(true) }
  },[pathname])

  useEffect(()=>{ if(open && !initialLoaded) loadMessages() },[open, initialLoaded, loadMessages])

  useEffect(()=>{
    const s = window?.socket
    if(!s) return
    const onPrincipal = (p)=>{
      if(p.page===pathname) setMessages(m=>[...m, { _id:p.id||p.tempId||Math.random().toString(36), message:p.message, roleFrom:'principal', from:{ _id:p.fromUserId }, createdAt:p.at||new Date().toISOString() }])
    }
    const onAdmin = (p)=>{
      if(p.page===pathname) setMessages(m=>[...m, { _id:p.id||p.tempId||Math.random().toString(36), message:p.message, roleFrom:'admin', from:{ _id:p.fromUserId }, createdAt:p.at||new Date().toISOString() }])
    }
    s.on('principal:message', onPrincipal)
    s.on('admin:reply', onAdmin)
    return ()=>{ s.off('principal:message', onPrincipal); s.off('admin:reply', onAdmin) }
  },[pathname])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }) },[messages, open])

  const sendMessage = async () => {
    if(!input.trim()) return
    const text = input.trim()
    setInput('')
    // optimistic
    const tempId = `temp-${Date.now()}`
    setMessages(m=>[...m, { _id:tempId, message:text, roleFrom:isPrincipal?'principal':'admin', createdAt:new Date().toISOString() }])
    try {
      const res = await fetch('/api/principal-chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ page: pathname, pageTitle: document?.title, message: text }) })
      if(!res.ok){ /* revert? */ }
    } catch {}
  }

  if(!session || (!isPrincipal && !isAdmin)) return null

  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} className="fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none">
        {open ? <X className="w-5 h-5"/> : <MessageSquare className="w-5 h-5"/>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0, y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}} className="fixed bottom-24 right-6 z-40 w-80 max-h-[60vh] flex flex-col rounded-xl border bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
              <span>Chat with Admin</span>
              <button onClick={()=>setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {loading && <div className="text-gray-500">Loading...</div>}
              {messages.map(m=>{
                const mine = (isPrincipal && m.roleFrom==='principal') || (!isPrincipal && m.roleFrom!=='principal')
                return (
                  <div key={m._id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-lg max-w-[70%] whitespace-pre-wrap break-words ${mine?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}>{m.message}</div>
                  </div>
                )
              })}
              <div ref={bottomRef}/>
            </div>
            <div className="p-2 border-t flex items-center gap-2">
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); sendMessage() } }} placeholder="Type message" className="flex-1 px-2 py-1.5 text-xs rounded border bg-white dark:bg-gray-900"/>
              <button onClick={sendMessage} className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700"><Send className="w-4 h-4"/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
