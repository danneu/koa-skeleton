module.exports = function methodOverride() {
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

        return next()
    }
}
