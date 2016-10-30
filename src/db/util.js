// 3rd
const {extend, parseUrl} = require('pg-extra')
const pg = extend(require('pg'))
// 1st
const config = require('../config')

// =========================================================

// This is the connection pool the rest of our db namespace
// should import and use
const pool = new pg.Pool(parseUrl(config.DATABASE_URL))

module.exports = {pool}
