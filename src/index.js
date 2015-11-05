'use strict';

// 3rd party
const koa = require('koa');
const bouncer = require('koa-bouncer');
const views = require('koa-views');
const nunjucks = require('nunjucks');
const debug = require('debug')('app:index');
// 1st party
const config = require('./config');
const mw = require('./middleware');
const belt = require('./belt');
const cancan = require('./cancan');

////////////////////////////////////////////////////////////

const app = koa();
app.poweredBy = false;
app.proxy = config.TRUST_PROXY;

// Configure view-layer (nunjucks)

{
  const env = nunjucks.configure();

  // Expose global bindings to view layer
  env.addGlobal('can', cancan.can);

  // Define some view layer helpers
  env.addFilter('json', x => JSON.stringify(x, null, '  '));
  env.addFilter('formatDate', belt.formatDate);
  env.addFilter('nl2br', belt.nl2br);
  env.addFilter('md5', belt.md5);
  env.addFilter('toAvatarUrl', belt.toAvatarUrl);
  env.addFilter('autolink', belt.autolink);
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
//      const topic = yield db.getTopicById(this.params.id);
//      this.assertAuthorized(this.currUser, 'READ_TOPIC', topic);
//      ...
//    });
app.use(function*(next) {
  this.assertAuthorized = (user, action, target) => {
    const isAuthorized = cancan.can(user, action, target);
    {
      const uname = (user && user.uname) || '<Guest>';
      debug('[assertAuthorized] Can %s %s: %s', uname, action, isAuthorized);
    }
    this.assert(isAuthorized, 404);
  };
  yield* next;
});

// Routes

app.use(require('./routes').middleware());
app.use(require('./routes/admin').middleware());

////////////////////////////////////////////////////////////

app.listen(config.PORT, function() {
  console.log('Listening on port', config.PORT);
});
