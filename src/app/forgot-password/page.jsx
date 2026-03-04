'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, RefreshCw, CheckCircle, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { passwordStrength } from '@/lib/clientValidation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1 = email, 2 = OTP + new password
  const [email, setEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpInputRefs = useRef([])

  const pwdStrength = passwordStrength(newPassword)

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // ──── Step 1: Send OTP ────
  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('If the email exists, an OTP has been sent. Check your inbox.')
        setStep(2)
        setResendCooldown(60)
        setTimeout(() => otpInputRefs.current[0]?.focus(), 400)
      } else {
        if (data.retryIn) {
          toast.error(`Please wait ${data.retryIn} seconds before trying again`)
          setResendCooldown(data.retryIn)
        } else {
          toast.error(data.error || 'Something went wrong')
        }
      }
    } catch {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ──── Step 2: Verify OTP & Reset Password ────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    const otp = otpDigits.join('')
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (pwdStrength.score < 2) {
      toast.error('Password is too weak')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Password reset successfully! Redirecting to login...')
        setTimeout(() => router.push('/'), 1500)
      } else {
        toast.error(data.error || 'Reset failed. Please try again.')
        if (data.error?.includes('expired')) {
          setOtpDigits(['', '', '', '', '', ''])
        }
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // ──── Resend OTP ────
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('New OTP sent!')
        setResendCooldown(60)
        setOtpDigits(['', '', '', '', '', ''])
        otpInputRefs.current[0]?.focus()
      } else {
        toast.error(data.error || 'Failed to resend')
      }
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setIsResending(false)
    }
  }

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newDigits = [...otpDigits]
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || ''
      }
      setOtpDigits(newDigits)
      const focusIdx = Math.min(pasted.length, 5)
      otpInputRefs.current[focusIdx]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-background dark:via-card dark:to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            EvalProX
          </motion.h1>
          <p className="text-sm text-muted-foreground mt-1">SGP Evaluation Portal</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-sm bg-card/95 dark:bg-card/95 rounded p-6 sm:p-8 border border-border shadow-sm"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <KeyRound className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Forgot Password?</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your registered email and we&apos;ll send you an OTP to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@charusat.edu.in"
                        className="w-full pl-11 pr-4 py-3 border border-border rounded bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-sm border border-primary-600 text-sm sm:text-base"
                  >
                    {isLoading ? 'Sending OTP...' : 'Send Reset OTP'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6">
                  <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-foreground">Reset Your Password</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    We sent an OTP to
                  </p>
                  <p className="text-sm font-semibold text-primary">{email}</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  {/* OTP Input Boxes */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Enter OTP
                    </label>
                    <div className="flex justify-center gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={idx === 0 ? handleOtpPaste : undefined}
                          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded border border-border bg-input text-foreground focus:border-primary focus:ring-2 focus:ring-ring focus:outline-none transition-all duration-200"
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full pl-11 pr-12 py-3 border border-border rounded bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pwdStrength.score >= 4
                                ? 'bg-green-500'
                                : pwdStrength.score >= 3
                                ? 'bg-green-400'
                                : pwdStrength.score >= 2
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(pwdStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            pwdStrength.score >= 3
                              ? 'text-green-600 dark:text-green-400'
                              : pwdStrength.score >= 2
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {pwdStrength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full pl-11 pr-12 py-3 border border-border rounded bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>

                  {/* Reset Button */}
                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join('').length !== 6 || pwdStrength.score < 2}
                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-sm border border-primary-600 text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Resetting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Reset Password
                      </span>
                    )}
                  </button>
                </form>

                {/* Resend OTP */}
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Didn&apos;t receive the OTP?</p>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || isResending}
                    className="text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                {/* Back buttons */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setStep(1)
                      setOtpDigits(['', '', '', '', '', ''])
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change email
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )
}
