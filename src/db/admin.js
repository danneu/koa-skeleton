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

// filter must be one of:
//    - { all: true } -- Delete all hidden messages
//    - { userId: 'xxx' } -- Only delete user's hidden messages
exports.deleteHiddenMessages = function(filter) {
    assert(typeof filter === 'object')
    assert(filter.all === true || belt.isUuid(filter.userId))

    const query = sql`
    DELETE FROM messages
    WHERE is_hidden = true
  `
    if (filter.userId) {
        query.append(sql`AND user_id = ${filter.userId}`)
    }

    return pool.query(query)
}
