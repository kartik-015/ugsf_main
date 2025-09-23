'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home,
  User,
  Shield,
  Bell,
  Search
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const ChatWithAdmin = dynamic(() => import('@/components/chat/ChatWithAdmin'), { ssr:false })

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Students', href: '/dashboard/students', icon: Users, roles: ['admin','mainadmin','principal','hod'] },
  { name: 'Guides', href: '/dashboard/guides', icon: User, roles: ['admin','mainadmin','principal','hod'] },
  { name: 'Subjects', href: '/dashboard/subjects', icon: BookOpen, roles: ['admin','guide','hod','mainadmin','principal'] },
  { name: 'Projects', href: '/dashboard/projects', icon: Calendar, roles: ['student','guide','hod','admin','mainadmin','principal'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin','mainadmin','principal','guide','student','hod'] },
]

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/')
      return
    }

    // Check if user needs onboarding (any role) but honor temporary cookie set immediately after completion
    let cookieOnboarded = false
    try {
      const cookieStr = document.cookie || ''
      const match = cookieStr.split(';').map(s=>s.trim()).find(s=>s.startsWith('onboarded='))
      if (match) {
        const val = decodeURIComponent(match.split('=')[1])
        if (val && session.user.id && val === session.user.id) cookieOnboarded = true
      }
    } catch {}
    const needsOnboarding = !(session.user.isOnboarded || cookieOnboarded)
    if (needsOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding')
      return
    }

    // If on /dashboard, redirect to role-specific dashboard
    if (pathname === '/dashboard') {
      if (session.user.role === 'admin') {
        router.push('/dashboard/admin')
      }
      // other roles stay on /dashboard main page (shared view)
    }
  }, [session, status, router, pathname])

  // Poll notifications for admin/hod
  useEffect(() => {
    let timer
    const fetchNotifications = async () => {
      if (!session || !['admin','hod'].includes(session.user.role)) return
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
            setNotifications(data.notifications || [])
        }
      } catch {}
      timer = setTimeout(fetchNotifications, 15000)
    }
    fetchNotifications()
    return () => { if (timer) clearTimeout(timer) }
  }, [session])

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-300 font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
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
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Student Portal
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="mt-4 px-4">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.95 }}
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
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Student Portal
            </h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
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
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search bar */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.user.academicInfo?.name || session.user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {session.user.role}
                    </p>
                  </div>
                </button>
              </div>

              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
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