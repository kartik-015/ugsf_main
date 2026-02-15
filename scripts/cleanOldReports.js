const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection('projectgroups').updateMany(
    { 'monthlyReports.pdfUrl': { $regex: '^/uploads/' } },
    { $pull: { monthlyReports: { pdfUrl: { $regex: '^/uploads/' } } } }
  );
  console.log('Cleaned old reports:', result.modifiedCount, 'projects updated');
  await mongoose.disconnect();
  process.exit(0);
});
