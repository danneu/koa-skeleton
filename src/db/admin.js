// 1st
const {pool} = require('./util')
const {q} = require('pg-extra')
// //////////////////////////////////////////////////////////

// only counts visible messages, not hidden ones since they are effectively
// deleted
exports.getStats = async function () {
  return pool.one(q`
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM messages WHERE is_hidden = false) AS messages_count
  `)
}
