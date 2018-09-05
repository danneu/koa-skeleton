// Expose req.flash (getter) and res.flash = _ (setter)
// Flash data persists in user's sessions until the next ~successful response
module.exports = function flash(cookieName = 'flash') {
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
