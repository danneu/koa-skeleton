'use strict';
// 3rd
const assert = require('better-assert');
const debug = require('debug')('db:ratelimits');
const _ = require('lodash');
// 1st
const util = require('./util');

// maxDate (Required Date): the maximum, most recent timestamp that the user
// can have if they have a row in the table. i.e. if user can only post
// every 5 minutes, maxDate will be 5 min in the past.
//
// If user is ratelimited, it throws the expiration Date timestamp of the
// ratelimit that can be shown to the user (e.g. try again in 24 seconds)
exports.bump = function * (ipAddress, maxDate) {
  assert(typeof ipAddress === 'string');
  assert(maxDate instanceof Date);
  return yield util.withTransaction(function * (client) {
    yield client.queryPromise('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    // Get latest ratelimit for this user
    const row = yield client.queryOnePromise(`
      SELECT *
      FROM ratelimits
      WHERE ip_root(ip_address) = ip_root($1)
      ORDER BY id DESC
      LIMIT 1
    `, [ipAddress]);
    // If it's too soon, throw the Date when ratelimit expires
    if (row && row.created_at > maxDate) {
      const elapsed = new Date() - row.created_at; // since ratelimit
      const duration = new Date() - maxDate; // ratelimit length
      const expires = new Date(Date.now() + duration - elapsed);
      throw expires;
    }
    // Else, insert new ratelimit
    yield client.queryPromise(`
      INSERT INTO ratelimits (ip_address) VALUES ($1)
    `, [ipAddress]);
  });
};
