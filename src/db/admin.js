// 1st
const {pool} = require('./util')

// //////////////////////////////////////////////////////////

// only counts visible messages, not hidden ones since they are effectively
// deleted
exports.getStats = async function () {
  return pool.one(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM messages WHERE is_hidden = false) AS messages_count
  `)
}
