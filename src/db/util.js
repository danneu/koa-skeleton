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

// Parse int8 into Javascript integer
pg.types.setTypeParser(20, function (val) {
  return val === null ? null : Number.parseInt(val, 10);
});
// Parse numerics into floats
pg.types.setTypeParser(1700, function (val) {
  return val === null ? null : Number.parseFloat(val);
}); 

////////////////////////////////////////////////////////////

// Run query with pooled connection
exports.query = query;
function * query (sql, params) {
  const [client, done] = yield pg.connectPromise(config.DATABASE_URL);
  try {
    return yield client.queryPromise(sql, params);
  } finally {
    // Release client back to pool even upon query error
    done();
  }
}

exports.queryOne = queryOne;
function * queryOne(sql, params) {
  const result = yield query(sql, params);
  assert(result.rows.length <= 1);
  return result.rows[0];
}

exports.queryMany = queryMany;
function * queryMany(sql, params) {
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
pg.Client.prototype.queryOnePromise = function (sql, params) {
  return this.queryPromise(sql, params).then(result => result.rows[0]);
};

pg.Client.prototype.queryManyPromise = function (sql, params) {
  return this.queryPromise(sql, params).then(result => result.rows);
};

////////////////////////////////////////////////////////////

// `runner` is a function that takes the pg client as an argument.
//
// Ex:
//   return yield withTransaction(function*(client) {
//     var result = yield [
//       client.queryPromise(fromUpdateSql, [amount, fromAccountId]),
//       client.queryPromise(toUpdateSql,   [amount, toAccountId])
//     ];
//     var updatedFromAccount = result[0].rows[0];
//     var updatedToAccount   = result[1].rows[0];
//     return { fromAccount: updatedFromAccount, toAccount: updatedToAccount };
//   });
//
exports.withTransaction = withTransaction;
function * withTransaction (runner) {
  const [client, done] = yield pg.connectPromise(config.DATABASE_URL);

  function * rollback (err) {
    try {
      yield client.queryPromise('ROLLBACK');
    } catch (ex) {
      console.error('[INTERNAL_ERROR] Could not rollback transaction, removing from pool');
      done(ex);
      throw ex;
    }
    done();

    if (err.code === '40P01') { // Deadlock
      console.warn('Caught deadlock error, retrying');
      return yield * withTransaction(runner);
    }
    if (err.code === '40001') { // Serialization error
      console.warn('Caught serialization error, retrying');
      return yield * withTransaction(runner);
    }
    throw err;
  }

  try {
    yield client.queryPromise('BEGIN');
  } catch (ex) {
    console.error('[INTERNAL_ERROR] There was an error calling BEGIN');
    return yield * rollback(ex);
  }

  let result;
  try {
    result = yield * runner(client);
  } catch (ex) {
    return yield * rollback(ex);
  }

  try {
    yield client.queryPromise('COMMIT');
  } catch (ex) {
    return yield * rollback(ex);
  }
  done();

  return result;
}
