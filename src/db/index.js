'use strict';

// 3rd
const assert = require('better-assert');
const _ = require('lodash');
const uuid = require('uuid');
const debug = require('debug')('app:db');
// 1st
const belt = require('../belt');
const config = require('../config');
const dbUtil = require('./util');

/*
   This module is for general database queries that haven't
   yet been split off into more specific db submodules.
*/

////////////////////////////////////////////////////////////
// DB submodules
////////////////////////////////////////////////////////////

exports.admin = require('./admin');

////////////////////////////////////////////////////////////
// Query junk drawer
////////////////////////////////////////////////////////////

// UUID -> User | undefined
//
// Also bumps user's last_online_at column to NOW().
exports.getUserBySessionId = function*(sessionId) {
  assert(belt.isValidUuid(sessionId));

  const sql = `
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

  return yield dbUtil.queryOne(sql, [sessionId]);
};

// Case-insensitive uname lookup
exports.getUserByUname = function*(uname) {
  assert(_.isString(uname));

  const sql = `
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
  `;

  return yield dbUtil.queryOne(sql, [uname]);
};

////////////////////////////////////////////////////////////

exports.getRecentMessages = function*() {
  const sql = `
    SELECT
      m.*,
      to_json(u.*) "user"
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.is_hidden = false
    ORDER BY m.id DESC
    LIMIT 25
  `;

  return yield dbUtil.queryMany(sql);
};

exports.getRecentMessagesForUserId = function*(userId) {
  assert(_.isInteger(userId));

  const sql = `
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

  return yield dbUtil.queryMany(sql, [userId]);
};

////////////////////////////////////////////////////////////

// Returns inserted message
exports.insertMessage = function*(data) {
  assert(_.isInteger(data.user_id) || _.isUndefined(data.user_id));
  assert(_.isString(data.markup));
  assert(_.isString(data.ip_address));
  assert(_.isString(data.user_agent) || _.isUndefined(data.user_agent));

  const sql = `
    INSERT INTO messages (user_id, markup, ip_address, user_agent)
    VALUES ($1, $2, $3::inet, $4)
    RETURNING *
  `;

  return yield dbUtil.queryOne(sql, [
    data.user_id, data.markup, data.ip_address, data.user_agent
  ]);
};

////////////////////////////////////////////////////////////

// Returns created user record
exports.insertUser = function*(data) {
  assert(_.isString(data.uname));
  assert(_.isString(data.email) || _.isUndefined(data.email));
  assert(_.isString(data.password));

  const digest = yield belt.hashPassword(data.password);

  const sql = `
    INSERT INTO users (uname, email, digest)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  return yield dbUtil.queryOne(sql, [data.uname, data.email, digest]);
};

exports.insertSession = function*(data) {
  assert(_.isInteger(data.user_id));
  assert(_.isString(data.ip_address));
  assert(_.isString(data.user_agent) || _.isUndefined(data.user_agent));
  assert(_.isString(data.interval));

  const sql = `
    INSERT INTO sessions (id, user_id, ip_address, user_agent, expired_at)
    VALUES ($1, $2, $3::inet, $4, NOW() + $5::interval)
    RETURNING *
  `;

  return yield dbUtil.queryOne(sql, [
    uuid.v4(), data.user_id, data.ip_address, data.user_agent, data.interval
  ]);
};

exports.logoutSession = function*(userId, sessionId) {
  assert(_.isInteger(userId));
  assert(_.isString(sessionId));

  const sql = `;
    UPDATE sessions
    SET logged_out_at = NOW()
    WHERE user_id = $1
      AND id = $2
  `;

  return yield dbUtil.query(sql, [userId, sessionId]);
};

exports.hideMessage = function*(messageId) {
  assert(messageId);

  const sql = `;
    UPDATE messages
    SET is_hidden = true
    WHERE id = $1
  `;

  return yield dbUtil.query(sql, [messageId]);
};

exports.getMessageById = function*(messageId) {
  assert(messageId);

  const sql = `;
    SELECT *
    FROM messages
    WHERE id = $1
  `;

  return yield dbUtil.queryOne(sql, [messageId]);
};

exports.updateUser = function*(userId, data) {
  assert(_.isInteger(userId));

  const sql = `
    UPDATE users
    SET
      email = $2,
      role  = COALESCE($3, role)
    WHERE id = $1
    RETURNING *
  `;

  return yield dbUtil.queryOne(sql, [
    userId,
    data.email,
    data.role
  ]);
};

exports.updateUserRole = function*(userId, role) {
  assert(_.isInteger(userId));
  assert(_.isString(role));

  const sql = `
    UPDATE users
    SET role = $2::user_role
    WHERE id = $1
    RETURNING *
  `;

  return yield dbUtil.queryOne(sql, [userId, role]);
};

////////////////////////////////////////////////////////////

exports.updateMessage = function*(messageId, data) {
  assert(_.isInteger(messageId));
  assert(_.isBoolean(data.is_hidden) || _.isUndefined(data.is_hidden));
  assert(_.isString(data.markup) || _.isUndefined(data.markup));

  const sql = `
    UPDATE messages
    SET
      is_hidden = COALESCE($2, is_hidden),
      markup    = COALESCE($3, markup)
    WHERE id = $1
    RETURNING *
  `;

  return yield dbUtil.queryOne(sql, [
    messageId, data.is_hidden, data.markup
  ]);
};

////////////////////////////////////////////////////////////

exports.getMessages = function*(page) {
  page = page || 1;
  assert(_.isInteger(page));

  const sql = `
SELECT
  m.*,
  to_json(u.*) AS "user"
FROM messages m
LEFT OUTER JOIN users u ON m.user_id = u.id
ORDER BY m.id DESC
OFFSET $1
LIMIT $2
  `;

  const perPage = config.MESSAGES_PER_PAGE;
  const offset = (page - 1) * perPage;
  const limit = perPage;

  return yield dbUtil.queryMany(sql, [offset, limit]);
};

////////////////////////////////////////////////////////////

// Returns Int
exports.getMessagesCount = function*() {
  const sql = `
SELECT COUNT(*) AS "count"
FROM messages
WHERE is_hidden = false
  `;

  return (yield dbUtil.queryOne(sql)).count;
};

////////////////////////////////////////////////////////////

// Returns Int
exports.getUsersCount = function*() {
  const sql = `
SELECT COUNT(*) AS "count"
FROM users
  `;

  return (yield dbUtil.queryOne(sql)).count;
};

////////////////////////////////////////////////////////////

// TODO: user.messages_count counter cache
// TODO: idx for is_hidden
exports.getUsers = function*(page) {
  page = page || 1;
  assert(_.isInteger(page));

  const sql = `
SELECT
  u.*,
  (
    SELECT COUNT(*)
    FROM messages
    WHERE user_id = u.id AND is_hidden = false
  ) AS messages_count
FROM users u
ORDER BY u.id DESC
OFFSET $1
LIMIT $2
  `;

  const perPage = config.USERS_PER_PAGE;
  const offset = (page - 1) * perPage;
  const limit = perPage;

  return yield dbUtil.queryMany(sql, [offset, limit]);
};

////////////////////////////////////////////////////////////
