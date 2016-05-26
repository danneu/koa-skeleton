'use strict';
// 3rd party
const assert = require('better-assert');
const router = require('koa-router')();
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
// The index.js routes file is mostly a junk drawer for miscellaneous
// routes until it's accumulated enough routes to warrant a new
// routes/*.js module.
//

// MIDDLEWARE

// expects /:uname param in url
// sets this.state.user
function loadUser () {
  return function * (next) {
    this.validateParam('uname');
    const user = yield db.getUserByUname(this.vals.uname);
    this.assert(user, 404);
    pre.presentUser(user);
    this.state.user = user;
    yield * next;
  };
}

// expects /:message_id param in url
// sets this.state.message
function loadMessage () {
  return function * (next) {
    this.validateParam('message_id');
    const message = yield db.getMessageById(this.vals.message_id);
    this.assert(message, 404);
    pre.presentMessage(message);
    this.state.message = message;
    yield * next;
  };
}

////////////////////////////////////////////////////////////

// Useful route for quickly testing something in development
// 404s in production
router.get('/test', function * () {
  this.assert(config.NODE_ENV === 'development', 404);
  this.body = this.headers['user-agent'];
});

////////////////////////////////////////////////////////////

// Show homepage
router.get('/', function * () {
  const messages = yield db.getRecentMessages();
  messages.forEach(pre.presentMessage);
  yield this.render('homepage', {
    ctx: this,
    messages,
    recaptchaSitekey: config.RECAPTCHA_SITEKEY,
    recaptchaSystemOnline: config.RECAPTCHA_SYSTEM_ONLINE
  });
});

////////////////////////////////////////////////////////////

// Update user
//
// Body:
// - email: Optional String
// - role: Optional String
router.put('/users/:uname', loadUser(), function * () {
  const user = this.state.user;
  this.assertAuthorized(this.currUser, 'UPDATE_USER_*', user);
  // VALIDATION
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
  // UPDATE
  yield db.updateUser(user.id, {
    email: this.vals.email,
    role: this.vals.role
  });
  // RESPOND
  this.flash = { message: ['success', 'User updated']};
  this.redirect(`${user.url}/edit`);
});

////////////////////////////////////////////////////////////

// Edit user page
router.get('/users/:uname/edit', loadUser(), function*() {
  const user = this.state.user;
  this.assertAuthorized(this.currUser, 'UPDATE_USER_*', user);
  yield this.render('users_edit', {
    ctx: this,
    user,
    title: `Edit ${user.uname}`
  });
});

////////////////////////////////////////////////////////////

// Show user profile
router.get('/users/:uname', loadUser(), function*() {
  const user = this.state.user;
  const messages = yield db.getRecentMessagesForUserId(user.id);
  messages.forEach(pre.presentMessage);
  yield this.render('users_show', {
    ctx: this,
    user,
    messages,
    title: user.uname
  });
});

////////////////////////////////////////////////////////////

// Create message
router.post('/messages', mw.ratelimit(), mw.ensureRecaptcha, function * () {
  // AUTHZ
  this.assertAuthorized(this.currUser, 'CREATE_MESSAGE');
  // VALIDATE
  this.validateBody('markup')
    .required('Must provide a message')
    .isString()
    .trim()
    .tap(belt.transformMarkup)
    .isLength(3, 300, 'Message must be 3-300 chars');
  // SAVE
  yield db.insertMessage({
    user_id: this.currUser && this.currUser.id,
    markup: this.vals.markup,
    ip_address: this.request.ip,
    user_agent: this.headers['user-agent']
  });
  // RESPOND
  this.flash = { message: ['success', 'Message created!'] };
  this.redirect('/');
});

////////////////////////////////////////////////////////////

// List all messages
router.get('/messages', function * () {
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
    title: `All Messages`
  });
});

////////////////////////////////////////////////////////////

// List all users
router.get('/users', function * () {
  this.validateQuery('page')
    .defaultTo(1)
    .toInt();
  const results = yield {
    users: db.getUsers(this.vals.page),
    count: cache.get('users-count')
  };
  const users = results.users.map(pre.presentUser);
  const paginator = paginate.makePaginator(this.vals.page, results.count);
  yield this.render('users_list', {
    ctx: this,
    users,
    paginator,
    usersCount: results.count,
    title: 'All Users'
  });
});

////////////////////////////////////////////////////////////

// Update message
//
// Body:
// - is_hidden: Optional String of 'true' | 'false'
// - markup: Optional String
// - redirectTo: Optional String
router.put('/messages/:message_id', loadMessage(), function * () {
  const message = this.state.message;
  // AUTHZ: Ensure user is authorized to make *any* update to message
  this.assertAuthorized(this.currUser, 'UPDATE_MESSAGE', message);
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
  // UPDATE
  yield db.updateMessage(message.id, {
    is_hidden: this.vals.is_hidden,
    markup: this.vals.markup
  });
  // RESPOND
  this.flash = { message: ['success', 'Message updated'] };
  this.redirect(this.vals.redirectTo);
});

////////////////////////////////////////////////////////////

// Update user role
//
// Body:
// - role: String
router.put('/users/:uname/role', loadUser(), function * () {
  const user = this.state.user;
  // AUTHZ
  this.assertAuthorized(this.currUser, 'UPDATE_USER_ROLE', user);
  // VALIDATE
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
  // UPDATE
  yield db.updateUserRole(user.id, this.vals.role);
  // RESPOND
  this.flash = { message: ['success', 'Role updated'] };
  this.redirect(this.vals.redirectTo);
});

////////////////////////////////////////////////////////////

module.exports = router;
