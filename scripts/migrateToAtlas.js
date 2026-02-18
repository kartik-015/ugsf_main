/**
 * Migrate data from local MongoDB to Atlas
 * Usage: node scripts/migrateToAtlas.js "mongodb+srv://user:pass@cluster.mongodb.net/ugsf"
 */

const { MongoClient } = require('mongodb')

const LOCAL_URI = 'mongodb://localhost:27017/ugsf'
const ATLAS_URI = process.argv[2]

if (!ATLAS_URI) {
  console.error('❌ Please provide your Atlas connection string as an argument:')
  console.error('   node scripts/migrateToAtlas.js "mongodb+srv://user:pass@cluster.mongodb.net/ugsf"')
  process.exit(1)
}

async function migrate() {
  console.log('🔗 Connecting to local MongoDB...')
  const localClient = new MongoClient(LOCAL_URI)
  await localClient.connect()
  const localDb = localClient.db('ugsf')

  console.log('🔗 Connecting to Atlas...')
  const atlasClient = new MongoClient(ATLAS_URI)
  await atlasClient.connect()
  const atlasDb = atlasClient.db('ugsf')

  // Get all collections
  const collections = await localDb.listCollections().toArray()
  console.log(`\n📦 Found ${collections.length} collections to migrate:\n`)

  for (const col of collections) {
    const name = col.name
    const docs = await localDb.collection(name).find({}).toArray()
    console.log(`  📋 ${name}: ${docs.length} documents`)

    if (docs.length > 0) {
      // Drop existing collection on Atlas to avoid duplicates
      try { await atlasDb.collection(name).drop() } catch {}
      await atlasDb.collection(name).insertMany(docs)
      console.log(`     ✅ Migrated ${docs.length} documents`)
    } else {
      console.log(`     ⏭️  Skipped (empty)`)
    }
  }

  console.log('\n✅ Migration complete!')
  console.log('\n📝 Now update your Vercel environment variable:')
  console.log(`   MONGODB_URI = ${ATLAS_URI}`)

  await localClient.close()
  await atlasClient.close()
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e.message)
  process.exit(1)
})
