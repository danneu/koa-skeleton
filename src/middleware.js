// Node
const nodeUrl = require('url')
// 3rd
const debug = require('debug')('app:middleware')
const bouncer = require('koa-bouncer')
const recaptcha = require('recaptcha-validator')
// 1st
const db = require('./db')
const config = require('./config')
const pre = require('./presenters')

// Assoc ctx.currUser if the session_id cookie (a UUID v4)
// is an active session.
exports.wrapCurrUser = function() {
  return async (ctx, next) => {
    const sessionId = ctx.cookies.get('session_id')
    debug('[wrapCurrUser] session_id: ' + sessionId)
    if (!sessionId) return next()
    const user = await db.getUserBySessionId(sessionId)
    if (user) {
      ctx.currUser = pre.presentUser(user)
      ctx.currSessionId = sessionId
      debug('[wrapCurrUser] User found')
    } else {
      debug('[wrapCurrUser] No user found')
    }
    await next()
  }
}

// Expose req.flash (getter) and res.flash = _ (setter)
// Flash data persists in user's sessions until the next ~successful response
exports.wrapFlash = function(cookieName = 'flash') {
  return async (ctx, next) => {
    let data, tmp
    if (ctx.cookies.get(cookieName)) {
      tmp = decodeURIComponent(ctx.cookies.get(cookieName))
      // Handle bad JSON in the cookie, possibly set by fuzzers
      try {
        data = JSON.parse(tmp)
      } catch (err) {
        ctx.cookies.set(cookieName, null)
        data = {}
      }
    } else {
      data = {}
    }

    Object.defineProperty(ctx, 'flash', {
      enumerable: true,
      get: function() {
        return data
      },
      set: function(val) {
        const encodedVal = encodeURIComponent(JSON.stringify(val))
        ctx.cookies.set(cookieName, encodedVal, {
          // flash cookie only lasts 10 seconds to prevent stale flash messages.
          // CAVEAT: if the redirect request takes more than 10 seconds to
          // load, then the user will end up with no flash message,
          // no errors, etc.
          maxAge: 10000,
        })
      },
    })

    await next()

    // clear flash cookie if it's a successful request
    // AND if it was actually set (instead of sending extraneous set-cookie
    // on every request)
    if (
      ctx.response.status < 300 &&
      ctx.cookies.get(cookieName) !== undefined
    ) {
      ctx.cookies.set(cookieName, null)
    }
  }
}

exports.methodOverride = function() {
  return async (ctx, next) => {
    if (typeof ctx.request.body === 'undefined') {
      throw new Error(
        'methodOverride middleware must be applied after the body is parsed and ctx.request.body is populated'
      )
    }

    if (ctx.request.body && ctx.request.body._method) {
      ctx.method = ctx.request.body._method.toUpperCase()
      delete ctx.request.body._method
    }

    await next()
  }
}

exports.removeTrailingSlash = function() {
  return async (ctx, next) => {
    if (ctx.path.length > 1 && ctx.path.endsWith('/')) {
      ctx.redirect(ctx.path.slice(0, ctx.path.length - 1))
      return
    }

    await next()
  }
}

exports.handleBouncerValidationError = function() {
  return async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      if (err instanceof bouncer.ValidationError) {
        ctx.flash = {
          message: ['danger', err.message || 'Validation error'],
          // CAVEAT: Max cookie size is 4096 bytes. If the user sent us a
          // body that exceeds that (for example, a large message), then
          // the cookie will not get set (silently).
          // TODO: Consider using localStorage to persist request bodies
          // so that it scales.
          params: ctx.request.body,
          bouncer: err.bouncer,
        }
        return ctx.redirect('back')
      }

      throw err
    }
  }
}

exports.ensureRecaptcha = function() {
  return async (ctx, next) => {
    if (
      ['development', 'test'].includes(config.NODE_ENV) &&
      !ctx.request.body['g-recaptcha-response']
    ) {
      console.log('Development mode, so skipping recaptcha check')
      await next()
      return
    }

    if (!config.RECAPTCHA_SYSTEM_ONLINE) {
      console.warn(
        'Warn: Recaptcha environment variables not set, so skipping recaptcha check'
      )
      await next()
      return
    }

    ctx
      .validateBody('g-recaptcha-response')
      .required('You must attempt the human test')
      .isString()
      .checkPred(s => s.length > 0, 'You must attempt the human test')

    try {
      await recaptcha.promise(
        config.RECAPTCHA_SITESECRET,
        ctx.vals['g-recaptcha-response'],
        ctx.request.ip
      )
    } catch (err) {
      console.warn(
        'Got invalid captcha: ',
        ctx.vals['g-recaptcha-response'],
        err
      )
      ctx
        .validateBody('g-recaptcha-response')
        .check(false, 'Could not verify recaptcha was correct')
      return
    }

    await next()
  }
}

// Cheap but simple way to protect against CSRF attacks
// TODO: Replace with something more versatile
exports.ensureReferer = function() {
  return async (ctx, next) => {
    // Don't ensure referer in tests

    // Skip get requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(ctx.method)) {
      return next()
    }

    // Skip if no HOSTNAME is set
    if (!config.HOSTNAME) {
      debug('Skipping referer check since HOSTNAME not provided')
      return next()
    }

    const refererHostname = nodeUrl.parse(ctx.headers['referer'] || '').hostname

    ctx.assert(config.HOSTNAME === refererHostname, 'Invalid referer', 403)

    await next()
  }
}

exports.ratelimit = function() {
  return async (ctx, next) => {
    // 5 second rate limit per ip_address
    const maxDate = new Date(Date.now() - 5000)
    try {
      await db.ratelimits.bump(ctx.ip, maxDate)
    } catch (err) {
      if (err instanceof Date) {
        const msg = `
          Ratelimited! You must wait ${waitLength(err)} longer before posting.
        `
        ctx.check(false, msg)
        return
      }
      throw err
    }
    await next()
  }

  // HELPERS

  // Date -> String
  //
  // Turn a future date into a human-friendly message
  // waitLength(future) -> '1 minute and 13 seconds'
  function waitLength(tilDate) {
    // diff is in seconds
    const diff = Math.max(0, Math.ceil((tilDate - new Date()) / 1000))
    const mins = Math.floor(diff / 60)
    const secs = diff % 60
    let output = ''
    if (mins > 1) {
      output += `${mins} minutes and `
    } else if (mins === 1) {
      output += `${mins} minute and `
    }
    if (secs === 1) {
      output += `${secs} second`
    } else {
      output += `${secs} seconds`
    }
    return output
  }
}
