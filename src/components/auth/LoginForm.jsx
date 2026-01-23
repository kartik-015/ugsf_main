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
              } else {
                // Role-based dashboard redirection
                switch (u.role) {
                  case 'admin':
                  case 'mainadmin':
                    window.location.href = '/dashboard/admin'
                    break
                  case 'hod':
                    window.location.href = '/dashboard' // HODs use main dashboard with their permissions
                    break
                  case 'principal':
                    window.location.href = '/dashboard' // Principals have read-only access to main dashboard
                    break
                  case 'guide':
                    window.location.href = '/dashboard'
                    break
                  case 'student':
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
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      {/* Hidden dummy fields to discourage Chrome autofill */}
      <input type="text" name="fake_user" className="hidden" autoComplete="off" />
      <input type="password" name="fake_pass" className="hidden" autoComplete="new-password" />
      <div>
        <label htmlFor="login-email" className="block text-sm font-semibold text-foreground mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <input
            id="login-email"
            type="email"
            name="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleEmailFocus}
            placeholder="your@charusat.edu.in"
            className="w-full pl-11 pr-4 py-3 border-2 border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
            required
            autoComplete="one-time-code"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-semibold text-foreground mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full pl-11 pr-12 py-3 border-2 border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-primary-600"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="text-center text-xs font-medium text-muted-foreground">
        <p>Use your college email to access the portal</p>
      </div>
    </form>
  )
}