const debug = require('debug')('app:middleware:ensure-referer')
const { HOSTNAME } = require('../config')

// Cheap but simple way to protect against CSRF attacks
// TODO: Replace with something more versatile
module.exports = function ensureReferer() {
    return async (ctx, next) => {
        // Don't ensure referer in tests

        // Skip get requests
        if (['GET', 'HEAD', 'OPTIONS'].includes(ctx.method)) {
            return next()
        }

        // Skip if no HOSTNAME is set
        if (!HOSTNAME) {
            debug('Skipping referer check since HOSTNAME not provided')
            return next()
        }

        const refererHostname = nodeUrl.parse(ctx.headers['referer'] || '')
            .hostname

        ctx.assert(HOSTNAME === refererHostname, 'Invalid referer', 403)

        return next()
    }
}
