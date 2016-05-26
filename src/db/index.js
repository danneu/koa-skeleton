'use strict';

// 3rd
const assert = require('better-assert');
const uuid = require('uuid');
const debug = require('debug')('app:db');
// 1st
const belt = require('../belt');
const config = require('../config');
const dbUtil = require('./util');

// This module is for general database queries that haven't
// yet been split off into more specific db submodules.

// RE-EXPORT SUBMODULES

exports.admin = require('./admin');
exports.ratelimits = require('./ratelimits');

// QUERY JUNK DRAWER

// UUID -> User | undefined
//
// Also bumps user's last_online_at column to NOW().
exports.getUserBySessionId = function * (sessionId) {
  assert(belt.isValidUuid(sessionId));
  return yield dbUtil.queryOne(`
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
  `, [sessionId]);
};

// Case-insensitive uname lookup
exports.getUserByUname = function * (uname) {
  assert(typeof uname === 'string');
  return yield dbUtil.queryOne(`
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
  `, [uname]);
};

////////////////////////////////////////////////////////////

exports.getRecentMessages = function * () {
  return yield dbUtil.queryMany(`
    SELECT
      m.*,
      to_json(u.*) "user"
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.is_hidden = false
    ORDER BY m.id DESC
    LIMIT 25
  `);
};

exports.getRecentMessagesForUserId = function * (userId) {
  assert(Number.isInteger(userId));
  return yield dbUtil.queryMany(`
    SELECT
      m.*,
      to_json(u.*) "user"
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.is_hidden = false
      AND u.id = $1
    ORDER BY m.id DESC
    LIMIT 25
  `, [userId]);
};

////////////////////////////////////////////////////////////

// Returns inserted message
//
// data.user_id is optional int
// data.markup is string
// data.ip_address is string
// data.user_agent is optional string
exports.insertMessage = function * (data) {
  assert(typeof data.markup === 'string');
  assert(typeof data.ip_address === 'string');
  return yield dbUtil.queryOne(`
    INSERT INTO messages (user_id, markup, ip_address, user_agent)
    VALUES ($1, $2, $3::inet, $4)
    RETURNING *
  `, [data.user_id, data.markup, data.ip_address, data.user_agent]);
};

////////////////////////////////////////////////////////////

// Returns created user record
//
// email is optional
exports.insertUser = function * (uname, password, email) {
  assert(typeof uname === 'string');
  assert(typeof password === 'string');
  const digest = yield belt.hashPassword(password);
  return yield dbUtil.queryOne(`
    INSERT INTO users (uname, email, digest)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [uname, email, digest]);
};

// userAgent is optional string
exports.insertSession = function * (userId, ipAddress, userAgent, interval) {
  assert(Number.isInteger(userId));
  assert(typeof ipAddress === 'string');
  assert(typeof interval === 'string');
  return yield dbUtil.queryOne(`
    INSERT INTO sessions (id, user_id, ip_address, user_agent, expired_at)
    VALUES ($1, $2, $3::inet, $4, NOW() + $5::interval)
    RETURNING *
  `, [
    uuid.v4(), userId, ipAddress, userAgent, interval
  ]);
};

exports.logoutSession = function * (userId, sessionId) {
  assert(Number.isInteger(userId));
  assert(typeof sessionId === 'string');
  return yield dbUtil.query(`
    UPDATE sessions
    SET logged_out_at = NOW()
    WHERE user_id = $1
      AND id = $2
  `, [userId, sessionId]);
};

exports.hideMessage = function * (messageId) {
  assert(messageId);
  return yield dbUtil.query(`
    UPDATE messages
    SET is_hidden = true
    WHERE id = $1
  `, [messageId]);
};

exports.getMessageById = function * (messageId) {
  assert(messageId);
  return yield dbUtil.queryOne(`
    SELECT *
    FROM messages
    WHERE id = $1
  `, [messageId]);
};

exports.updateUser = function * (userId, data) {
  assert(Number.isInteger(userId));
  return yield dbUtil.queryOne(`
    UPDATE users
    SET
      email = $2,
      role  = COALESCE($3, role)
    WHERE id = $1
    RETURNING *
  `, [userId, data.email, data.role]);
};

exports.updateUserRole = function * (userId, role) {
  assert(Number.isInteger(userId));
  assert(typeof role === 'string');
  return yield dbUtil.queryOne(`
    UPDATE users
    SET role = $2::user_role
    WHERE id = $1
    RETURNING *
  `, [userId, role]);
};

////////////////////////////////////////////////////////////

// data.is_hidden is optional boolean
// data.markup is optional string
exports.updateMessage = function * (messageId, data) {
  assert(Number.isInteger(messageId));
  return yield dbUtil.queryOne(`
    UPDATE messages
    SET
      is_hidden = COALESCE($2, is_hidden),
      markup    = COALESCE($3, markup)
    WHERE id = $1
    RETURNING *
  `, [messageId, data.is_hidden, data.markup]);
};

////////////////////////////////////////////////////////////

exports.getMessages = function * (page) {
  page = page || 1;
  assert(Number.isInteger(page));
  const perPage = config.MESSAGES_PER_PAGE;
  const offset = (page - 1) * perPage;
  const limit = perPage;
  return yield dbUtil.queryMany(`
    SELECT
      m.*,
      to_json(u.*) AS "user"
    FROM messages m
    LEFT OUTER JOIN users u ON m.user_id = u.id
    ORDER BY m.id DESC
    OFFSET $1
    LIMIT $2
  `, [offset, limit]);
};

////////////////////////////////////////////////////////////

// Returns Int
exports.getMessagesCount = function * () {
  const row = yield dbUtil.queryOne(`
    SELECT COUNT(*) AS "count"
    FROM messages
    WHERE is_hidden = false
  `)
  return row.count;
};

////////////////////////////////////////////////////////////

// Returns Int
exports.getUsersCount = function * () {
  const row = yield dbUtil.queryOne(`
    SELECT COUNT(*) AS "count"
    FROM users
  `);
  return row.count;
};

////////////////////////////////////////////////////////////

// TODO: user.messages_count counter cache
// TODO: idx for is_hidden
exports.getUsers = function * (page) {
  page = page || 1;
  assert(Number.isInteger(page));
  const perPage = config.USERS_PER_PAGE;
  const offset = (page - 1) * perPage;
  const limit = perPage;
  return yield dbUtil.queryMany(`
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
  `, [offset, limit]);
};

////////////////////////////////////////////////////////////
