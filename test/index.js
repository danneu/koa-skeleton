'use strict';
// 3rd
const assert = require('chai').assert;
const req = require('supertest');
// 1st
const app = require('../src');

////////////////////////////////////////////////////////////

const server = app.listen();

////////////////////////////////////////////////////////////

function statusTest(verb, path, status) {
  it(`${verb.toUpperCase()} ${path} works`, done => {
    req(server)[verb.toLowerCase()](path).expect(status, done);
  });
}

// Hit all the public GET routes to catch stupid runtime errors
// Better than nothing.

describe('routing sanity check', () => {
  // general routes
  statusTest('GET', '/not-found', 404);
  statusTest('GET', '/', 200);
  statusTest('GET', '/users/test', 200);
  statusTest('GET', '/messages', 200);
  statusTest('GET', '/users', 200);
  // authentication routes
  statusTest('GET', '/login', 200);
  statusTest('GET', '/register', 200);

  // TODO:
  // General
  // statusTest('GET', '/users/test/edit', 200);
  // statusTest('POST', '/messages', 200);
  // statusTest('PUT', '/messages/1', 200);
  // statusTest('PUT', '/users/1', 200);
  // statusTest('PUT', '/users/test/role', 200);
  // Authentication
  // statusTest('POST', '/login', 200);
  // statusTest('POST', '/users', 200);
  // statusTest('DELETE', '/sessions/1', 200);
  // Admin
  // statusTest('GET', '/admin', 200);
});
