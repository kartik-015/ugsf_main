const mongoose = require('mongoose')

async function verifyGuides() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ugsf')
    console.log('✅ Connected to ugsf database')

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))
    
    // Check for guides
    const guides = await User.find({ role: 'guide' }).select('email academicInfo.name department university institute')
    console.log(`\n👨‍🏫 GUIDES: ${guides.length}`)
    guides.slice(0, 5).forEach(g => {
      console.log(`  - ${g.academicInfo?.name || 'No name'} (${g.email}) - Dept: ${g.department}, Uni: ${g.university}, Inst: ${g.institute}`)
    })
    if (guides.length > 5) console.log(`  ... and ${guides.length - 5} more`)
    
    // Check for HODs
    const hods = await User.find({ role: 'hod' }).select('email academicInfo.name department university institute')
    console.log(`\n👨‍💼 HODs: ${hods.length}`)
    hods.forEach(h => {
      console.log(`  - ${h.academicInfo?.name || 'No name'} (${h.email}) - Dept: ${h.department}, Uni: ${h.university}, Inst: ${h.institute}`)
    })
    
    // Check for principal
    const principal = await User.findOne({ role: 'principal' }).select('email academicInfo.name institute university')
    console.log(`\n👔 PRINCIPAL: ${principal ? '1' : '0'}`)
    if (principal) {
      console.log(`  - ${principal.academicInfo?.name || 'No name'} (${principal.email}) - Uni: ${principal.university}, Inst: ${principal.institute}`)
    }
    
    // Check totals
    const total = await User.countDocuments()
    console.log(`\n📊 Total users in database: ${total}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

verifyGuides()
