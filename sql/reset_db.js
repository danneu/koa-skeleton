'use strict';

// Node
const path = require('path');
// 3rd
const co = require('co');
const fs = require('co-fs');
// 1st
const config = require('../src/config');
const dbUtil = require('../src/db/util');

////////////////////////////////////////////////////////////

// Sanity check: Ensure this isn't being run in production

if (config.NODE_ENV !== 'development') {
  throw new Error('[reset_db] May only reset database in development mode');
}

////////////////////////////////////////////////////////////

function *slurpSql(filePath) {
  const relativePath = '../sql/' + filePath;
  const fullPath = path.join(__dirname, relativePath);
  return yield fs.readFile(fullPath, 'utf8');
}

co(function*() {
  console.log('Resetting the database...');

  yield (function*() {
    const sql = yield slurpSql('schema.sql');
    console.log('-- Executing schema.sql...');
    return yield dbUtil.query(sql);
  })();

  yield (function*() {
    const sql = yield slurpSql('seeds.sql');
    console.log('-- Executing seeds.sql...');
    return yield dbUtil.query(sql);
  })();
}).then(function() {
  console.log('Finished resetting db');
  process.exit(0);
}, function(err){
  console.error('Error:', err, err.stack);
  process.exit(1);
});
