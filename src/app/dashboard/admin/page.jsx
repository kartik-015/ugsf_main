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
  Sparkles,
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
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('registrations')
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

  const fetchRegistrations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/registrations')
      if (response.ok) {
        const data = await response.json()
        setRegistrations(data.registrations || [])
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to fetch registrations')
        setRegistrations([])
      }
    } catch (error) {
      console.error('Error fetching registrations:', error)
      toast.error('Failed to fetch registrations')
      setRegistrations([])
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
  fetchRegistrations().finally(() => { if (mounted) setLoading(false) })
  fetchGuideSummary()
  return () => { mounted = false }
  }, [fetchRegistrations])

  // Assign feature removed (no counselor role)

  const handleApproveUser = async (userId, approve, roleOverride) => {
    try {
      const response = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve, role: roleOverride })
      })
      if (response.ok) {
        toast.success(approve ? 'Approved' : 'Rejected')
        fetchRegistrations()
      } else {
        const e = await response.json()
        toast.error(e.error || 'Failed to update')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const getStats = () => {
    const totalStudents = registrations.filter(r => r.role === 'student').length
  const totalFaculty = registrations.filter(r => ['guide','hod'].includes(r.role)).length
    const pendingOnboarding = registrations.filter(r => !r.isOnboarded).length
  const assignedStudents = registrations.filter(r => r.role === 'student' && r.isApproved).length

    return [
      {
        name: 'Total Students',
        value: totalStudents,
        icon: GraduationCap,
        color: 'from-blue-600 to-purple-600'
      },
      {
  name: 'Total Guides',
        value: totalFaculty,
        icon: Shield,
        color: 'from-green-600 to-blue-600'
      },
      {
        name: 'Pending Onboarding',
        value: pendingOnboarding,
        icon: UserPlus,
        color: 'from-yellow-600 to-orange-600'
      },
      {
        name: 'Assigned Students',
        value: assignedStudents,
        icon: UserCheck,
        color: 'from-purple-600 to-pink-600'
      }
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </motion.div>
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
              Manage registrations and assignments ✨
            </motion.p>
            <motion.div
              className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
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

        {/* Tabs */}
        <motion.div 
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex space-x-4 mb-6 flex-wrap">
            <motion.button
              onClick={() => setSelectedTab('registrations')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedTab === 'registrations'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-white/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Registrations
            </motion.button>
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

          {/* Content */}
          {selectedTab === 'registrations' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Recent Registrations
              </h3>
              
              {registrations.length === 0 ? (
                <motion.div 
                  className="text-center py-16 backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-white/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No registrations yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    New registrations will appear here
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {registrations.map((user, index) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        duration: 0.5,
                        delay: 0.7 + index * 0.1
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        y: -5
                      }}
                      className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
                              user.role === 'student' 
                                ? 'from-blue-500 to-purple-600' 
                                : 'from-green-500 to-blue-600'
                            } flex items-center justify-center`}>
                              {user.role === 'student' ? <GraduationCap className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-white" />}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {user.academicInfo?.name || user.email}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {user.email} • {user.role}
                              </p>
                            </div>
                          </div>
                          
                          {user.role === 'student' && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Department: {user.department || 'Not set'} • 
                                Semester: {user.academicInfo?.semester || 'Not set'}
                              </p>
                              {user.interests && user.interests.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interests:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {user.interests.slice(0, 3).map((interest, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-xs rounded-full">
                                        {interest}
                                      </span>
                                    ))}
                                    {user.interests.length > 3 && (
                                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full">
                                        +{user.interests.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.isOnboarded 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                          }`}>
                            {user.isOnboarded ? 'Onboarded' : 'Pending'}
                          </span>
                          
                          {user.role === 'student' && (
                            <span className="text-sm text-gray-500">Student</span>
                          )}

                          {['guide','hod'].includes(user.role) && (
                            <div className="flex gap-2">
                              {user.approvalStatus !== 'approved' && (
                                <motion.button
                                  onClick={() => handleApproveUser(user._id, true)}
                                  className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Approve
                                </motion.button>
                              )}
                              {user.approvalStatus !== 'rejected' && (
                                <motion.button
                                  onClick={() => handleApproveUser(user._id, false)}
                                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Reject
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
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

          {/* Assignments section removed: counselor role not used in this app */}
        </motion.div>
      </motion.div>
    </div>
  )
}
