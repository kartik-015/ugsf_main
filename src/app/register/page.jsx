'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  GraduationCap,
  Users,
  Sparkles,
  Zap,
  CheckCircle
} from 'lucide-react'
import { signIn } from 'next-auth/react'
import toast from 'react-hot-toast'
import { studentEmailPattern, deriveFromStudentEmail, passwordStrength } from '@/lib/clientValidation'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleFromUrl = searchParams.get('role') // Get role from URL parameter
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  })
  const [roleChosen, setRoleChosen] = useState(false)

  // Auto-select role from URL parameter
  useEffect(() => {
    if (roleFromUrl && (roleFromUrl === 'student' || roleFromUrl === 'guide')) {
      setFormData(prev => ({ ...prev, role: roleFromUrl }))
      setRoleChosen(true)
    }
  }, [roleFromUrl])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showOtpStep, setShowOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [attemptError, setAttemptError] = useState('')

  // Derived live validation values
  const studentDerived = useMemo(() => formData.role==='student' ? deriveFromStudentEmail(formData.email) : null, [formData.email, formData.role])
  const pwdStrength = useMemo(()=> passwordStrength(formData.password), [formData.password])
  const emailValid = useMemo(()=>{
    if(!formData.email) return false
    if(formData.role==='student') return studentEmailPattern.test(formData.email)
    if(formData.role==='guide') return /@charusat\.ac\.in$/i.test(formData.email)
    return false
  },[formData.email, formData.role])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleRoleClick = (role) => {
    setFormData(prev => ({ ...prev, role }))
    setRoleChosen(true)
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('All fields are required')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return false
    }

    if(!emailValid) {
      toast.error('Invalid email for selected role')
      return false
    }
    if(formData.role==='student' && !studentDerived){
      toast.error('Email must match yydeprol@charusat.edu.in pattern')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.verificationRequired) {
          toast.success('Registration submitted! Check your email for the OTP to verify your account.')
          setShowOtpStep(true)
          setPendingEmail(formData.email)
          setResendCooldown(60000) // 60s initial cooldown
        } else {
          toast.success('Registration submitted! Your application will be reviewed by admin.')
          router.push('/')
        }
        return
      } else {
        const error = await response.json()
        toast.error(error.error || error.message || 'Registration failed')
      }
    } catch (error) {
      toast.error('An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || !pendingEmail) {
      toast.error('Enter OTP')
      return
    }
    setVerifying(true)
    setAttemptError('')
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Email verified! Your application is pending admin approval. You will be notified once approved.')
        setShowOtpStep(false)
        setPendingEmail('')
        setOtp('')
        router.push('/')
      } else {
        if (response.status === 429) {
          setAttemptError(data.error || 'Too many attempts.')
        }
        toast.error(data.error || data.message || 'OTP verification failed')
      }
    } catch (error) {
      toast.error('An error occurred during OTP verification')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingEmail) return
    setResending(true)
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('OTP resent. Check your email.')
        setResendCooldown(data.cooldown || 60000)
      } else {
        if (data.retryIn) {
          setResendCooldown(data.retryIn)
        }
        toast.error(data.error || 'Resend failed')
      }
    } catch (e) {
      toast.error('Resend failed')
    } finally {
      setResending(false)
    }
  }

  // Cooldown ticker
  useState(() => {
    if (!showOtpStep) return
    let id
    if (resendCooldown > 0) {
      id = setInterval(() => {
        setResendCooldown(prev => prev <= 1000 ? 0 : prev - 1000)
      }, 1000)
    }
    return () => id && clearInterval(id)
  }, [resendCooldown, showOtpStep])

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
          className="max-w-md mx-auto"
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
                Join Charusat Portal
              </span>
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full animate-pulse animation-delay-2000"></div>
            </motion.div>
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Create Account ✨
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Start your journey with Charusat University
            </motion.p>
          </div>

          {/* Registration Form or OTP Step */}
          {!showOtpStep ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 border border-white/20 shadow-xl"
            >
              {!roleChosen ? (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-4 text-center">Choose Account Type</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <motion.button
                      type="button"
                      onClick={() => handleRoleClick('student')}
                      className="p-6 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:scale-105 transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Student
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleRoleClick('guide')}
                      className="p-6 rounded-xl text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg hover:scale-105 transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Guide
                    </motion.button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                  <input type="text" name="fakeuser" className="hidden" autoComplete="off" />
                  <input type="password" name="fakepass" className="hidden" autoComplete="new-password" />
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder={formData.role === 'student' ? '23DIT015@charusat.edu.in' : 'user@charusat.ac.in'}
                        autoComplete="one-time-code"
                      />
                    </div>
                    <div className='mt-1 text-xs'>
                      {formData.role==='student' && (
                        <>
                          <p className={`${emailValid? 'text-green-500':'text-red-500'}`}>{emailValid? 'Valid pattern' : 'Format: yydeprol@charusat.edu.in'}</p>
                          {studentDerived && <p className='text-gray-400'>Year: {studentDerived.admissionYear} • Dept: {studentDerived.department} • Roll: {studentDerived.rollNumber}</p>}
                        </>
                      )}
                      {formData.role==='guide' && <p className={`${emailValid? 'text-green-500':'text-red-500'}`}>{emailValid? 'Domain OK' : 'Must end @charusat.ac.in'}</p>}
                    </div>
                  </div>
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder="Enter your password"
                        autoComplete="new-password"
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </motion.button>
                    </div>
                    <div className='mt-1 text-xs flex items-center gap-2'>
                      <span className={`px-2 py-0.5 rounded ${pwdStrength.score>=3?'bg-green-600':'bg-red-600'} text-white`}>{pwdStrength.label}</span>
                      <span className='text-gray-400'>len {formData.password.length}</span>
                    </div>
                  </div>
                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </motion.button>
                    </div>
                  </div>
                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading || !emailValid || pwdStrength.score < 2}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                        <span className="ml-2">Creating Account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Create Account
                      </div>
                    )}
                  </motion.button>
                  <div className="mt-6 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Already have an account?{' '}
                      <motion.button
                        onClick={() => router.push('/')}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Sign In
                      </motion.button>
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 border border-white/20 shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-4 text-center">Verify Email</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">Enter the 6-digit code we sent to <span className='font-semibold'>{pendingEmail}</span>. It expires in 10 minutes.</p>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OTP</label>
                  <input type="text" value={otp} onChange={e=>setOtp(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300" placeholder="Enter OTP" />
                  {attemptError && <p className='text-red-500 text-xs mt-1'>{attemptError}</p>}
                </div>
                <motion.button type="submit" disabled={verifying} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {verifying ? (
                    <div className="flex items-center justify-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      <span className="ml-2">Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Verify OTP
                    </div>
                  )}
                </motion.button>
                <div className='flex items-center justify-between text-sm'>
                  <button type='button' onClick={handleResend} disabled={resending || resendCooldown>0} className='text-blue-600 dark:text-blue-400 disabled:opacity-50'>
                    {resending ? 'Resending...' : resendCooldown>0 ? `Resend in ${Math.ceil(resendCooldown/1000)}s` : 'Resend OTP'}
                  </button>
                  <button type='button' onClick={()=>{setShowOtpStep(false); setOtp(''); setPendingEmail('')}} className='text-gray-500 hover:text-gray-300'>Change email</button>
                </div>
              </form>
              <div className="mt-6 text-center">
                <p className='text-xs text-gray-500'>Having trouble? Check spam folder or wait before resending.</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}


