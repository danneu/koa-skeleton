'use strict';

// Node
var nodePath = require('path');
// 3rd party
var koa = require('koa');
var bouncer = require('koa-bouncer');
var views = require('koa-views');
var nunjucks = require('nunjucks');
var debug = require('debug')('app:index');
// 1st party
var config = require('./config');
var mw = require('./middleware');
var belt = require('./belt');
var cancan = require('./cancan');

////////////////////////////////////////////////////////////

var app = koa();
app.poweredBy = false;
app.proxy = config.TRUST_PROXY;

// Configure view-layer (nunjucks)

{
  let env = nunjucks.configure();

  // Expose global bindings to view layer
  env.addGlobal('can', cancan.can);

  // Define some view layer helpers
  env.addFilter('json', x => JSON.stringify(x, null, '  '));
  env.addFilter('formatDate', belt.formatDate);
  env.addFilter('nl2br', belt.nl2br);
  env.addFilter('md5', belt.md5);
  env.addFilter('toAvatarUrl', belt.toAvatarUrl);
}

// Middleware

app.use(mw.ensureReferer());
app.use(require('koa-helmet')());
app.use(require('koa-compress')());
app.use(require('koa-static')('public'));
app.use(require('koa-logger')());
app.use(require('koa-body')({ multipart: true }));
app.use(mw.methodOverride());  // Must come after body parser
app.use(mw.removeTrailingSlash());
app.use(mw.wrapCurrUser());
app.use(mw.wrapFlash('flash'));
app.use(bouncer.middleware());
app.use(mw.handleBouncerValidationError()); // Must come after bouncer.middleware()
app.use(views('../views', {
  default: 'html',
  map: { html: 'nunjucks' },
  cache: config.NODE_ENV === 'production' ? 'memory' : undefined
}));

// Provide a convience function for protecting our routes behind
// our authorization rules. If authorization check fails, 404 response.
//
// Usage:
//
//    router.get('/topics/:id', function*() {
//      var topic = yield db.getTopicById(this.params.id);
//      this.assertAuthorized(this.currUser, 'READ_TOPIC', topic);
//      ...
//    });
app.use(function*(next) {
  this.assertAuthorized = (user, action, target) => {
    var isAuthorized = cancan.can(user, action, target);
    {
      let uname = (user && user.uname) || '<Guest>';
      debug('[assertAuthorized] Can %s %s: %s', uname, action, isAuthorized);
    }
    this.assert(isAuthorized, 404);
  }
  yield *next;
});

// Routes

app.use(require('./routes').routes());
app.use(require('./routes/admin').routes());

////////////////////////////////////////////////////////////

app.listen(config.PORT, function() {
  console.log('Listening on port', config.PORT);
});
