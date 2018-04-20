const bouncer = require('koa-bouncer')

module.exports = function handleBouncerValidationError() {
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
