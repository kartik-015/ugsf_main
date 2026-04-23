'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginForm() {
  const router = useRouter()
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

  // Accept @charusat.edu.in (students), @charusat.ac.in (guides/HOD), and whitelisted test emails
  const TEST_EMAILS = ['kartik.guleria@gmail.com']
  const validateEmail = (email) => {
    const lower = email.toLowerCase().trim()
    if (TEST_EMAILS.includes(lower)) return true
    return /^[^@\s]+@charusat\.(edu|ac)\.in$/i.test(lower)
  }

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
              // Check if must change password first
              if (u.mustChangePassword) {
                window.location.href = '/change-password'
              } else if (!u.isOnboarded) {
                window.location.href = '/onboarding'
              } else {
                // Role-based dashboard redirection
                switch (u.role) {
                  case 'admin':
                  case 'mainadmin':
                    // Only admin goes to admin dashboard
                    window.location.href = '/dashboard/admin'
                    break
                  case 'hod':
                  case 'project_coordinator':
                  case 'principal':
                    // HODs, PCs, Principal go to their admin dashboard
                    window.location.href = '/dashboard/admin'
                    break
                  case 'guide':
                    // Guides go to guide dashboard
                    window.location.href = '/dashboard'
                    break
                  case 'student':
                    // Students go to dashboard
                    window.location.href = '/dashboard'
                    break
                  default:
                    window.location.href = '/dashboard'
                    break
                }
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
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
      {/* Hidden dummy fields to discourage Chrome autofill */}
      <input type="text" name="fake_user" className="hidden" autoComplete="off" />
      <input type="password" name="fake_pass" className="hidden" autoComplete="new-password" />
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            required
            autoComplete="one-time-code"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
            className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => router.push('/forgot-password')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
        >
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Use your college email to access the portal</p>
      </div>
    </form>
  )
}