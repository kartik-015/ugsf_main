import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import ProjectGroup from '@/models/ProjectGroup'

/* ── Normalize raw domains to major categories ── */
function normalizeDomain(raw) {
  if (!raw) return 'Other'
  const d = raw.toLowerCase().trim()
  if (/artificial intelligence|machine learning|deep learning|neural network|\bai\b|\bml\b|\baiml\b|\bnlp\b|natural language|computer vision|image (processing|recognition|classification)/.test(d)) return 'AI / ML'
  if (/data science|data analy|big data|data mining|data engineer|data visual/.test(d)) return 'Data Science'
  if (/cyber|security|ethical hack|penetration|forensic|malware|cryptograph/.test(d)) return 'Cybersecurity'
  if (/cloud|\baws\b|azure|devops|kubernetes|docker|containeriz|microservice/.test(d)) return 'Cloud Computing'
  if (/\biot\b|internet of things|embedded|arduino|raspberry|sensor/.test(d)) return 'IoT'
  if (/mobile|android|\bios\b|flutter|react native|kotlin|swift|app develop/.test(d)) return 'Mobile Dev'
  if (/game|unity|unreal|godot|gaming/.test(d)) return 'Game Dev'
  if (/blockchain|crypto|web3|smart contract|decentral|solidity/.test(d)) return 'Blockchain'
  if (/web|full.?stack|fullstack|next\.?js|react|mern|node\.?js|django|flask|frontend|backend|html|css|javascript|typescript|tailwind|express|php|laravel|angular|vue|svelte|prisma/.test(d)) return 'Web Development'
  return 'Other'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    const department = session.user.department

    const allowedRoles = ['admin', 'mainadmin', 'principal', 'hod', 'project_coordinator']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await dbConnect()

    // Check for drill-down mode
    const { searchParams } = new URL(request.url)
    const drillDept = searchParams.get('drillDept')
    const drillType = searchParams.get('drillType')

    // Department-scoped for HOD and Project Coordinator
    const isDeptScoped = (role === 'hod' || role === 'project_coordinator') && department
    const userDeptFilter = isDeptScoped ? { department } : {}
    const projectDeptFilter = isDeptScoped ? { department } : {}

    // ---- DRILL-DOWN: Department-specific detailed data ----
    if (drillDept && drillType) {
      const deptFilter = { department: drillDept }

      if (drillType === 'students') {
        const students = await User.find({ role: 'student', ...deptFilter })
          .select('email academicInfo department')
          .lean()
        const studentIds = students.map(s => s._id)
        const projects = await ProjectGroup.find({ 'members.student': { $in: studentIds } })
          .select('title domain status hodApproval internalGuide members semester monthlyReports')
          .populate('internalGuide', 'academicInfo.name email')
          .lean()

        const studentProjectMap = {}
        projects.forEach(p => {
          p.members.forEach(m => {
            const sid = String(m.student)
            if (!studentProjectMap[sid]) studentProjectMap[sid] = []
            studentProjectMap[sid].push({
              title: p.title,
              domain: p.domain,
              status: p.status,
              hodApproval: p.hodApproval,
              hasGuide: !!p.internalGuide,
              guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || null,
              semester: p.semester,
              hasCurrentMonthReport: p.monthlyReports?.some(r => {
                const now = new Date()
                return r.month === (now.getMonth() + 1) && r.year === now.getFullYear()
              }) || false
            })
          })
        })

        const withProject = students.filter(s => studentProjectMap[String(s._id)])
        const withoutProject = students.filter(s => !studentProjectMap[String(s._id)])
        const withGuide = withProject.filter(s => studentProjectMap[String(s._id)]?.some(p => p.hasGuide))
        const withoutGuide = withProject.filter(s => studentProjectMap[String(s._id)]?.every(p => !p.hasGuide))
        const submittedReport = withProject.filter(s => studentProjectMap[String(s._id)]?.some(p => p.hasCurrentMonthReport))
        const pendingReport = withProject.filter(s => studentProjectMap[String(s._id)]?.every(p => !p.hasCurrentMonthReport))

        const semBreakdown = await User.aggregate([
          { $match: { role: 'student', ...deptFilter } },
          { $group: { _id: '$academicInfo.semester', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])

        return NextResponse.json({
          department: drillDept,
          totalStudents: students.length,
          withProject: withProject.length,
          withoutProject: withoutProject.length,
          withGuide: withGuide.length,
          withoutGuide: withoutGuide.length,
          submittedReport: submittedReport.length,
          pendingReport: pendingReport.length,
          semesterBreakdown: semBreakdown.map(d => ({ name: `Sem ${d._id || '?'}`, value: d.count })),
          projectStatusBreakdown: (() => {
            const counts = {}
            Object.values(studentProjectMap).flat().forEach(p => {
              counts[p.status] = (counts[p.status] || 0) + 1
            })
            return Object.entries(counts).map(([name, value]) => ({ name, value }))
          })(),
        }, { headers: { 'Cache-Control': 'no-store' } })
      }

      if (drillType === 'projects') {
        const projects = await ProjectGroup.find(deptFilter)
          .select('title domain status hodApproval internalGuide members semester progressScore monthlyReports')
          .populate('internalGuide', 'academicInfo.name email')
          .lean()

        const submitted = projects.filter(p => p.status === 'submitted').length
        const approved = projects.filter(p => p.hodApproval === 'approved').length
        const inProgress = projects.filter(p => p.status === 'in-progress').length
        const completed = projects.filter(p => p.status === 'completed').length
        const rejected = projects.filter(p => p.status === 'rejected').length
        const withGuide = projects.filter(p => p.internalGuide).length
        const withoutGuide = projects.filter(p => !p.internalGuide).length
        
        const now = new Date()
        const reportThisMonth = projects.filter(p => p.monthlyReports?.some(r => r.month === now.getMonth() + 1 && r.year === now.getFullYear())).length
        const noReportThisMonth = projects.length - reportThisMonth

        const domainBreakdown = {}
        projects.forEach(p => {
          const d = normalizeDomain(p.domain)
          domainBreakdown[d] = (domainBreakdown[d] || 0) + 1
        })

        return NextResponse.json({
          department: drillDept,
          totalProjects: projects.length,
          submitted, approved, inProgress, completed, rejected,
          withGuide, withoutGuide,
          reportThisMonth, noReportThisMonth,
          domainBreakdown: Object.entries(domainBreakdown).map(([name, value]) => ({ name, value })),
        }, { headers: { 'Cache-Control': 'no-store' } })
      }

      if (drillType === 'domain') {
        // Domain drill-down: group projects by domain with details
        const domainFilter = /^[A-Z]/.test(drillDept) ? { department: drillDept } : {}
        // If drillDept looks like a domain name (not a department code), filter by domain
        const projects = await ProjectGroup.find({
          ...(domainFilter.department ? domainFilter : { domain: drillDept }),
          ...projectDeptFilter,
        })
          .select('title domain status semester members internalGuide progressScore')
          .populate('internalGuide', 'academicInfo.name email')
          .lean()

        // Group by domain
        const domainMap = {}
        projects.forEach(p => {
          const d = p.domain || 'Unknown'
          if (!domainMap[d]) domainMap[d] = []
          domainMap[d].push({
            title: p.title,
            status: p.status,
            semester: p.semester,
            memberCount: p.members?.length || 0,
            guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || null,
            score: p.progressScore || 0,
          })
        })

        const domains = Object.entries(domainMap)
          .sort((a, b) => b[1].length - a[1].length)
          .map(([domain, projs]) => ({ domain, projects: projs }))

        return NextResponse.json({ drillDept, domains }, { headers: { 'Cache-Control': 'no-store' } })
      }

      // ---- DRILL-DOWN: Individual student list ----
      if (drillType === 'studentList') {
        const filterBy = searchParams.get('filterBy') // department, semester, onboarding, approval, assigned
        const filterValue = searchParams.get('filterValue')

        let userFilter = { role: 'student', ...userDeptFilter }
        if (filterBy === 'department') userFilter.department = filterValue
        if (filterBy === 'semester') userFilter['academicInfo.semester'] = parseInt(filterValue)
        if (filterBy === 'onboarding' && filterValue === 'onboarded') userFilter.isOnboarded = true
        if (filterBy === 'onboarding' && filterValue === 'pending') userFilter.isOnboarded = { $ne: true }
        if (filterBy === 'approval' && filterValue === 'approved') userFilter.approvalStatus = 'approved'
        if (filterBy === 'approval' && filterValue === 'pending') userFilter.approvalStatus = 'pending'

        const students = await User.find(userFilter)
          .select('email department academicInfo interests isOnboarded approvalStatus createdAt')
          .sort({ 'academicInfo.rollNumber': 1 })
          .lean()

        // Get project assignment info for these students
        const studentIds = students.map(s => s._id)
        const projects = await ProjectGroup.find({ 'members.student': { $in: studentIds } })
          .select('title domain status members internalGuide semester monthlyReports')
          .populate('internalGuide', 'academicInfo.name email')
          .lean()

        const studentProjectMap = {}
        projects.forEach(p => {
          p.members.forEach(m => {
            const sid = String(m.student)
            if (!studentProjectMap[sid]) studentProjectMap[sid] = []
            studentProjectMap[sid].push({
              title: p.title,
              domain: p.domain,
              status: p.status,
              semester: p.semester,
              guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || null,
              hasCurrentMonthReport: p.monthlyReports?.some(r => {
                const now = new Date()
                return r.month === (now.getMonth() + 1) && r.year === now.getFullYear()
              }) || false,
            })
          })
        })

        // If filtering by assigned/unassigned
        let filteredStudents = students
        if (filterBy === 'assigned' && filterValue === 'assigned') {
          filteredStudents = students.filter(s => studentProjectMap[String(s._id)])
        } else if (filterBy === 'assigned' && filterValue === 'unassigned') {
          filteredStudents = students.filter(s => !studentProjectMap[String(s._id)])
        } else if (filterBy === 'report' && filterValue === 'submitted') {
          filteredStudents = students.filter(s => studentProjectMap[String(s._id)]?.some(p => p.hasCurrentMonthReport))
        } else if (filterBy === 'report' && filterValue === 'pending') {
          filteredStudents = students.filter(s => {
            const projs = studentProjectMap[String(s._id)]
            return projs && projs.length > 0 && projs.every(p => !p.hasCurrentMonthReport)
          })
        }

        // Interest domain breakdown
        const interestCounts = {}
        filteredStudents.forEach(s => {
          if (s.interests && s.interests.length > 0) {
            s.interests.forEach(i => { interestCounts[i] = (interestCounts[i] || 0) + 1 })
          }
        })

        const studentList = filteredStudents.map(s => ({
          _id: s._id,
          email: s.email,
          name: s.academicInfo?.name || s.email.split('@')[0],
          rollNumber: s.academicInfo?.rollNumber || '',
          semester: s.academicInfo?.semester || null,
          department: s.department || '',
          interests: s.interests || [],
          isOnboarded: s.isOnboarded || false,
          approvalStatus: s.approvalStatus || 'pending',
          project: studentProjectMap[String(s._id)]?.[0] || null,
          hasProject: !!studentProjectMap[String(s._id)],
        }))

        return NextResponse.json({
          filterBy,
          filterValue,
          total: studentList.length,
          students: studentList,
          interestBreakdown: Object.entries(interestCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value })),
        }, { headers: { 'Cache-Control': 'no-store' } })
      }

      // ---- DRILL-DOWN: Individual project list ----
      if (drillType === 'projectList') {
        const filterBy = searchParams.get('filterBy') // status, domain, guide, semester, report
        const filterValue = searchParams.get('filterValue')

        let projectFilter = { ...projectDeptFilter }
        if (filterBy === 'status') projectFilter.status = filterValue
        // domain filtering is done post-query via normalizeDomain()
        if (filterBy === 'semester') projectFilter.semester = parseInt(filterValue)
        if (filterBy === 'guide' && filterValue === 'assigned') projectFilter.internalGuide = { $ne: null }
        if (filterBy === 'guide' && filterValue === 'unassigned') projectFilter.internalGuide = null
        if (filterBy === 'hodApproval') projectFilter.hodApproval = filterValue

        let projects = await ProjectGroup.find(projectFilter)
          .select('title domain status semester members internalGuide progressScore monthlyReports hodApproval groupId')
          .populate('internalGuide', 'academicInfo.name email')
          .populate('members.student', 'academicInfo.name academicInfo.rollNumber email')
          .sort({ semester: 1, title: 1 })
          .lean()

        // Filter by normalized domain category
        if (filterBy === 'domain') {
          projects = projects.filter(p => normalizeDomain(p.domain) === filterValue)
        }

        // Filter by report status
        if (filterBy === 'report') {
          const now = new Date()
          if (filterValue === 'submitted') {
            projects = projects.filter(p => p.monthlyReports?.some(r => r.month === now.getMonth() + 1 && r.year === now.getFullYear()))
          } else if (filterValue === 'pending') {
            projects = projects.filter(p => !p.monthlyReports?.some(r => r.month === now.getMonth() + 1 && r.year === now.getFullYear()))
          }
        }

        // Domain breakdown from results (normalized)
        const domainCounts = {}
        projects.forEach(p => {
          const d = normalizeDomain(p.domain)
          domainCounts[d] = (domainCounts[d] || 0) + 1
        })

        const projectList = projects.map(p => ({
          _id: p._id,
          groupId: p.groupId,
          title: p.title,
          domain: p.domain || 'Unknown',
          status: p.status,
          semester: p.semester,
          hodApproval: p.hodApproval,
          guideName: p.internalGuide?.academicInfo?.name || p.internalGuide?.email || 'Not Assigned',
          memberCount: p.members?.length || 0,
          members: (p.members || []).map(m => ({
            name: m.student?.academicInfo?.name || 'Unknown',
            rollNumber: m.student?.academicInfo?.rollNumber || '',
            role: m.role,
          })),
          progressScore: p.progressScore || 0,
          hasCurrentMonthReport: p.monthlyReports?.some(r => {
            const now = new Date()
            return r.month === (now.getMonth() + 1) && r.year === now.getFullYear()
          }) || false,
          totalReports: p.monthlyReports?.length || 0,
        }))

        return NextResponse.json({
          filterBy,
          filterValue,
          total: projectList.length,
          projects: projectList,
          domainBreakdown: Object.entries(domainCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value })),
        }, { headers: { 'Cache-Control': 'no-store' } })
      }

      // ---- DRILL-DOWN: Onboarding breakdown (dept → semester counts) ----
      if (drillType === 'onboardingBreakdown') {
        const filterValue = searchParams.get('filterValue')
        let userFilter = { role: 'student', ...userDeptFilter }
        if (filterValue === 'onboarded') userFilter.isOnboarded = true
        if (filterValue === 'pending') userFilter.isOnboarded = { $ne: true }

        const breakdown = await User.aggregate([
          { $match: userFilter },
          { $group: { _id: { department: '$department', semester: '$academicInfo.semester' }, count: { $sum: 1 } } },
          { $sort: { '_id.department': 1, '_id.semester': 1 } }
        ])

        const deptMap = {}
        let total = 0
        breakdown.forEach(b => {
          const dept = b._id.department || 'Unknown'
          if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, semesters: [] }
          deptMap[dept].semesters.push({ name: `Sem ${b._id.semester || '?'}`, value: b.count })
          deptMap[dept].total += b.count
          total += b.count
        })

        // Ensure CSE and CE always appear
        const requiredDepts = ['IT', 'CSE', 'CE']
        requiredDepts.forEach(dept => {
          if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, semesters: [] }
        })

        return NextResponse.json({
          filterValue,
          total,
          departments: Object.values(deptMap).sort((a, b) => b.total - a.total)
        }, { headers: { 'Cache-Control': 'no-store' } })
      }

      // ---- DRILL-DOWN: Project assignment breakdown (dept → semester counts — by groups) ----
      if (drillType === 'projectAssignmentBreakdown') {
        const filterValue = searchParams.get('filterValue') // 'assigned' or 'unassigned'

        // Get all project groups with relevant info
        const allGroups = await ProjectGroup.find(projectDeptFilter)
          .select('department semester internalGuide')
          .lean()

        // Filter groups based on guide assigned/unassigned
        let filteredGroups
        if (filterValue === 'assigned') {
          filteredGroups = allGroups.filter(g => g.internalGuide)
        } else {
          filteredGroups = allGroups.filter(g => !g.internalGuide)
        }

        // Group by dept → semester
        const deptMap = {}
        let total = 0
        filteredGroups.forEach(g => {
          const dept = g.department || 'Unknown'
          const sem = g.semester || '?'
          if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, semMap: {} }
          if (!deptMap[dept].semMap[sem]) deptMap[dept].semMap[sem] = 0
          deptMap[dept].semMap[sem]++
          deptMap[dept].total++
          total++
        })

        // Ensure CSE and CE always appear
        const requiredDepts2 = ['IT', 'CSE', 'CE']
        requiredDepts2.forEach(dept => {
          if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, semMap: {} }
        })

        const departments = Object.values(deptMap)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(d => ({
            name: d.name,
            total: d.total,
            semesters: Object.entries(d.semMap)
              .sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0))
              .map(([sem, count]) => ({ name: `Sem ${sem}`, value: count }))
          }))

        return NextResponse.json({
          filterValue,
          total,
          departments
        }, { headers: { 'Cache-Control': 'no-store' } })
      }

      return NextResponse.json({ error: 'Invalid drill type' }, { status: 400 })
    }

    // ---- MAIN STATS ----
    const [
      totalStudents,
      totalGuides,
      pendingRegistrations,
      totalProjects,
      approvedProjects,
      inProgressProjects,
      rejectedProjects,
      completedProjects,
    ] = await Promise.all([
      User.countDocuments({ role: 'student', ...userDeptFilter }),
      User.countDocuments({ role: 'guide', ...userDeptFilter }),
      isDeptScoped
        ? User.countDocuments({ approvalStatus: 'pending', role: 'student', ...userDeptFilter })
        : User.countDocuments({ approvalStatus: 'pending' }),
      ProjectGroup.countDocuments(projectDeptFilter),
      ProjectGroup.countDocuments({ hodApproval: 'approved', ...projectDeptFilter }),
      ProjectGroup.countDocuments({ status: 'in-progress', ...projectDeptFilter }),
      ProjectGroup.countDocuments({ status: 'rejected', ...projectDeptFilter }),
      ProjectGroup.countDocuments({ status: 'completed', ...projectDeptFilter }),
    ])

    // Reports submitted / pending this month
    const now = new Date()
    const allProjects = await ProjectGroup.find(projectDeptFilter).select('monthlyReports').lean()
    let reportsSubmittedCount = 0
    let reportsPendingCount = 0
    allProjects.forEach(p => {
      const hasReport = p.monthlyReports?.some(r => r.month === now.getMonth() + 1 && r.year === now.getFullYear())
      if (hasReport) reportsSubmittedCount++
      else reportsPendingCount++
    })

    // Department-wise student distribution
    const departmentDistribution = await User.aggregate([
      { $match: { role: 'student', ...(isDeptScoped ? { department } : {}) } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    // Project domain distribution
    const domainDistribution = await ProjectGroup.aggregate([
      { $match: { ...projectDeptFilter } },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // Project status distribution
    const statusDistribution = await ProjectGroup.aggregate([
      { $match: { ...projectDeptFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])

    // Assigned vs unassigned groups (by guide assignment)
    const assignedGroups = await ProjectGroup.countDocuments({ internalGuide: { $ne: null }, ...projectDeptFilter })
    const unassignedGroups = Math.max(0, totalProjects - assignedGroups)

    // Groups that haven't submitted project title
    const noTitleGroups = await ProjectGroup.countDocuments({ 
      ...projectDeptFilter,
      $or: [{ title: { $exists: false } }, { title: null }, { title: '' }]
    })

    // Onboarding stats
    const onboardedStudents = await User.countDocuments({ role: 'student', isOnboarded: true, ...userDeptFilter })
    const notOnboardedStudents = totalStudents - onboardedStudents

    // Semester distribution
    const semesterDistribution = await User.aggregate([
      { $match: { role: 'student', ...(isDeptScoped ? { department } : {}) } },
      { $group: { _id: '$academicInfo.semester', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    // Guide allocation summary
    const guideAllocation = await ProjectGroup.aggregate([
      { $match: { internalGuide: { $ne: null }, ...projectDeptFilter } },
      { $lookup: { from: 'users', localField: 'internalGuide', foreignField: '_id', as: 'guide' } },
      { $unwind: '$guide' },
      { $group: {
        _id: '$internalGuide',
        guideName: { $first: { $ifNull: ['$guide.academicInfo.name', '$guide.email'] } },
        guideEmail: { $first: '$guide.email' },
        department: { $first: '$guide.department' },
        projectCount: { $sum: 1 },
        totalStudents: { $sum: { $size: '$members' } }
      }},
      { $sort: { projectCount: -1 } }
    ])

    // Registration trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const registrationTrend = await User.aggregate([
      { $match: { role: 'student', createdAt: { $gte: sevenDaysAgo }, ...userDeptFilter } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ])

    const stats = {
      totalStudents,
      totalFaculty: totalGuides,
      pendingRegistrations,
      assignedGroups,
      unassignedGroups,
      noTitleGroups,
      onboardedStudents,
      notOnboardedStudents,
      totalProjects,
      approvedProjects,
      inProgressProjects,
      rejectedProjects,
      completedProjects,
      departmentDistribution: (() => {
        const deptData = departmentDistribution.map(d => ({ name: d._id || 'Unknown', value: d.count }))
        const requiredDepts = ['IT', 'CSE', 'CE']
        const existing = new Set(deptData.map(d => d.name))
        requiredDepts.forEach(dept => { if (!existing.has(dept)) deptData.push({ name: dept, value: 0 }) })
        return deptData.sort((a, b) => a.name.localeCompare(b.name))
      })(),
      domainDistribution: (() => {
        const norm = {}
        domainDistribution.forEach(d => { const cat = normalizeDomain(d._id); norm[cat] = (norm[cat] || 0) + d.count })
        return Object.entries(norm).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
      })(),
      statusDistribution: statusDistribution.map(d => ({ name: d._id || 'Unknown', value: d.count })),
      semesterDistribution: semesterDistribution.map(d => ({ name: d._id ? `Sem ${d._id}` : 'Unknown', value: d.count })),
      guideAllocation,
      registrationTrend: registrationTrend.map(d => ({ date: d._id, count: d.count })),
      deptProjectDistribution: (await ProjectGroup.aggregate([
        { $match: { ...(isDeptScoped ? { department } : {}) } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])).map(d => ({ name: d._id || 'Unknown', value: d.count })),
      deptGuideDistribution: (await User.aggregate([
        { $match: { role: { $in: ['guide', 'hod'] }, ...(isDeptScoped ? { department } : {}) } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])).map(d => ({ name: d._id || 'Unknown', value: d.count })),
      reportsSubmittedCount,
      reportsPendingCount,
      role,
      department: isDeptScoped ? department : 'All',
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
