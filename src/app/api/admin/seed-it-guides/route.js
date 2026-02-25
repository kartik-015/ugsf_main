import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

// One-time endpoint: seed IT department guides
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()

  const guides = [
    { name: 'Akash Patel',     email: 'akashpatel.dit@charusat.ac.in',    password: 'AkashPatel@DIT24'    },
    { name: 'Ashish Katira',   email: 'ashishkatira.dit@charusat.ac.in',  password: 'AshishKatira@DIT24'  },
    { name: 'Sachin Patel',    email: 'sachinpatel.dit@charusat.ac.in',   password: 'SachinPatel@DIT24'   },
    { name: 'Chital Raval',    email: 'chitalraval.dit@charusat.ac.in',   password: 'ChitalRaval@DIT24'   },
    { name: 'Dipika Damodar',  email: 'dipikadamodar.dit@charusat.ac.in', password: 'DipikaDamodar@DIT24' },
    { name: 'Radhika Patel',   email: 'radhikapatel.dit@charusat.ac.in',  password: 'RadhikaPatel@DIT24'  },
    { name: 'Ritika Jani',     email: 'ritikajani.dit@charusat.ac.in',    password: 'RitikaJani@DIT24'    },
    { name: 'Shital Sharma',   email: 'shitalsharma.dit@charusat.ac.in',  password: 'ShitalSharma@DIT24'  },
  ]

  const results = []

  for (const g of guides) {
    try {
      // Delete existing to avoid duplicates
      await User.deleteOne({ email: g.email })

      const user = new User({
        email: g.email,
        password: g.password,
        role: 'guide',
        department: 'IT',
        institute: 'DEPSTAR',
        university: 'CHARUSAT',
        academicInfo: {
          name: g.name,
          phoneNumber: '0000000000',
          address: 'DEPSTAR, CHARUSAT',
        },
        isOnboarded: true,
        isRegistered: true,
        isEmailVerified: true,
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        mustChangePassword: false,
      })
      await user.save()
      results.push({ email: g.email, name: g.name, status: 'created' })
    } catch (err) {
      results.push({ email: g.email, name: g.name, status: 'error', error: err.message })
    }
  }

  return NextResponse.json({
    total: guides.length,
    results,
    passwords: guides.map(g => ({ email: g.email, password: g.password })),
  })
}
