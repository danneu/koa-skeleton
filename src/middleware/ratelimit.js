// 1st
const db = require('../db')

module.exports = function ratelimit() {
    return async (ctx, next) => {
        // 5 second rate limit per ip_address
        const maxDate = new Date(Date.now() - 5000)
        try {
            await db.ratelimits.bump(ctx.ip, maxDate)
        } catch (err) {
            if (err instanceof Date) {
                const msg = `Ratelimited! You must wait ${waitLength(
                    err
                )} longer before posting.`
                ctx.check(false, msg)
                return
            }
            throw err
        }
        return next()
    }
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
