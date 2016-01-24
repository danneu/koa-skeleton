'use strict';

// 3rd
const pg = require('co-pg')(require('pg'));
const assert = require('better-assert');
// 1st
const config = require('../config');

/*
   This module contains core, reusable helper functions for
   interacting with Postgres.

   The rest of the db namespace should be importing this module.
*/

////////////////////////////////////////////////////////////

// Configure pg client to parse int8 into Javscript integer
pg.types.setTypeParser(20, val => val === null ? null : Number.parseInt(val, 10));
// And parse numerics into floats
pg.types.setTypeParser(1700, val => val === null ? null : Number.parseFloat(val));

////////////////////////////////////////////////////////////

// Run query with pooled connection
exports.query = query;
function* query(sql, params) {
  const connResult = yield pg.connectPromise(config.DATABASE_URL);
  const client = connResult[0];
  const done = connResult[1];
  try {
    return yield client.queryPromise(sql, params);
  } finally {
    // Release client back to pool even upon query error
    done();
  }
}

exports.queryOne = queryOne;
function* queryOne(sql, params) {
  const result = yield query(sql, params);
  assert(result.rows.length <= 1);
  return result.rows[0];
}

exports.queryMany = queryMany;
function* queryMany(sql, params) {
  const result = yield query(sql, params);
  return result.rows;
}

////////////////////////////////////////////////////////////

// Add those queryOne and queryMany helpers to the pg Client prototype
// too so that we can use them inside transactions and such.
//
// Example:
//
//    exports.testQuery = function*() {
//      return yield withTransaction(function*(client) {
//        var count1 = yield client.queryOnePromise('SELECT COUNT(*) FROM users');
//        var count2 = yield client.queryOnePromise('SELECT COUNT(*) FROM messages');
//
//        return [count1, count2];
//      });
//    };
pg.Client.prototype.queryOnePromise = function(sql, params) {
  return this.queryPromise(sql, params).then(result => result.rows[0]);
};

pg.Client.prototype.queryManyPromise = function(sql, params) {
  return this.queryPromise(sql, params).then(result => result.rows);
};

////////////////////////////////////////////////////////////

// `runner` is a generator function that accepts one arguement:
// a database client.
function* withClient(runner) {
  const connResult = yield pg.connectPromise(config.DATABASE_URL);
  const client = connResult[0];
  const done = connResult[1];

  let result;
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
    let result;
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
