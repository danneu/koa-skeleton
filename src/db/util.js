// 3rd
const { extend } = require('pg-extra')
const pg = extend(require('pg'))
// 1st
const { DATABASE_URL } = require('../config')

// This is the connection pool singleton the rest of our db namespace
// should import and use
const pool = new pg.Pool({ connectionString: DATABASE_URL })

const getClient = () => new pg.Client({ connectionString: DATABASE_URL })

module.exports = { pool, getClient }
