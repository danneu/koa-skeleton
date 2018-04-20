const makeRender = require('react-template-render')

// Adds ctx.render() method to koa context for rendering our .jsx templates
module.exports = function reactRender(root, opts) {
    return async (ctx, next) => {
        ctx.renderer = makeRender(root, opts)

        // Convenience function for streaming to the response
        ctx.render = (template, locals, overrides) => {
            ctx.type = 'html'
            ctx.body = ctx.renderer.stream(
                template,
                // Every template gets access to ctx
                { ...locals, ctx },
                overrides
            )
        }

        return next()
    }
}
