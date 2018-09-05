// 3rd
const recaptcha = require('recaptcha-validator')
// 1st
const {
    NODE_ENV,
    RECAPTCHA_SYSTEM_ONLINE,
    RECAPTCHA_SITESECRET,
} = require('../config')

module.exports = function ensureRecaptcha() {
    return async (ctx, next) => {
        if (
            ['development', 'test'].includes(NODE_ENV) &&
            !ctx.request.body['g-recaptcha-response']
        ) {
            console.log('Development mode, so skipping recaptcha check')
            return next()
        }

        if (!RECAPTCHA_SYSTEM_ONLINE) {
            console.warn(
                'Warn: Recaptcha environment variables not set, so skipping recaptcha check'
            )
            return next()
        }

        ctx
            .validateBody('g-recaptcha-response')
            .required('You must attempt the human test')
            .isString()
            .checkPred((s) => s.length > 0, 'You must attempt the human test')

        await recaptcha(
            RECAPTCHA_SITESECRET,
            ctx.vals['g-recaptcha-response'],
            ctx.request.ip
        ).catch((err) => {
            if (typeof err === 'string') {
                console.warn(`Got invalid captcha: ${err}`)
                ctx
                    .validateBody('g-recaptcha-response')
                    .check(false, 'Could not verify recaptcha was correct')
                return
            }
            throw err
        })

        return next()
    }
}
