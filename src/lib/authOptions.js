import CredentialsProvider from 'next-auth/providers/credentials'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

const EMAIL_ALIASES = {}
const KARTIK_TEST_GUIDE_EMAIL = 'kartiktest.dit@charusat.ac.in'

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

        const normalizedEmail = credentials.email.trim().toLowerCase()
        const emailCandidates = [normalizedEmail, ...(EMAIL_ALIASES[normalizedEmail] || [])]

        let user = await User.findOne({ email: { $in: emailCandidates } })

        // Production-safe bootstrap for requested internal test guide.
        // If this account is missing in DB (e.g., on live), create it with default credentials.
        if (!user && normalizedEmail === KARTIK_TEST_GUIDE_EMAIL) {
          await User.create({
            email: KARTIK_TEST_GUIDE_EMAIL,
            password: 'depstar@123',
            role: 'guide',
            department: 'IT',
            institute: 'DEPSTAR',
            academicInfo: { name: 'Kartik Guleria (Test Guide)' },
            isOnboarded: true,
            isRegistered: true,
            isEmailVerified: true,
            isApproved: true,
            approvalStatus: 'approved',
            isActive: true,
          })
          user = await User.findOne({ email: KARTIK_TEST_GUIDE_EMAIL })
        }

        if (!user) {
          throw new Error('No account found for this email. Check the spelling or use your assigned college email.')
        }

        // isRegistered check only applies to students and guides (admins/hods/pcs are seeded)
        if ((user.role === 'student' || user.role === 'guide') && !user.isRegistered) {
          throw new Error('Please register first before logging in.')
        }

        // Check if email is verified (students and guides must verify)
        if ((user.role === 'student' || user.role === 'guide') && !user.isEmailVerified) {
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
      // Keep role-sensitive session fields in sync with DB changes (e.g., guide promoted to project_coordinator).
      // This avoids stale JWT role data after admin/HOD role updates.
      if (!user && token?.sub) {
        try {
          await dbConnect()
          const freshUser = await User.findById(token.sub).select('role department admissionYear academicInfo isOnboarded isApproved approvalStatus mustChangePassword')
          if (freshUser) {
            token.role = freshUser.role
            token.department = freshUser.department
            token.admissionYear = freshUser.admissionYear
            token.academicInfo = freshUser.academicInfo
            token.isOnboarded = freshUser.isOnboarded
            token.isApproved = freshUser.isApproved
            token.approvalStatus = freshUser.approvalStatus
            token.mustChangePassword = freshUser.mustChangePassword || false
          }
        } catch {}
      }
      // On session update (e.g. after password change), refresh from DB
      if (trigger === 'update') {
        try {
          await dbConnect()
          const freshUser = await User.findById(token.sub).select('role department admissionYear academicInfo isOnboarded isApproved approvalStatus mustChangePassword')
          if (freshUser) {
            token.role = freshUser.role
            token.department = freshUser.department
            token.admissionYear = freshUser.admissionYear
            token.academicInfo = freshUser.academicInfo
            token.mustChangePassword = freshUser.mustChangePassword || false
            token.isOnboarded = freshUser.isOnboarded
            token.isApproved = freshUser.isApproved
            token.approvalStatus = freshUser.approvalStatus
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
