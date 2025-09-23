'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Force clear on initial mount to avoid browser autofill retained values
  useEffect(() => {
    setEmail('')
    setPassword('')
  }, [])

  // Additional safeguard: clear on focus if browser pre-fills
  const handleEmailFocus = () => {
    if (email !== '' && email.includes('@')) return
    // Keep if user already typed something
  }

  // Accept both student and staff domains
  const validateEmail = (email) => /^[^@\s]+@charusat\.(edu|ac)\.in$/i.test(email)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateEmail(email)) {
  toast.error('Use your Charusat email (@charusat.edu.in for students, @charusat.ac.in for guide/HOD)')
      return
    }
    setIsLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Login successful!')
        // Fetch session to get updated role/onboarding info
        setTimeout(async () => {
          try {
            const res = await fetch('/api/auth/session')
            const s = await res.json()
            const u = s?.user
            if (u) {
              if (!u.isOnboarded) {
                window.location.href = '/onboarding'
              } else if (u.role === 'admin') {
                window.location.href = '/dashboard/admin'
              } else {
                window.location.href = '/dashboard'
              }
            } else {
              window.location.href = '/dashboard'
            }
          } catch {
            window.location.href = '/dashboard'
          }
        }, 300)
      }
    } catch (error) {
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      {/* Hidden dummy fields to discourage Chrome autofill */}
      <input type="text" name="fake_user" className="hidden" autoComplete="off" />
      <input type="password" name="fake_pass" className="hidden" autoComplete="new-password" />
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            id="login-email"
            type="email"
            name="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleEmailFocus}
            placeholder="your@charusat.edu.in"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            autoComplete="one-time-code"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Use your college email to access the portal</p>
      </div>
    </form>
  )
}