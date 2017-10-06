// Node
const path = require('path')
const { promisify } = require('util')
const readFile = promisify(require('fs').readFile)
// 1st
const config = require('../src/config')
const { pool } = require('../src/db/util')

// //////////////////////////////////////////////////////////

// Sanity check: Ensure this isn't being run in production

if (config.NODE_ENV !== 'development') {
  throw new Error('[reset_db] May only reset database in development mode')
}

// //////////////////////////////////////////////////////////

function slurpSql(filePath) {
  const relativePath = '../sql/' + filePath
  const fullPath = path.join(__dirname, relativePath)
  return readFile(fullPath, 'utf8')
}

async function seed() {
  console.log('Resetting the database...')

  await (async () => {
    const sql = await slurpSql('schema.sql')
    console.log('-- Executing schema.sql...')
    await pool._query(sql)
  })()

  await (async () => {
    const sql = await slurpSql('seeds.sql')
    console.log('-- Executing seeds.sql...')
    await pool._query(sql)
  })()
}

seed().then(
  () => {
    console.log('Finished resetting db')
    process.exit(0)
  },
  err => {
    console.error('Error:', err, err.stack)
    process.exit(1)
  }
)
