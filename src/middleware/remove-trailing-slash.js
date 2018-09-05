// If request path ends in '/', redirect to path without slash.
//
// Avoids dupe-content URLs.
module.exports = function removeTrailingSlash() {
    return async (ctx, next) => {
        if (ctx.path.length > 1 && ctx.path.endsWith('/')) {
            ctx.redirect(ctx.path.slice(0, -1))
            return
        }

        return next()
    }
}
