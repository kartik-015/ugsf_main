'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  Shield, 
  Eye, 
  UserCheck,
  Zap,
  Target,
  Award,
  TrendingUp,
  Calendar,
  ListChecks
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('guide-summary')
  const [guideSummary, setGuideSummary] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, 50])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
      return
    }
    if (session.user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])


  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    pendingOnboarding: 0,
    assignedStudents: 0
  })

  const fetchStats = useCallback(async () => {
    try {
      console.log('Fetching admin stats...')
      const res = await fetch('/api/admin/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      console.log('Stats response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('Stats data received:', data)
        setStats(data)
      } else {
        const error = await res.json()
        console.error('Stats fetch failed:', error)
        toast.error('Failed to load statistics')
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      toast.error('Error loading statistics')
    }
  }, [])

  const fetchGuideSummary = useCallback(async ()=>{
    setLoadingSummary(true)
    try{
      const res = await fetch('/api/projects/summary')
      if(res.ok){
        const data = await res.json()
        setGuideSummary(data.guides||[])
      } else {
        const e = await res.json().catch(()=>({}))
        toast.error(e.error?.message||'Failed summary')
      }
    } catch {
      toast.error('Network error summary')
    } finally { setLoadingSummary(false) }
  },[])

  

  useEffect(() => {
  let mounted = true
  fetchGuideSummary()
  fetchStats()
  if (mounted) setLoading(false)
  return () => { mounted = false }
  }, [fetchGuideSummary, fetchStats])

  // Assign feature removed (no counselor role)

  const getStats = () => {
    return [
      {
        name: 'Total Students',
        value: stats.totalStudents,
        icon: GraduationCap,
        color: 'from-blue-600 to-purple-600'
      },
      {
  name: 'Total Guides',
        value: stats.totalFaculty,
        icon: Shield,
        color: 'from-green-600 to-blue-600'
      },
      {
        name: 'Pending Onboarding',
        value: stats.pendingOnboarding,
        icon: UserPlus,
        color: 'from-yellow-600 to-orange-600'
      },
      {
        name: 'Assigned Students',
        value: stats.assignedStudents,
        icon: UserCheck,
        color: 'from-purple-600 to-pink-600'
      }
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-foreground font-semibold text-lg">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') return null

  return (
    <div className="space-y-8 relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="relative">
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Admin Dashboard
            </motion.h1>
            <motion.p 
              className="text-gray-600 dark:text-gray-300 mt-2 text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Manage guide allocations and projects
            </motion.p>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {getStats().map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.5 + index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{
                scale: 1.05,
                y: -8,
                rotateY: 5
              }}
              className="transform-3d hover-lift backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {stat.name}
                  </p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
                <motion.div
                  className="flex-shrink-0"
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Guide Allocation Section - Commented out for future use */}
        {/* 
        <motion.div 
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex space-x-4 mb-6 flex-wrap">
            <motion.button
              onClick={() => { setSelectedTab('guide-summary'); fetchGuideSummary() }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedTab === 'guide-summary'
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-white/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ListChecks className="w-4 h-4 inline mr-2" />
              Guide Allocation
            </motion.button>
          </div>

          {selectedTab === 'guide-summary' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Guide Allocation Summary</h3>
              {loadingSummary ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : guideSummary.length===0 ? (
                <div className="text-sm text-gray-500">No guide allocations yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700/50">
                        <th className="text-left p-2 font-medium">Guide</th>
                        <th className="text-left p-2 font-medium">Department</th>
                        <th className="text-left p-2 font-medium">Projects</th>
                        <th className="text-left p-2 font-medium">Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guideSummary.map(g => (
                        <tr key={g.guideId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="p-2">{g.guideName||g.guideEmail}</td>
                          <td className="p-2">{g.department||'-'}</td>
                          <td className="p-2">{g.projectCount}</td>
                          <td className="p-2">{g.totalStudents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
        */}
      </motion.div>
    </div>
  )
}
