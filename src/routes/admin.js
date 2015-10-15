'use strict';

// 3rd
var Router = require('koa-router');
var debug = require('debug')('app:routes:admin');
// 1st
var db = require('../db');
var pre = require('../presenters');

// Every route in this router is only accessible to admins

var router = new Router();

router.use(function*(next) {
  this.assert(this.currUser && this.currUser.role === 'ADMIN', 404);
  yield *next;
});

////////////////////////////////////////////////////////////
// Routes

// Show admin panel homepage
router.get('/admin', function*() {
  var stats = yield db.admin.getStats();

  yield this.render('admin/index', {
    ctx: this,
    stats: stats
  });
});

////////////////////////////////////////////////////////////

module.exports = router;

