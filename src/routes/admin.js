// 3rd
const Router = require('koa-router')
const debug = require('debug')('app:routes:admin')
// 1st
const db = require('../db')

// Every route in this router is only accessible to admins

const router = new Router()

router.use(async (ctx, next) => {
  ctx.assert(ctx.currUser && ctx.currUser.role === 'ADMIN', 404)
  await next()
})

// //////////////////////////////////////////////////////////
// Routes

// Show admin panel homepage
router.get('/admin', async (ctx) => {
  const stats = await db.admin.getStats()
  await ctx.render('admin/index', {
    ctx,
    stats,
    title: 'Admin Panel'
  })
})

// //////////////////////////////////////////////////////////

// Delete hidden messages
router.del('/admin/messages/hidden', async (ctx) => {
  await db.admin.deleteHiddenMessages()

  ctx.flash = { message: ['success', 'Deleted hidden messages'] }
  ctx.redirect('back')
})

// //////////////////////////////////////////////////////////

module.exports = router
