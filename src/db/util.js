// 3rd
const { extend } = require('pg-extra')
const pg = extend(require('pg'))
// 1st
const config = require('../config')

const connectionString = config.DATABASE_URL

// This is the connection pool the rest of our db namespace
// should import and use
const pool = new pg.Pool({ connectionString })

const getClient = () => new pg.Client({ connectionString })

module.exports = { pool, getClient }
