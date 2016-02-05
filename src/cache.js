'use strict';
// 3rd
const IntervalCache = require('interval-cache');
const co = require('co');
// 1st
const db = require('./db');

////////////////////////////////////////////////////////////

module.exports = new IntervalCache({ throwIfKeyNotFound: true })
  .every('messages-count', { mins: 1 }, co.wrap(db.getMessagesCount), 0)
  .every('users-count', { mins: 1 }, co.wrap(db.getUsersCount), 0)
  ;
