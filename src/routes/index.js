// 3rd party
const assert = require('better-assert')
const router = require('koa-router')()
const debug = require('debug')('app:routes:index')
// 1st party
const db = require('../db')
const pre = require('../presenters')
const mw = require('../middleware')
const config = require('../config')
const belt = require('../belt')
const paginate = require('../paginate')
const cache = require('../cache')

//
// The index.js routes file is mostly a junk drawer for miscellaneous
// routes until it's accumulated enough routes to warrant a new
// routes/*.js module.
//

// MIDDLEWARE

// expects /:uname param in url
// sets ctx.state.user
function loadUser () {
  return async (ctx, next) => {
    ctx.validateParam('uname')
    const user = await db.getUserByUname(ctx.vals.uname)
    ctx.assert(user, 404)
    pre.presentUser(user)
    ctx.state.user = user
    await next()
  }
}

// expects /:message_id param in url
// sets ctx.state.message
function loadMessage () {
  return async (ctx, next) => {
    ctx.validateParam('message_id')
    const message = await db.getMessageById(ctx.vals.message_id)
    ctx.assert(message, 404)
    pre.presentMessage(message)
    ctx.state.message = message
    await next()
  }
}

// //////////////////////////////////////////////////////////

// Useful route for quickly testing something in development
// 404s in production
router.get('/test', async (ctx) => {
  ctx.assert(config.NODE_ENV === 'development', 404)
})

// //////////////////////////////////////////////////////////

// Show homepage
router.get('/', async (ctx) => {
  const messages = await db.getRecentMessages()
  messages.forEach(pre.presentMessage)
  await ctx.render('homepage', {
    ctx,
    messages,
    recaptchaSitekey: config.RECAPTCHA_SITEKEY
  })
})

// //////////////////////////////////////////////////////////

// Update user
//
// Body:
// - email: Optional String
// - role: Optional String
router.put('/users/:uname', loadUser(), async (ctx) => {
  const {user} = ctx.state
  ctx.assertAuthorized(ctx.currUser, 'UPDATE_USER_*', user)
  // VALIDATION
  if (ctx.request.body.role) {
    ctx.assertAuthorized(ctx.currUser, 'UPDATE_USER_ROLE', user)
    ctx.validateBody('role')
      .isString()
      .isIn(['ADMIN', 'MOD', 'MEMBER', 'BANNED'])
  }
  if (typeof ctx.request.body.email !== 'undefined') {
    ctx.assertAuthorized(ctx.currUser, 'UPDATE_USER_SETTINGS', user)
    ctx.validateBody('email')
      .isString()
      .trim()
    if (ctx.vals.email) {
      ctx.validateBody('email').isEmail()
    }
  }
  // UPDATE
  await db.updateUser(user.id, {
    email: ctx.vals.email,
    role: ctx.vals.role
  })
  // RESPOND
  ctx.flash = { message: ['success', 'User updated'] }
  ctx.redirect(`${user.url}/edit`)
})

// //////////////////////////////////////////////////////////

// Edit user page
router.get('/users/:uname/edit', loadUser(), async (ctx) => {
  const {user} = ctx.state
  ctx.assertAuthorized(ctx.currUser, 'UPDATE_USER_*', user)
  await ctx.render('users_edit', {
    ctx: ctx,
    user,
    title: `Edit ${user.uname}`
  })
})

// //////////////////////////////////////////////////////////

// Show user profile
router.get('/users/:uname', loadUser(), async (ctx) => {
  const {user} = ctx.state
  const messages = await db.getRecentMessagesForUserId(user.id)
  messages.forEach(pre.presentMessage)
  await ctx.render('users_show', {
    ctx: ctx,
    user,
    messages,
    title: user.uname
  })
})

// //////////////////////////////////////////////////////////

// Create message
router.post('/messages', mw.ratelimit(), mw.ensureRecaptcha(), async (ctx) => {
  // AUTHZ
  ctx.assertAuthorized(ctx.currUser, 'CREATE_MESSAGE')
  // VALIDATE
  ctx.validateBody('markup')
    .required('Must provide a message')
    .isString()
    .trim()
    .tap(belt.transformMarkup)
    .isLength(3, 300, 'Message must be 3-300 chars')
  // SAVE
  await db.insertMessage({
    user_id: ctx.currUser && ctx.currUser.id,
    markup: ctx.vals.markup,
    ip_address: ctx.request.ip,
    user_agent: ctx.headers['user-agent']
  })
  // RESPOND
  ctx.flash = { message: ['success', 'Message created!'] }
  ctx.redirect('/')
})

// //////////////////////////////////////////////////////////

// List all messages
router.get('/messages', async (ctx) => {
  ctx.validateQuery('page')
    .defaultTo(1)
    .toInt()
  const [messages, count] = await Promise.all([
    db.getMessages(ctx.vals.page),
    cache.get('messages-count')
  ])
  messages.forEach(pre.presentMessage)
  const paginator = paginate.makePaginator(ctx.vals.page, count)
  await ctx.render('messages_list', {
    ctx: ctx,
    messages,
    paginator,
    messagesCount: count,
    title: `All Messages`
  })
})

// //////////////////////////////////////////////////////////

// List all users
router.get('/users', async (ctx) => {
  ctx.validateQuery('page')
    .defaultTo(1)
    .toInt()
  const [users, count] = await Promise.all([
    db.getUsers(ctx.vals.page),
    cache.get('users-count')
  ])
  users.forEach(pre.presentUser)
  const paginator = paginate.makePaginator(ctx.vals.page, count)
  await ctx.render('users_list', {
    ctx: ctx,
    users,
    paginator,
    usersCount: count,
    title: 'All Users'
  })
})

// //////////////////////////////////////////////////////////

// Update message
//
// Body:
// - is_hidden: Optional String of 'true' | 'false'
// - markup: Optional String
// - redirectTo: Optional String
router.put('/messages/:message_id', loadMessage(), async (ctx) => {
  const {message} = ctx.state
  // AUTHZ: Ensure user is authorized to make *any* update to message
  ctx.assertAuthorized(ctx.currUser, 'UPDATE_MESSAGE', message)
  if (ctx.request.body.is_hidden) {
    ctx.assertAuthorized(ctx.currUser, 'UPDATE_MESSAGE_STATE', message)
    ctx.validateBody('is_hidden')
      .isString()
      .tap(belt.parseBoolean)
  }
  if (ctx.request.body.markup) {
    ctx.assertAuthorized(ctx.currUser, 'UPDATE_MESSAGE_MARKUP', message)
    // FIXME: Extract markup validation into its own .isValidMarkup validator
    // and then reuse ctx here and in the insert-message route
    ctx.validateBody('markup')
      .isString()
      .trim()
      .tap(belt.transformMarkup)
      .isLength(3, 300, 'Message must be 3-300 chars')
  }
  ctx.validateBody('redirectTo')
    .defaultTo('/')
    .isString()
    .checkPred(s => s.startsWith('/'))
  // UPDATE
  await db.updateMessage(message.id, {
    is_hidden: ctx.vals.is_hidden,
    markup: ctx.vals.markup
  })
  // RESPOND
  ctx.flash = { message: ['success', 'Message updated'] }
  ctx.redirect('back')
})

// //////////////////////////////////////////////////////////

// Update user role
//
// Body:
// - role: String
router.put('/users/:uname/role', loadUser(), async (ctx) => {
  const {user} = ctx.state
  // AUTHZ
  ctx.assertAuthorized(ctx.currUser, 'UPDATE_USER_ROLE', user)
  // VALIDATE
  ctx.validateBody('role')
    .required('Must provide a role')
    .isString()
    .trim()
    .checkPred(s => s.length > 0, 'Must provide a role')
    .isIn(['ADMIN', 'MOD', 'MEMBER', 'BANNED'], 'Invalid role')
  ctx.validateBody('redirectTo')
    .defaultTo('/')
    .isString()
    .checkPred(s => s.startsWith('/'))
  // UPDATE
  await db.updateUser(user.id, { role: ctx.vals.role })
  // RESPOND
  ctx.flash = { message: ['success', 'Role updated'] }
  ctx.redirect(ctx.vals.redirectTo)
})

// //////////////////////////////////////////////////////////

module.exports = router
