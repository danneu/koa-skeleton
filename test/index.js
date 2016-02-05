'use strict';
// 3rd
const assert = require('chai').assert;
const request = require('supertest');
// 1st
const app = require('../src');

////////////////////////////////////////////////////////////

function statusTest(agent, verb, path, status) {
  it(`${verb.toUpperCase()} ${path} works`, done => {
    agent[verb.toLowerCase()](path).expect(status, done);
  });
}

// Hit all the public GET routes to catch stupid runtime errors
// Better than nothing.

// describe('public routing sanity check', () => {
//   const server = app.listen();
//   const agent = request.agent(server);
//   // general routes
//   statusTest(agent, 'GET', '/not-found', 404);
//   statusTest(agent, 'GET', '/', 200);
//   statusTest(agent, 'GET', '/users/test', 200);
//   statusTest(agent, 'GET', '/messages', 200);
//   statusTest(agent, 'GET', '/users', 200);
//   // authentication routes
//   statusTest(agent, 'GET', '/login', 200);
//   statusTest(agent, 'GET', '/register', 200);
// });

////////////////////////////////////////////////////////////

describe('random routing flow sanity check', () => {
  const server = app.listen();
  const agent = request.agent(server);

  // Guests can hit these routes

  it('can create message', done => {
    agent.post('/messages')
      .type('form')
      .send({ markup: 'hello world' })
      .expect(302, (err, res) => {
        console.log(res.headers);
        done();
      })
  });

  // Cannot hit these routes as a guest

  statusTest(agent, 'GET', '/users/test/edit', 404);
  statusTest(agent, 'GET', '/admin', 404);

  // Login as @test admin

  it('can login', done => {
    agent.post('/login')
      .type('form')
      .send({ uname: 'test', password: 'secret' })
      .expect(302, done);
  });

  // Should be able to hit previous routes now that agent is logged in as admin

  statusTest(agent, 'GET', '/users/test/edit', 200);
  statusTest(agent, 'GET', '/admin', 200);
});


  // TODO:
  // General
  // statusTest('PUT', '/messages/1', 200);
  // statusTest('PUT', '/users/1', 200);
  // statusTest('PUT', '/users/test/role', 200);
  // Authentication
  // statusTest('POST', '/login', 200);
  // statusTest('POST', '/users', 200);
  // statusTest('DELETE', '/sessions/1', 200);
  // Admin
  // statusTest('GET', '/admin', 200);
