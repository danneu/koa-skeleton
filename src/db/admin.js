// 1st
const {pool} = require('./util')
const {sql} = require('pg-extra')

// //////////////////////////////////////////////////////////

// only counts visible messages, not hidden ones since they are effectively
// deleted
exports.getStats = async function () {
  return pool.one(sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM messages WHERE is_hidden = false) AS messages_count
  `)
}

// //////////////////////////////////////////////////////////

exports.deleteHiddenMessages = function () {
  return pool.query(sql`
    DELETE FROM messages
    WHERE is_hidden = true
  `)
}
