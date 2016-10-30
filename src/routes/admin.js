'use strict';

// 3rd
const Router = require('koa-router');
const debug = require('debug')('app:routes:admin');
// 1st
const db = require('../db');

// Every route in this router is only accessible to admins

const router = new Router();

router.use(async (ctx, next) => {
  ctx.assert(ctx.currUser && ctx.currUser.role === 'ADMIN', 404);
  await next();
});

////////////////////////////////////////////////////////////
// Routes

// Show admin panel homepage
router.get('/admin', async (ctx, next) => {
  const stats = await db.admin.getStats();
  await ctx.render('admin/index', {
    ctx,
    stats,
    title: 'Admin Panel'
  });
});

////////////////////////////////////////////////////////////

module.exports = router;
