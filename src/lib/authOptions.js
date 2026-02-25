import CredentialsProvider from 'next-auth/providers/credentials'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide email and password')
        }

        await dbConnect()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })

        if (!user) {
          throw new Error('User not found')
        }

        // isRegistered check only applies to students (guides/admins are seeded, not self-registered)
        if (user.role === 'student' && !user.isRegistered) {
          throw new Error('Please register first before logging in.')
        }

        // Check if student email is verified
        if (user.role === 'student' && !user.isEmailVerified) {
          throw new Error('Please verify your email before logging in. Check your inbox for the OTP.')
        }

        const isValidPassword = await user.comparePassword(credentials.password)

        if (!isValidPassword) {
          throw new Error('Invalid password')
        }

        // Update last login
        user.lastLogin = new Date()
        await user.save()

        return {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          department: user.department,
          admissionYear: user.admissionYear,
          academicInfo: user.academicInfo,
          isOnboarded: user.isOnboarded,
          isApproved: user.isApproved,
          approvalStatus: user.approvalStatus,
          mustChangePassword: user.mustChangePassword || false,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role
        token.department = user.department
        token.admissionYear = user.admissionYear
        token.academicInfo = user.academicInfo
        token.isOnboarded = user.isOnboarded
        token.isApproved = user.isApproved
        token.approvalStatus = user.approvalStatus
        token.mustChangePassword = user.mustChangePassword || false
      }
      // On session update (e.g. after password change), refresh from DB
      if (trigger === 'update') {
        try {
          await dbConnect()
          const freshUser = await User.findById(token.sub).select('mustChangePassword isOnboarded')
          if (freshUser) {
            token.mustChangePassword = freshUser.mustChangePassword || false
            token.isOnboarded = freshUser.isOnboarded
          }
        } catch {}
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.department = token.department
        session.user.admissionYear = token.admissionYear
        session.user.academicInfo = token.academicInfo
        session.user.isOnboarded = token.isOnboarded
        session.user.isApproved = token.isApproved
        session.user.approvalStatus = token.approvalStatus
        session.user.mustChangePassword = token.mustChangePassword || false
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/api/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
