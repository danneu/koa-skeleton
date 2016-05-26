'use strict';

// 3rd
const Router = require('koa-router');
const debug = require('debug')('app:routes:admin');
// 1st
const db = require('../db');

// Every route in this router is only accessible to admins

const router = new Router();

router.use(function * (next) {
  this.assert(this.currUser && this.currUser.role === 'ADMIN', 404);
  yield * next;
});

////////////////////////////////////////////////////////////
// Routes

// Show admin panel homepage
router.get('/admin', function * () {
  const stats = yield db.admin.getStats();
  yield this.render('admin/index', {
    ctx: this,
    stats,
    title: 'Admin Panel'
  });
});

////////////////////////////////////////////////////////////

module.exports = router;
