'use strict';
// 3rd party
const assert = require('better-assert');
const Router = require('koa-router');
const debug = require('debug')('app:routes:index');
// 1st party
const db = require('../db');
const pre = require('../presenters');
const mw = require('../middleware');
const config = require('../config');
const belt = require('../belt');
const paginate = require('../paginate');
const cache = require('../cache');

//
// These routes are concerned with registering, login, logout
//

const router = new Router();

////////////////////////////////////////////////////////////

// Show login form
router.get('/login', function*() {
  yield this.render('login', {
    ctx: this,
    title: 'Login',
    recaptchaSitekey: config.RECAPTCHA_SITEKEY
  });
});

////////////////////////////////////////////////////////////

// Create login session
//router.post('/login', mw.ensureRecaptcha, function*() {
router.post('/login', mw.ensureRecaptcha, function*() {

  // Validate

  this.validateBody('uname')
    .required('Invalid creds')
    .isString()
    .trim();
  this.validateBody('password')
    .required('Invalid creds')
    .isString();
  this.validateBody('remember-me')
    .toBoolean();

  const user = yield db.getUserByUname(this.vals.uname);
  this.check(user, 'Invalid creds');
  this.check(yield belt.checkPassword(this.vals.password, user.digest), 'Invalid creds');

  // User authenticated

  const session = yield db.insertSession({
    user_id:    user.id,
    ip_address: this.request.ip,
    interval:  (this.vals['remember-me'] ? '1 year' : '2 weeks')
  });

  this.cookies.set('session_id', session.id, {
    expires: this.vals['remember-me'] ? belt.futureDate({ years: 1 }) : undefined
  });
  this.flash = { message: ['success', 'Logged in successfully'] };

  this.redirect('/');
});

////////////////////////////////////////////////////////////

// Show register form
router.get('/register', function*() {
  yield this.render('register', {
    ctx: this,
    title: 'Register',
    recaptchaSitekey: config.RECAPTCHA_SITEKEY
  });
});

////////////////////////////////////////////////////////////

// Create user
router.post('/users', mw.ensureRecaptcha, function*() {

  // Validation

  this.validateBody('uname')
    .required('Username required')
    .isString()
    .trim()
    .checkPred(s => s.length > 0, 'Username required')
    .isLength(3, 15, 'Username must be 3-15 chars')
    .match(/^[a-z0-9_-]+$/i, 'Username must only contain a-z, 0-9, underscore (_), or hypen (-)')
    .match(/[a-z]/i, 'Username must contain at least one letter (a-z)')
    .checkNot(yield db.getUserByUname(this.vals.uname), 'Username taken');

  this.validateBody('password2')
    .required('Password confirmation is required')
    .isString()
    .checkPred(s => s.length > 0, 'Password confirmation is required');

  this.validateBody('password1')
    .required('Password is required')
    .isString()
    .checkPred(s => s.length > 0, 'Password is required')
    .isLength(6, 100, 'Password must be 6-100 chars')
    .eq(this.vals.password2, 'Password must match confirmation');

  this.validateBody('email')
    .optional()  // only validate email if user provided one
    .isString()
    .trim()
    .isEmail('Invalid email address')
    .isLength(1, 140, 'Email is too long');

  // Insert user

  const user = yield db.insertUser({
    uname: this.vals.uname,
    password: this.vals.password1,
    email: this.vals.email
  });

  // Log them in

  const session = yield db.insertSession({
    user_id: user.id,
    ip_address: this.request.ip,
    user_agent: this.headers['user-agent'],
    interval: '1 year'
  });

  this.cookies.set('session_id', session.id, {
    expires: belt.futureDate({ years: 1 }),
    httpOnly: true
  });

  // Redirect to homepage with the good news

  this.flash = { message: ['success', 'Successfully registered. Welcome!'] };
  this.redirect('/');
});

////////////////////////////////////////////////////////////

// Logout
router.del('/sessions/:id', function*() {
  this.assert(this.currUser, 404);
  this.validateParam('id');
  this.validateBody('redirectTo')
    .defaultTo('/')
    .isString()
    .checkPred(s => s.startsWith('/'));

  yield db.logoutSession(this.currUser.id, this.vals.id);
  this.cookies.set('session_id', null);

  this.flash = { message: ['success', 'You successfully logged out'] };
  this.redirect(this.vals.redirectTo);
});

////////////////////////////////////////////////////////////

module.exports = router;
