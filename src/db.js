'use strict';

// 3rd
var pg = require('co-pg')(require('pg'));
var assert = require('better-assert');
var _ = require('lodash');
var uuid = require('uuid');
var debug = require('debug')('app:db');
// 1st
var config = require('./config');
var belt = require('./belt');

// Configure pg client to parse int8 into Javscript integer
pg.types.setTypeParser(20, (v) => {
  return v === null ? null : Number.parseInt(v, 10);
});

////////////////////////////////////////////////////////////
// Core helper functions
////////////////////////////////////////////////////////////

// Run query with pooled connection
exports.query = query;
function* query(sql, params) {
  var connResult = yield pg.connectPromise(config.DATABASE_URL);
  var client = connResult[0];
  var done = connResult[1];
  try {
    return yield client.queryPromise(sql, params);
  } finally {
    // Release client back to pool even upon query error
    done();
  }
}

function* queryOne(sql, params) {
  var result = yield query(sql, params);
  assert(result.rows.length <= 1);
  return result.rows[0];
}

function* queryMany(sql, params) {
  var result = yield query(sql, params);
  return result.rows;
}

// `runner` is a generator function that accepts one arguement:
// a database client.
function* withClient(runner) {
  var connResult = yield pg.connectPromise(config.DATABASE_URL);
  var client = connResult[0];
  var done = connResult[1];

  var result;
  try {
    result = yield runner(client);
  } catch (err) {
    if (err.removeFromPool) {
      err.human = 'Could not remove from pool';
      done(new Error('Removing connection from pool'));
      throw err;
    } else if (err.code === '40P01') { // Deadlock
      done();
      return yield withClient(runner);
    } else {
      done();
      throw err;
    }
  }

  done();
  return result;
}

// `runner` is a generator function that accepts one arguement:
// a database client.
function* withTransaction(runner) {
  return yield withClient(function*(client) {
    var result;
    try {
      yield client.queryPromise('BEGIN');
      result = yield runner(client);
      yield client.queryPromise('COMMIT');
      return result;
    } catch (err) {
      try {
        yield client.queryPromise('ROLLBACK');
      } catch(err) {
        err.removeFromPool = true;
        throw err;
      }
      throw err;
    }
  });
}

////////////////////////////////////////////////////////////
// Custom queries
////////////////////////////////////////////////////////////

// UUID -> User | undefined
//
// Also bumps user's last_online_at column to NOW().
exports.getUserBySessionId = function*(sessionId) {
  assert(belt.isValidUuid(sessionId));

  var sql = `
    UPDATE users
    SET last_online_at = NOW()
    WHERE id = (
      SELECT u.id
      FROM users u
      WHERE u.id = (
        SELECT s.user_id
        FROM active_sessions s
        WHERE s.id = $1
      )
    )
    RETURNING *
  `;

  return yield queryOne(sql, [sessionId]);
};

// Case-insensitive uname lookup
exports.getUserByUname = function*(uname) {
  assert(_.isString(uname));

  var sql = `
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
  `;

  return yield queryOne(sql, [uname]);
};

////////////////////////////////////////////////////////////

exports.getRecentMessages = function*() {
  var sql = `
    SELECT
      m.*,
      to_json(u.*) "user"
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.is_hidden = false
    ORDER BY m.id DESC
    LIMIT 25
  `;

  return yield queryMany(sql);
};

exports.getRecentMessagesForUserId = function*(userId) {
  assert(Number.isInteger(userId));

  var sql = `
    SELECT
      m.*,
      to_json(u.*) "user"
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.is_hidden = false
      AND u.id = $1
    ORDER BY m.id DESC
    LIMIT 25
  `;

  return yield queryMany(sql, [userId]);
};

////////////////////////////////////////////////////////////

// Returns inserted message
exports.insertMessage = function*(data) {
  assert(Number.isInteger(data.user_id) || _.isUndefined(data.user_id));
  assert(_.isString(data.markup));
  assert(_.isString(data.ip_address));
  assert(_.isString(data.user_agent) || _.isUndefined(data.user_agent));

  var sql = `
    INSERT INTO messages (user_id, markup, ip_address, user_agent)
    VALUES ($1, $2, $3::inet, $4)
    RETURNING *
  `;

  return yield queryOne(sql, [
    data.user_id, data.markup, data.ip_address, data.user_agent
  ]);
};

////////////////////////////////////////////////////////////

// Returns created user record
exports.insertUser = function*(data) {
  assert(_.isString(data.uname));
  assert(_.isString(data.email) || _.isUndefined(data.email));
  assert(_.isString(data.password));

  var digest = yield belt.hashPassword(data.password);

  var sql = `
    INSERT INTO users (uname, email, digest)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  return yield queryOne(sql, [data.uname, data.email, digest]);
};

exports.insertSession = function*(data) {
  assert(Number.isInteger(data.user_id));
  assert(_.isString(data.ip_address));
  assert(_.isString(data.user_agent) || _.isUndefined(data.user_agent));
  assert(_.isString(data.interval));

  var sql = `
    INSERT INTO sessions (id, user_id, ip_address, user_agent, expired_at)
    VALUES ($1, $2, $3::inet, $4, NOW() + $5::interval)
    RETURNING *
  `;

  return yield queryOne(sql, [
      uuid.v4(), data.user_id, data.ip_address, data.user_agent, data.interval
  ]);
};

exports.logoutSession = function*(userId, sessionId) {
  assert(Number.isInteger(userId));
  assert(_.isString(sessionId));

  var sql = `;
    UPDATE sessions
    SET logged_out_at = NOW()
    WHERE user_id = $1
      AND id = $2
  `;

  return yield query(sql, [userId, sessionId]);
};

exports.hideMessage = function*(messageId) {
  assert(messageId);

  var sql = `;
    UPDATE messages
    SET is_hidden = true
    WHERE id = $1
  `;

  return yield query(sql, [messageId]);
};

exports.getMessageById = function*(messageId) {
  assert(messageId);

  var sql = `;
    SELECT *
    FROM messages
    WHERE id = $1
  `;

  return yield queryOne(sql, [messageId]);
};

exports.updateUser = function*(userId, data) {
  assert(Number.isInteger(userId));

  var sql = `
    UPDATE users
    SET
      email = $2,
      role  = COALESCE($3, role)
    WHERE id = $1
    RETURNING *
  `;

  return yield queryOne(sql, [
    userId, 
    data.email,
    data.role
  ]);
};

exports.updateUserRole = function*(userId, role) {
  assert(Number.isInteger(userId));
  assert(_.isString(role));

  var sql = `
    UPDATE users
    SET role = $2::user_role
    WHERE id = $1
    RETURNING *
  `;

  return yield queryOne(sql, [userId, role]);
};

exports.updateMessage = function*(messageId, data) {
  assert(Number.isInteger(messageId));
  assert(_.isBoolean(data.is_hidden) || _.isUndefined(data.is_hidden));
  assert(_.isString(data.markup) || _.isUndefined(data.markup));

  var sql = `
    UPDATE messages
    SET
      is_hidden = COALESCE($2, is_hidden),
      markup    = COALESCE($3, markup)
    WHERE id = $1
    RETURNING *
  `;

  return yield queryOne(sql, [
    messageId, data.is_hidden, data.markup
  ]);
};

// TODO: Pagination
exports.getMessages = function*() {
  var sql = `
    SELECT
      m.*,
      to_json(u.*) AS "user"
    FROM messages m
    LEFT OUTER JOIN users u ON m.user_id = u.id
    ORDER BY m.id DESC
  `;

  return yield queryMany(sql);
};

// TODO: Pagination
// TODO: user.messages_count counter cache
// TODO: idx for is_hidden
exports.getUsers = function*() {
  var sql = `
    SELECT 
      u.*,
      (
        SELECT COUNT(*) 
        FROM messages
        WHERE user_id = u.id AND is_hidden = false
      ) AS messages_count
    FROM users u
    ORDER BY u.id DESC
  `;

  return yield queryMany(sql);
};

////////////////////////////////////////////////////////////
// To strive for a modicum of organization, let's start a
// 'namespace' for admin-panel related queries so we don't
// confuse them with less sensitive queries.

exports.admin = {};

// only counts visible messages, not hidden ones since they are effectively
// deleted
exports.admin.getStats = function*() {
  var sql = `;
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM messages WHERE is_hidden = false) AS messages_count
  `;

  return yield queryOne(sql);
};
