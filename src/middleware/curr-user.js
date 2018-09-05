// 3rd
const debug = require('debug')('app:middleware:curr-user')
// 1st
const db = require('../db')
const pre = require('../presenters')

// Add ctx.currUser key if the session_id cookie is an active session.
module.exports = function currUser() {
    return async (ctx, next) => {
        const sessionId = ctx.cookies.get('session_id')
        debug('session_id: ' + sessionId)
        if (!sessionId) return next()
        const user = await db.getUserBySessionId(sessionId)
        if (user) {
            ctx.currUser = pre.presentUser(user)
            ctx.currSessionId = sessionId
            debug('User found')
        } else {
            debug('No user found')
        }
        await next()
    }
}
