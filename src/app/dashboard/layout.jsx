'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home,
  User,
  Bell,
  Search,
  Check,
  ExternalLink
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const ChatWithAdmin = dynamic(() => import('@/components/chat/ChatWithAdmin'), { ssr:false })

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin','mainadmin','principal','hod','project_coordinator','guide'] },
  { name: 'Students', href: '/dashboard/students', icon: Users, roles: ['admin','mainadmin'] },
  { name: 'Guides', href: '/dashboard/guides', icon: User, roles: ['admin','mainadmin'] },
  { name: 'Projects', href: '/dashboard/projects', icon: Calendar, roles: ['student','guide','hod','admin','mainadmin','principal','project_coordinator'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin','mainadmin','principal','guide','student','hod','project_coordinator'] },
]

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const notifRef = useRef(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/')
      return
    }

    // Check if user must change password first
    if (session.user.mustChangePassword && pathname !== '/change-password') {
      router.push('/change-password')
      return
    }

    // Check if user needs onboarding (any role) but honor temporary cookie set immediately after completion
    // Guides and admins are always considered onboarded (all info collected during registration)
    const roleSkipsOnboarding = ['guide', 'admin', 'mainadmin', 'hod', 'principal', 'project_coordinator', 'pc'].includes(session.user.role)
    let cookieOnboarded = false
    try {
      const cookieStr = document.cookie || ''
      const match = cookieStr.split(';').map(s=>s.trim()).find(s=>s.startsWith('onboarded='))
      if (match) {
        const val = decodeURIComponent(match.split('=')[1])
        if (val && session.user.id && val === session.user.id) cookieOnboarded = true
      }
    } catch {}
    const needsOnboarding = !roleSkipsOnboarding && !(session.user.isOnboarded || cookieOnboarded)
    if (needsOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding')
      return
    }

    // Students go directly to projects page, not dashboard
    if (session.user.role === 'student' && pathname === '/dashboard') {
      router.replace('/dashboard/projects')
      return
    }
  }, [session, status, router, pathname])

  // Separate effect for redirects to avoid issues
  useEffect(() => {
    if (status === 'loading' || !session) return
    const role = session.user.role
    // Only admin and mainadmin go to /dashboard/admin
    if (pathname === '/dashboard' && (role === 'admin' || role === 'mainadmin')) {
      router.replace('/dashboard/admin')
    }
    // HOD, Principal, Project Coordinator go to /dashboard/projects
    if (pathname === '/dashboard' && (role === 'hod' || role === 'principal' || role === 'project_coordinator')) {
      router.replace('/dashboard/projects')
    }
  }, [session, status, router, pathname])

  // Poll notifications for all roles
  useEffect(() => {
    let timer
    const fetchNotifications = async () => {
      if (!session) return
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {}
      timer = setTimeout(fetchNotifications, 15000)
    }
    fetchNotifications()
    return () => { if (timer) clearTimeout(timer) }
  }, [session])

  // Click-outside handler for notification panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId }) })
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) markAsRead(notif._id)
    if (notif.link) {
      router.push(notif.link)
      setShowNotifications(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
  try { document.cookie = 'onboarded=; Max-Age=0; path=/' } catch {}
      router.push('/')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(session?.user?.role)
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-foreground font-semibold">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Don't render layout during admin or student redirect
  if (pathname === '/dashboard' && ['admin','principal','hod','project_coordinator','student'].includes(session.user.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-gray-600 bg-opacity-75" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg lg:hidden border-r border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-gray-800">
              <h1 className="text-xl font-bold text-blue-900 dark:text-white">
                EvalProX
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="mt-2 px-3 space-y-0.5">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded transition-colors duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-400'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </motion.a>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold text-blue-900 dark:text-white">
              EvalProX
            </h1>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-400'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </motion.a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search bar - hidden on very small screens, shown on sm+ */}
            <div className="hidden sm:flex flex-1 max-w-lg mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 overflow-hidden notif-dropdown"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-gray-800">
                        <h3 className="font-bold text-foreground">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-[60vh] divide-y divide-border">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 30).map(notif => (
                            <div
                              key={notif._id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${!notif.isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                                  <p className="text-xs text-muted-foreground/60 mt-1">
                                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {notif.link && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User dropdown */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {session.user.academicInfo?.name || session.user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize font-medium">
                      {session.user.role}
                    </p>
                  </div>
                </button>
              </div>

              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-150"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
          {/* Principal/Admin contextual chat */}
          <ChatWithAdmin />
        </main>
      </div>
    </div>
  )
}