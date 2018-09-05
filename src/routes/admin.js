// 3rd
const Router = require('koa-router')
const debug = require('debug')('app:routes:admin')
// 1st
const db = require('../db')
const loadUser = require('../middleware/load-user-from-param')

// Every route in this router is only accessible to admins

const router = new Router()

router.use(async (ctx, next) => {
    ctx.assert(ctx.currUser && ctx.currUser.role === 'ADMIN', 404)
    return next()
})

// //////////////////////////////////////////////////////////
// Routes

// Show admin panel homepage
router.get('/admin', async (ctx) => {
    const stats = await db.admin.getStats()
    await ctx.render('admin/index', {
        stats,
        title: 'Admin Panel',
    })
})

// //////////////////////////////////////////////////////////

// Delete all hidden messages
router.del('/admin/messages/hidden', async (ctx) => {
    await db.admin.deleteHiddenMessages({ all: true })

    ctx.flash = { message: ['success', 'Deleted hidden messages'] }
    ctx.redirect('back')
})

// //////////////////////////////////////////////////////////

// Delete user's hidden messages
router.del(
    '/admin/users/:uname/messages/hidden',
    loadUser('uname'),
    async (ctx) => {
        const { user } = ctx.state
        await db.admin.deleteHiddenMessages({ userId: user.id })

        ctx.flash = { message: ['success', 'Deleted hidden messages'] }
        ctx.redirect('back')
    }
)

// //////////////////////////////////////////////////////////

module.exports = router
