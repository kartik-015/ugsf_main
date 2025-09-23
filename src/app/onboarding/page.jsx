'use client'

import { useState, useEffect } from 'react'
import { parseStudentEmail } from '@/lib/validation'
import { useSession } from 'next-auth/react'
import { validatePhoneRuntime, validateNameRuntime } from '@/lib/clientValidation'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  GraduationCap,
  Building,
  Calendar,
  Users,
  Award,
  Sparkles,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    department: '',
    university: '',
    institute: '',
    admissionYear: new Date().getFullYear(),
    semester: 1,
    section: 'A',
    rollNumber: '',
    interests: [],
    experience: '',
    specialization: '',
  education: '',
    batch: '',
  })
  const role = session?.user?.role

  const baseDepartments = [
    { code: 'CSE', name: 'Computer Science and Engineering' },
    { code: 'CE', name: 'Computer Engineering' },
    { code: 'IT', name: 'Information Technology' }
  ]
  const cspitExtras = [
    { code: 'ME', name: 'Mechanical Engineering' },
    { code: 'EC', name: 'Electronics & Communication' },
    { code: 'CIVIL', name: 'Civil Engineering' }
  ]
  const departments = formData.institute === 'CSPIT' ? [...baseDepartments, ...cspitExtras] : baseDepartments
  const universities = ['CHARUSAT','Others']
  const institutes = ['CSPIT','DEPSTAR','Others']

  const batches = ['A', 'B', 'C', 'D']
  const sections = ['1', '2', '3', '4']
  const interests = [
    'Web Development', 'Mobile Development', 'Data Science', 'AI/ML',
    'Cybersecurity', 'Cloud Computing', 'DevOps', 'UI/UX Design',
    'Blockchain', 'IoT', 'Game Development', 'Software Engineering'
  ]

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/')
      return
    }

  // Only redirect if user is flagged onboarded (avoid premature redirect for faculty/HOD before completing form)
  if (session.user.isOnboarded) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  // Prefill department for HOD if provided in token (cannot change)
  useEffect(() => {
    if (role === 'hod' && session?.user?.department && !formData.department) {
      setFormData(prev => ({ ...prev, department: session.user.department }))
    }
  }, [role, session, formData.department])

  // Load existing user data if available
  useEffect(() => {
    if (session?.user) {
      const user = session.user
      console.log('Loading existing user data:', user)
      
      const updates = {}
      
      // Load academic info if exists
      if (user.academicInfo) {
        if (user.academicInfo.name) updates.name = user.academicInfo.name
        if (user.academicInfo.phoneNumber) updates.phoneNumber = user.academicInfo.phoneNumber
        if (user.academicInfo.address) updates.address = user.academicInfo.address
        if (user.academicInfo.semester) updates.semester = user.academicInfo.semester
        if (user.academicInfo.batch) updates.batch = user.academicInfo.batch
        if (user.academicInfo.rollNumber) updates.rollNumber = user.academicInfo.rollNumber
      }
      
      // Load other user data
      if (user.department) updates.department = user.department
      if (user.university) updates.university = user.university
      if (user.institute) updates.institute = user.institute
      if (user.admissionYear) updates.admissionYear = user.admissionYear
      if (user.specialization) updates.specialization = user.specialization
      if (user.education) updates.education = user.education
      if (user.experience) updates.experience = user.experience
      if (user.interests && Array.isArray(user.interests)) updates.interests = user.interests
      
      console.log('Form updates to apply:', updates)
      
      // Update form data with existing values
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }))
      }
    }
  }, [session])

  const handleInputChange = (field, value) => {
    if(role==='student'){
      // Prevent editing derived fields
      if(['admissionYear','department','institute','rollNumber'].includes(field)) return
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSubmit = async () => {
    try {
      // Debug logging
      console.log('Submitting form data:', {
        semester: formData.semester,
        semesterType: typeof formData.semester,
        fullFormData: formData
      })
      
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Profile updated successfully!')
        try {
          // Force session refresh so isOnboarded flag updates immediately
          await fetch('/api/auth/session?update', { cache: 'no-store' })
        } catch {}
        if (session?.user?.role === 'admin') {
          router.push('/dashboard/admin')
        } else {
          router.push('/dashboard')
        }
      } else {
        let error
        try { error = await response.json() } catch {}
        // Fix: Only pass string to toast.error
        if (typeof error === 'object') {
          toast.error(error.message || error.error?.message || 'Failed to update profile')
        } else {
          toast.error(String(error))
        }
      }
    } catch (error) {
      toast.error('An error occurred while updating profile')
    }
  }

  const nextStep = () => {
    if (step === 1) {
      // Phone number validation: must start with +91 and 12 chars
      const phone = formData.phoneNumber.trim()
      if (!/^\+91[1-9]\d{9}$/.test(phone)) {
        toast.error('Enter phone like +919876543210')
        return
      }
    }
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  useEffect(()=>{
    if(role==='student' && session?.user?.email){
      const parsed = parseStudentEmail(session.user.email)
      if(parsed){
        setFormData(prev=>({
          ...prev,
          admissionYear: parsed.admissionYear,
          department: parsed.department,
          institute: parsed.institute,
          rollNumber: parsed.rollNumber
        }))
      }
    }
  },[role, session?.user?.email])

  if (status === 'loading') {
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

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          background: [
            'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center gap-2 mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Welcome to Charusat
              </span>
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full animate-pulse animation-delay-2000"></div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Complete Your Profile ✨
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Let&apos;s get to know you better to personalize your experience
            </motion.p>
          </div>

      {/* Progress Bar */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Step {step} of 3
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round((step / 3) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Form Steps */}
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 border border-white/20 shadow-xl"
          >
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <User className="h-4 w-4 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Personal Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${formData.name && !validateNameRuntime(formData.name)?'border-red-500':'border-gray-300 dark:border-gray-600'} dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                      placeholder="Enter your full name"
                    />
                    {formData.name && !validateNameRuntime(formData.name) && (
                      <p className="text-xs text-red-600 mt-1">Name must contain only letters/spaces and start & end with a letter</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${formData.phoneNumber && !validatePhoneRuntime(formData.phoneNumber) ? 'border-red-500':'border-gray-300 dark:border-gray-600'} dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                      placeholder="+919876543210"
                    />
                    {formData.phoneNumber && !validatePhoneRuntime(formData.phoneNumber) && (
                      <p className="text-xs text-red-600 mt-1">Must start with +91 and have 10 digits after</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address *
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter your address"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, -5, 5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <GraduationCap className="h-4 w-4 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {role === 'student' ? 'Academic Information' : 'Professional Information'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {role === 'student' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          University *
                        </label>
                        <select
                          value={formData.university}
                          onChange={(e) => handleInputChange('university', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="">Select University</option>
                          {universities.map(u=> <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Institute *
                        </label>
                        <div className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 text-sm flex items-center justify-between">
                          <span>{formData.institute||'-'}</span>
                          <span className="text-[10px] uppercase bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded">Derived</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Department *
                        </label>
                        <div className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 text-sm flex items-center justify-between">
                          <span>{formData.department||'-'}</span>
                          <span className="text-[10px] uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded">Derived</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Admission Year *
                        </label>
                        <div className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 text-sm flex items-center justify-between">
                          <span>{formData.admissionYear}</span>
                          <span className="text-[10px] uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded">Derived</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Semester *
                        </label>
                        <select
                          value={formData.semester}
                          onChange={(e) => handleInputChange('semester', parseInt(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="" className="text-gray-900 bg-white">Select Semester</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={sem} className="text-gray-900 bg-white">
                              Semester {sem}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Section *
                        </label>
                        <select
                          value={formData.section}
                          onChange={(e) => handleInputChange('section', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-gray-100"
                        >
                          <option value="" className="text-gray-900 bg-white">Select Section</option>
                          {sections.map((section) => (
                            <option key={section} value={section} className="text-gray-900 bg-white">
                              Section {section}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Roll Number *
                        </label>
                        <div className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 text-sm flex items-center justify-between">
                          <span>{formData.rollNumber}</span>
                          <span className="text-[10px] uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded">Auto</span>
                        </div>
                      </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Batch *
                          </label>
                          <select
                            value={formData.batch}
                            onChange={(e) => handleInputChange('batch', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-gray-100"
                          >
                            <option value="" className="text-gray-900 bg-white">Select Batch</option>
                            {batches.map((b) => (
                              <option key={b} value={b} className="text-gray-900 bg-white">{b}</option>
                            ))}
                          </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          University *
                        </label>
                        <select
                          value={formData.university}
                          onChange={(e) => handleInputChange('university', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="">Select University</option>
                          {universities.map(u=> <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Institute *
                        </label>
                        <select
                          value={formData.institute}
                          onChange={(e) => handleInputChange('institute', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="">Select Institute</option>
                          {institutes.map(i=> <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Department *
                        </label>
                        <select
                          value={formData.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.code} value={dept.code}>
                              {dept.code} - {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Specialization *
                        </label>
                        <input
                          type="text"
                          value={formData.specialization}
                          onChange={(e) => handleInputChange('specialization', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          placeholder="e.g. AI/ML, Structural Engineering"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Education / Highest Qualification *
                        </label>
                        <input
                          type="text"
                          value={formData.education}
                          onChange={(e) => handleInputChange('education', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          placeholder="e.g. PhD in Computer Science"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Award className="h-4 w-4 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {role === 'student' ? 'Interests & Preferences' : 'Interests & Professional Summary'}
                  </h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Areas of Interest (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {interests.map((interest) => (
                      <motion.button
                        key={interest}
                        type="button"
                        onClick={() => handleInterestToggle(interest)}
                        className={`p-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                          formData.interests.includes(interest)
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                            : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-white/20'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {interest}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {role === 'student' ? 'Additional Information' : 'Professional Summary'}
                  </label>
                  <textarea
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder={role === 'student' ? 'Tell us about your goals or any additional information...' : 'Briefly describe your teaching/research experience, achievements, etc.'}
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <motion.button
                onClick={prevStep}
                disabled={step === 1}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  step === 1
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-white/20'
                }`}
                whileHover={step !== 1 ? { scale: 1.05 } : {}}
                whileTap={step !== 1 ? { scale: 0.95 } : {}}
              >
                Previous
              </motion.button>

              {step < 3 ? (
                <motion.button
                  onClick={nextStep}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Next
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Complete Profile
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}