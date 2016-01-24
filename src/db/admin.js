'use strict';

// 1st
const dbUtil = require('./util');

////////////////////////////////////////////////////////////

// only counts visible messages, not hidden ones since they are effectively
// deleted
exports.getStats = function*() {
  const sql = `;
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM messages WHERE is_hidden = false) AS messages_count
  `;

  return yield dbUtil.queryOne(sql);
};
