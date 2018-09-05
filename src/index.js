// Load env vars from .env, always run this early
require('dotenv').config()

require('babel-register')({
    presets: ['react'],
    extensions: ['.jsx'],
})

// 3rd party
const debug = require('debug')('app:index')
const Koa = require('koa')
const helmet = require('koa-helmet')
const compress = require('koa-compress')
const serveStatic = require('koa-better-static2')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const bouncer = require('koa-bouncer')
// 1st party
const { PORT, TRUST_PROXY } = require('./config')
const cancan = require('./cancan')

// //////////////////////////////////////////////////////////

const app = new Koa()
app.poweredBy = false
app.proxy = TRUST_PROXY

// //////////////////////////////////////////////////////////
// Middleware
// //////////////////////////////////////////////////////////

app.use(require('./middleware/ensure-referer')())
app.use(helmet())
app.use(compress())
// TODO: You would set a high maxage on static assets if they had their hash in their filename.
// This project currently has no static asset build system setup.
app.use(serveStatic('public', { maxage: 0 }))
app.use(logger())
app.use(bodyParser())
app.use(require('./middleware/method-override')()) // Must come after body parser
app.use(require('./middleware/remove-trailing-slash')())
app.use(require('./middleware/curr-user')())
app.use(require('./middleware/flash')())
app.use(bouncer.middleware())
app.use(require('./middleware/handle-bouncer-validation-error')()) // Must come after bouncer.middleware()
const viewsRoot = require('path').join(__dirname, 'views')
app.use(
    require('./middleware/react-render')(viewsRoot, {
        parent: 'master',
        keyPropWarnings: false,
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

app.start = function(port = PORT) {
    app.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`)
    })
}

module.exports = app
