
// 3rd party
// Load env vars from .env, always run this early
require('dotenv').config()
const Koa = require('koa')
const bouncer = require('koa-bouncer')
const nunjucksRender = require('koa-nunjucks-render')
const debug = require('debug')('app:index')
const convert = require('koa-convert')
// 1st party
const config = require('./config')
const mw = require('./middleware')
const belt = require('./belt')
const cancan = require('./cancan')

// //////////////////////////////////////////////////////////

const app = new Koa()
app.poweredBy = false
app.proxy = config.TRUST_PROXY

// //////////////////////////////////////////////////////////
// Configure view-layer (nunjucks)
//
// We can override options send directly to nunjucks.
// https://mozilla.github.io/nunjucks/api.html#configure
// //////////////////////////////////////////////////////////

const nunjucksOptions = {
  // `yield this.render('show_user')` will assume that a show_user.html exists
  ext: '.html',
  noCache: config.NODE_ENV !== 'production',
  // don't throw template errors in development if we try to render
  // a null/undefined like {{ x }}. in theory, setting it to true prevents
  // bugs and forces you to be explicit about {{ x or '' }}, but in reality,
  // often more annoying than it's worth.
  throwOnUndefined: false,
  // globals are bindings we want to expose to all templates
  globals: {
    // let us use `can(USER, ACTION, TARGET)` authorization-checks in templates
    can: cancan.can,
    cancan,
    config
  },
  // filters are functions that we can pipe values to from nunjucks templates.
  // e.g. {{ user.uname | md5 | toAvatarUrl }}
  filters: {
    json: x => JSON.stringify(x, null, '  '),
    formatDate: belt.formatDate,
    nl2br: belt.nl2br,
    md5: belt.md5,
    toAvatarUrl: belt.toAvatarUrl,
    autolink: belt.autolink
  }
}

// //////////////////////////////////////////////////////////
// Middleware
// //////////////////////////////////////////////////////////

app.use(mw.ensureReferer())
app.use(require('koa-helmet')())
app.use(convert(require('koa-compress')()))
app.use(convert(require('koa-better-static')('public', {
  // cache static assets for 365 days in production
  maxage: config.NODE_ENV === 'production' ? 1000 * 60 * 60 * 24 * 365 : 0
})))
// Don't show logger in test mode
if (config.NODE_ENV !== 'test') {
  app.use(convert(require('koa-logger')()))
}
app.use(convert(require('koa-body')()))
app.use(mw.methodOverride()) // Must come after body parser
app.use(mw.removeTrailingSlash())
app.use(mw.wrapCurrUser())
app.use(mw.wrapFlash())
app.use(bouncer.middleware())
app.use(mw.handleBouncerValidationError()) // Must come after bouncer.middleware()
app.use(convert(nunjucksRender('views', nunjucksOptions)))

// Provide a convience function for protecting our routes behind
// our authorization rules. If authorization check fails, 404 response.
//
// Usage:
//
//    router.get('/topics/:id', async (ctx, next) {
//      const topic = await db.getTopicById(ctx.params.id)
//      ctx.assertAuthorized(ctx.currUser, 'READ_TOPIC', topic)
//      ...
//    })
app.use(async (ctx, next) => {
  ctx.assertAuthorized = (user, action, target) => {
    const isAuthorized = cancan.can(user, action, target)
    const uname = (user && user.uname) || '<Guest>'
    debug('[assertAuthorized] Can %s %s: %s', uname, action, isAuthorized)
    ctx.assert(isAuthorized, 404)
  }
  return next()
})

// //////////////////////////////////////////////////////////
// Routes
// //////////////////////////////////////////////////////////

app.use(convert(require('./routes').routes()))
app.use(convert(require('./routes/authentication').routes()))
app.use(convert(require('./routes/admin').routes()))

// //////////////////////////////////////////////////////////

app.start = function (port = config.PORT) {
  app.listen(port, () => {
    console.log('Listening on port', port)
  })
}

module.exports = app
