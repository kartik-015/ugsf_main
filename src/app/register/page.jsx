'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Users,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { studentEmailPattern, deriveFromStudentEmail, validatePhoneRuntime, validateNameRuntime } from '@/lib/clientValidation'
import { PROJECT_DOMAINS } from '@/lib/domains'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><p className="text-gray-500">Loading...</p></div>}>
      <RegisterContent />
    </Suspense>
  )
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleFromUrl = searchParams.get('role')

  const [formData, setFormData] = useState({
    email: '',
    role: '',
    name: '',
    phoneNumber: '',
    address: '',
    batch: '',
    interestedDomains: [],
  })
  const [roleChosen, setRoleChosen] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (roleFromUrl && (roleFromUrl === 'student' || roleFromUrl === 'guide')) {
      setFormData(prev => ({ ...prev, role: roleFromUrl }))
      setRoleChosen(true)
    }
  }, [roleFromUrl])

  const studentDerived = useMemo(() => formData.role === 'student' ? deriveFromStudentEmail(formData.email) : null, [formData.email, formData.role])
  const emailValid = useMemo(() => {
    if (!formData.email) return false
    if (formData.role === 'student') return studentEmailPattern.test(formData.email)
    if (formData.role === 'guide') return /@charusat\.ac\.in$/i.test(formData.email)
    return false
  }, [formData.email, formData.role])

  const batches = ['A', 'B', 'C', 'D']

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleDomain = (domain) => {
    setFormData(prev => {
      const current = prev.interestedDomains
      if (current.includes(domain)) {
        return { ...prev, interestedDomains: current.filter(d => d !== domain) }
      }
      if (current.length >= 3) {
        toast.error('You can select up to 3 domains')
        return prev
      }
      return { ...prev, interestedDomains: [...current, domain] }
    })
  }

  const handleRoleClick = (role) => {
    setFormData(prev => ({ ...prev, role }))
    setRoleChosen(true)
  }

  const validateStep1 = () => {
    if (!formData.email) {
      toast.error('Email is required')
      return false
    }
    if (!emailValid) {
      toast.error('Invalid email for selected role')
      return false
    }
    if (formData.role === 'student' && !studentDerived) {
      toast.error('Email must match yydeprol@charusat.edu.in pattern')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.name || !validateNameRuntime(formData.name)) {
      toast.error('Please enter a valid name')
      return false
    }
    if (!formData.phoneNumber || !validatePhoneRuntime(formData.phoneNumber)) {
      toast.error('Please enter a valid phone number (e.g. +919876543210)')
      return false
    }
    if (!formData.address || formData.address.trim().length < 5) {
      toast.error('Please enter a valid address')
      return false
    }
    if (formData.role === 'student' && !formData.batch) {
      toast.error('Please select your batch')
      return false
    }
    if (formData.role === 'student') {
      if (formData.interestedDomains.length === 0) {
        toast.error('Please select at least one interested domain')
        return false
      }
    }
    return true
  }

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep2()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Registration successful! Your default password is depstar@123. Please login.')
        router.push('/')
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch (error) {
      toast.error('An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  const totalSteps = formData.role === 'student' ? 2 : 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.span
              className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              EvalProX Registration
            </motion.span>
            <motion.h1
              className="text-4xl font-bold text-gray-900 dark:text-white mb-4 mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Create Account
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 dark:text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Register to access the SGP Evaluation Portal
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 border border-white/20 shadow-xl"
          >
            {!roleChosen ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">Choose Account Type</h2>
                <div className="grid grid-cols-2 gap-6">
                  <motion.button
                    type="button"
                    onClick={() => handleRoleClick('student')}
                    className="p-6 rounded-xl text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <GraduationCap className="w-8 h-8 mx-auto mb-2" />
                    Student
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => handleRoleClick('guide')}
                    className="p-6 rounded-xl text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    Guide
                  </motion.button>
                </div>
              </div>
            ) : formData.role === 'student' ? (
              /* ──── Student Registration 3-step ──── */
              <div>
                {/* Step indicator */}
                <div className="flex items-center justify-center mb-6">
                  {[1, 2].map((s, i) => (
                    <div key={s} className="flex items-center">
                      {i > 0 && <div className={`w-12 h-1 mx-1 rounded ${step >= s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>{s}</div>
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="space-y-5"
                    >
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Enter Your Email</h2>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          CHARUSAT Email *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            placeholder="23dit015@charusat.edu.in"
                          />
                        </div>
                        <div className="mt-1 text-xs">
                          <p className={`${emailValid ? 'text-green-500' : 'text-red-500'}`}>
                            {emailValid ? '✓ Valid email' : 'Invalid — use format: yydeprol@charusat.edu.in'}
                          </p>
                        </div>
                      </div>

                      <motion.button
                        type="button"
                        onClick={handleNextStep}
                        disabled={!emailValid}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Next <ArrowRight className="w-5 h-5" />
                      </motion.button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Your Details</h2>

                        {/* Full Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 rounded-xl border ${formData.name && !validateNameRuntime(formData.name) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                              placeholder="Enter your full name"
                            />
                          </div>
                          {formData.name && !validateNameRuntime(formData.name) && (
                            <p className="text-xs text-red-500 mt-1">Name must contain only letters/spaces</p>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 rounded-xl border ${formData.phoneNumber && !validatePhoneRuntime(formData.phoneNumber) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                              placeholder="+919876543210"
                            />
                          </div>
                          {formData.phoneNumber && !validatePhoneRuntime(formData.phoneNumber) && (
                            <p className="text-xs text-red-500 mt-1">Must start with +91 and have 10 digits after</p>
                          )}
                        </div>

                        {/* Address */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <textarea
                              value={formData.address}
                              onChange={(e) => handleInputChange('address', e.target.value)}
                              rows={2}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter your address"
                            />
                          </div>
                        </div>

                        {/* Batch */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch *</label>
                          <select
                            value={formData.batch}
                            onChange={(e) => handleInputChange('batch', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Batch</option>
                            {batches.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>

                        {/* Interested Domains */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" /> Interested Domains * <span className="text-xs text-gray-400 ml-1">(select up to 3)</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {PROJECT_DOMAINS.filter(d => d !== 'Other').map(domain => (
                              <button
                                key={domain}
                                type="button"
                                onClick={() => toggleDomain(domain)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                                  formData.interestedDomains.includes(domain)
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}
                              >
                                {domain}
                              </button>
                            ))}
                          </div>
                          {formData.interestedDomains.length > 0 && (
                            <p className="text-xs text-green-500 mt-1">✓ {formData.interestedDomains.length} selected</p>
                          )}
                        </div>

                        {/* Default password info */}
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <p className="font-semibold">Default Password: depstar@123</p>
                          <p className="text-xs mt-1">You can change this after your first login.</p>
                        </div>

                        <div className="flex gap-3">
                          <motion.button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-1"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <ArrowLeft className="w-4 h-4" /> Back
                          </motion.button>
                          <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isLoading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Registering...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                Register
                              </>
                            )}
                          </motion.button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <button onClick={() => router.push('/')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* ──── Guide registration ──── */
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Guide Registration</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="user@charusat.ac.in"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+919876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your address"
                  />
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold">Default Password: depstar@123</p>
                  <p className="text-xs mt-1">You can change this after your first login.</p>
                </div>
                <motion.button
                  type="submit"
                  disabled={isLoading || !emailValid}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </motion.button>
                <div className="text-center">
                  <button onClick={() => router.push('/')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline text-sm">
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}


