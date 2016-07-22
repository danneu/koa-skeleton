'use strict';
// 3rd
const IntervalCache = require('interval-cache');
const co = require('co');
// 1st
const db = require('./db');

//
// Some things are too wasteful to calculate on every request,
// but too trivial to extract into a real caching layer. 
// e.g. SELECT COUNT(*)
// For these things, a setInterval on each server gets the job
// done. 
//

////////////////////////////////////////////////////////////

module.exports = new IntervalCache({ throwIfKeyNotFound: true })
  .every('messages-count', { mins: 1 }, co.wrap(db.getMessagesCount), 0)
  .every('users-count', { mins: 1 }, co.wrap(db.getUsersCount), 0)
  ;
