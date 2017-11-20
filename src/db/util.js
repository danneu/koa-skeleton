// 3rd
const { extend } = require('pg-extra')
const pg = extend(require('pg'))
// 1st
const config = require('../config')

// This is the connection pool the rest of our db namespace
// should import and use
const pool = new pg.Pool({ connectionString: config.DATABASE_URL })

module.exports = { pool }
