const db = require('../db')
const pre = require('../presenters')

// sets ctx.state.user
module.exports = function loadUser(key) {
    return async (ctx, next) => {
        ctx.validateParam(key)
        const user = await db.getUserByUname(ctx.vals.uname)
        ctx.assert(user, 404)
        pre.presentUser(user)
        ctx.state.user = user
        await next()
    }
}
