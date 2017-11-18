// Load env vars from .env, always run this early
require('dotenv').config()
// 3rd party
const debug = require('debug')('app:index')
const Koa = require('koa')
const helmet = require('koa-helmet')
const compress = require('koa-compress')
const static = require('koa-better-static2')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const bouncer = require('koa-bouncer')
const pugRender = require('koa-pug-render')
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
// Middleware
// //////////////////////////////////////////////////////////

app.use(mw.ensureReferer())
app.use(helmet())
app.use(compress())
app.use(
    static('public', {
        // cache static assets for 365 days in production
        maxage:
            config.NODE_ENV === 'production' ? 1000 * 60 * 60 * 24 * 365 : 0,
    })
)
app.use(logger())
app.use(bodyParser())
app.use(mw.methodOverride()) // Must come after body parser
app.use(mw.removeTrailingSlash())
app.use(mw.wrapCurrUser())
app.use(mw.wrapFlash())
app.use(bouncer.middleware())
app.use(mw.handleBouncerValidationError()) // Must come after bouncer.middleware()
app.use(
    pugRender(require('path').join(__dirname, '../views'), {
        locals: {
            config,
            cancan,
            belt,
        },
    })
)

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
        ctx.assert(isAuthorized, 403)
    }
    return next()
})

// //////////////////////////////////////////////////////////
// Routes
// //////////////////////////////////////////////////////////

app.use(require('./routes').routes())
app.use(require('./routes/authentication').routes())
app.use(require('./routes/admin').routes())

// //////////////////////////////////////////////////////////

app.start = function(port = config.PORT) {
    app.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`)
    })
}

module.exports = app
