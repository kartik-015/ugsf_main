const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/ugsf').then(async () => {
  const db = mongoose.connection.db
  const cursor = db.collection('users').find({
    email: { $regex: '^d[0-9]{2}', $options: 'i' },
    role: 'student'
  })

  let count = 0
  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    await db.collection('users').updateOne(
      { _id: doc._id },
      { $set: { admissionYear: doc.admissionYear - 1, 'academicInfo.semester': 6 } }
    )
    console.log(`Fixed: ${doc.email} -> admissionYear ${doc.admissionYear - 1}, semester 6`)
    count++
  }

  console.log(`Updated ${count} d-prefix student(s)`)
  process.exit(0)
}).catch(e => {
  console.error(e)
  process.exit(1)
})
