// 3rd
const assert = require('better-assert')
// 1st
const { pool } = require('./util')
const { sql } = require('pg-extra')
const belt = require('../belt')

// //////////////////////////////////////////////////////////

// only counts visible messages, not hidden ones since they are effectively
// deleted
exports.getStats = async function() {
    return pool.one(sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM messages WHERE is_hidden = false) AS messages_count
  `)
}

// //////////////////////////////////////////////////////////

exports.deleteAllHiddenMessages = function() {
    return pool.query(sql`
      DELETE FROM messages
      WHERE is_hidden = true
    `)
}

exports.deleteHiddenMessagesByUserId = function(userId) {
    assert(belt.isUuid(userId))
    return pool.query(sql`
      DELETE FROM messages
      WHERE is_hidden = true
        AND user_id = ${userId}
    `)
}
