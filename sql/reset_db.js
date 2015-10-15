'use strict';

// Node
var path = require('path');
// 3rd
var co = require('co');
var fs = require('co-fs');
// 1st
var config = require('../src/config');
var db = require('../src/db');

////////////////////////////////////////////////////////////

// Sanity check: Ensure this isn't being run in production

if (config.NODE_ENV !== 'development') {
  throw new Error('[reset_db] May only reset database in development mode');
}

////////////////////////////////////////////////////////////

function *slurpSql(filePath) {
  var relativePath = '../sql/' + filePath;
  var fullPath = path.join(__dirname, relativePath);
  return yield fs.readFile(fullPath, 'utf8');
}

co(function*() {
  console.log('Resetting the database...');

  {
    let sql = yield slurpSql('schema.sql');
    console.log('-- Executing schema.sql...');
    yield db.query(sql);
  }

  {
    let sql = yield slurpSql('seeds.sql');
    console.log('-- Executing seeds.sql...');
    yield db.query(sql);
  }
}).then(function() {
  console.log('Finished resetting db');
  process.exit(0);
}, function(err){
  console.error('Error:', err, err.stack);
  process.exit(1);
});
