module.exports = function removeTrailingSlash() {
    return async (ctx, next) => {
        if (ctx.path.length > 1 && ctx.path.endsWith('/')) {
            ctx.redirect(ctx.path.slice(0, -1))
            return
        }

        return next()
    }
}
