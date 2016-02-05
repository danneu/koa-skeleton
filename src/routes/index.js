'use strict';
// 3rd party
require('dotenv').config(); // Load env vars from .env, always run this early
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

const router = new Router();

////////////////////////////////////////////////////////////

// Useful route for quickly testing something in development
// 404s in production
router.get('/test', function*() {
  this.assert(config.NODE_ENV === 'development', 404);
  this.body = this.headers['user-agent'];
});

// Show homepage
router.get('/', function*() {
  let messages = yield db.getRecentMessages();
  messages = messages.map(pre.presentMessage);

  yield this.render('homepage', {
    ctx: this,
    messages: messages,
    recaptchaSitekey: config.RECAPTCHA_SITEKEY,
    recaptchaSystemOnline: config.RECAPTCHA_SYSTEM_ONLINE
  });
});

// Show login form
router.get('/login', function*() {
  yield this.render('login', {
    ctx: this,
    title: 'Login',
    recaptchaSitekey: config.RECAPTCHA_SITEKEY
  });
});

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

// Show register form
router.get('/register', function*() {
  yield this.render('register', {
    ctx: this,
    title: 'Register',
    recaptchaSitekey: config.RECAPTCHA_SITEKEY
  });
});

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

// Update user
//
// Body:
// - email: Optional String
// - role: Optional String
router.put('/users/:uname', function*() {
  // Load user
  this.validateParam('uname');
  let user = yield db.getUserByUname(this.vals.uname);
  this.assert(user, 404);
  user = pre.presentUser(user);
  this.assertAuthorized(this.currUser, 'UPDATE_USER_*', user);

  // Validation

  if (this.request.body.role) {
    this.assertAuthorized(this.currUser, 'UPDATE_USER_ROLE', user);
    this.validateBody('role')
      .isString()
      .isIn(['ADMIN', 'MOD', 'MEMBER', 'BANNED']);
  }

  if (this.request.body.email) {
    this.assertAuthorized(this.currUser, 'UPDATE_USER_SETTINGS', user);
    this.validateBody('email')
      .isString()
      .trim();
    if (this.vals.email) {
      this.validateBody('email').isEmail();
    }
  }

  // Update user

  yield db.updateUser(user.id, {
    email: this.vals.email,
    role: this.vals.role
  });

  this.flash = { message: ['success', 'User updated']};
  this.redirect(`${user.url}/edit`);
});

// Edit user page
router.get('/users/:uname/edit', function*() {
  // Load user
  this.validateParam('uname');
  let user = yield db.getUserByUname(this.vals.uname);
  this.assert(user, 404);
  user = pre.presentUser(user);
  this.assertAuthorized(this.currUser, 'UPDATE_USER_*', user);

  yield this.render('users_edit', {
    ctx: this,
    user: user
  });
});

// Show user profile
router.get('/users/:uname', function*() {
  // Load user

  this.validateParam('uname');
  let user = yield db.getUserByUname(this.vals.uname);
  this.assert(user, 404);
  user = pre.presentUser(user);

  // Load user's messages
  const messages = (yield db.getRecentMessagesForUserId(user.id))
    .map(pre.presentMessage);

  yield this.render('users_show', {
    ctx: this,
    user: user,
    messages: messages
  });
});

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

// Create message
router.post('/messages', mw.ensureRecaptcha, function*() {
  this.assertAuthorized(this.currUser, 'CREATE_MESSAGE');

  // Validation

  this.validateBody('markup')
    .required('Must provide a message')
    .isString()
    .trim()
    .tap(belt.transformMarkup)
    .isLength(3, 300, 'Message must be 3-300 chars');

  // Validation pass, save message

  yield db.insertMessage({
    user_id: this.currUser && this.currUser.id,
    markup: this.vals.markup,
    ip_address: this.request.ip,
    user_agent: this.headers['user-agent']
  });

  this.flash = { message: ['success', 'Message created!'] };
  this.redirect('/');
});

////////////////////////////////////////////////////////////

// List all messages
router.get('/messages', function*() {

  this.validateQuery('page')
    .defaultTo(1)
    .toInt();

  const results = yield {
    messages: db.getMessages(this.vals.page),
    count: cache.get('messages-count')
  };

  const messages = results.messages.map(pre.presentMessage);
  const paginator = paginate.makePaginator(this.vals.page, results.count);

  yield this.render('messages_list', {
    ctx: this,
    messages,
    paginator,
    messagesCount: results.count,
  });
});

////////////////////////////////////////////////////////////

// List all users
// TODO: Pagination
router.get('/users', function*() {
  let users = yield db.getUsers();
  users = users.map(pre.presentUser);

  yield this.render('users_list', {
    ctx: this,
    users: users
  });
});

////////////////////////////////////////////////////////////

// Update message
//
// Body:
// - is_hidden: Optional String of 'true' | 'false'
// - markup: Optional String
// - redirectTo: Optional String
router.put('/messages/:id', function*() {
  // Load message
  this.validateParam('id');
  const message = yield db.getMessageById(this.vals.id);
  this.assert(message, 404);

  // Ensure user is authorized to make *any* update to message
  this.assertAuthorized(this.currUser, 'UPDATE_MESSAGE', message);

  // Check authorization against specific changes user is trying to make

  if (this.request.body.is_hidden) {
    this.assertAuthorized(this.currUser, 'UPDATE_MESSAGE_STATE', message);
    this.validateBody('is_hidden')
      .isString()
      .tap(belt.parseBoolean);
  }

  if (this.request.body.markup) {
    this.assertAuthorized(this.currUser, 'UPDATE_MESSAGE_MARKUP', message);
    // FIXME: Extract markup validation into its own .isValidMarkup validator
    // and then reuse this here and in the insert-message route
    this.validateBody('markup')
      .isString()
      .trim()
      .tap(belt.transformMarkup)
      .isLength(3, 300, 'Message must be 3-300 chars');
  }

  this.validateBody('redirectTo')
    .defaultTo('/')
    .isString()
    .checkPred(s => s.startsWith('/'));

  // Update message

  yield db.updateMessage(message.id, {
    is_hidden: this.vals.is_hidden,
    markup: this.vals.markup
  });

  this.flash = { message: ['success', 'Message updated'] };
  this.redirect(this.vals.redirectTo);
});

// Update user role
//
// Body:
// - role: String
router.put('/users/:uname/role', function*() {
  // Load user
  this.validateParam('uname');
  const user = yield db.getUserByUname(this.vals.uname);
  this.assert(user, 404);

  this.assertAuthorized(this.currUser, 'UPDATE_USER_ROLE', user);

  // Validation

  this.validateBody('role')
    .required('Must provide a role')
    .isString()
    .trim()
    .checkPred(s => s.length > 0, 'Must provide a role')
    .isIn(['ADMIN', 'MOD', 'MEMBER', 'BANNED'], 'Invalid role');

  this.validateBody('redirectTo')
    .defaultTo('/')
    .isString()
    .checkPred(s => s.startsWith('/'));

  // Update user

  yield db.updateUserRole(user.id, this.vals.role);

  this.flash = { message: ['success', 'Role updated'] };
  this.redirect(this.vals.redirectTo);
});

////////////////////////////////////////////////////////////

module.exports = router;
