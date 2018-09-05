// 3rd party
const assert = require('better-assert')
const Router = require('koa-router')
const debug = require('debug')('app:routes:index')
// 1st party
const db = require('../db')
const ensureRecaptcha = require('../middleware/ensure-recaptcha')
const config = require('../config')
const belt = require('../belt')

//
// These routes are concerned with registering, login, logout
//

const router = new Router()

// //////////////////////////////////////////////////////////

// Show login form
router.get('/login', async (ctx) => {
    await ctx.render('login', {
        title: 'Login',
    })
})

// //////////////////////////////////////////////////////////

// Create login session
router.post('/login', ensureRecaptcha(), async (ctx) => {
    // Validate

    ctx
        .validateBody('uname')
        .required('Invalid creds')
        .isString()
        .trim()
        .check(
            await db.getUserByUname(ctx.vals.uname),
            'Username does not exist'
        )
    ctx
        .validateBody('password')
        .required('Invalid creds')
        .isString()
    ctx.validateBody('remember-me').toBoolean()

    const user = await db.getUserByUname(ctx.vals.uname)
    ctx.check(user, 'Invalid creds')

    ctx.check(
        await belt.scrypt.verifyHash(ctx.vals.password, user.digest),
        'Invalid creds'
    )

    // User authenticated

    const session = await db.insertSession(
        user.id,
        ctx.ip,
        ctx.headers['user-agent'],
        ctx.vals['remember-me'] ? '1 year' : '2 weeks'
    )

    ctx.cookies.set('session_id', session.id, {
        expires: ctx.vals['remember-me']
            ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
            : undefined,
    })
    ctx.flash = { message: ['success', 'Logged in successfully'] }

    ctx.redirect('/')
})

// //////////////////////////////////////////////////////////

// Show register form
router.get('/register', async (ctx) => {
    await ctx.render('register', {
        title: 'Register',
    })
})

// //////////////////////////////////////////////////////////

// Create user
router.post('/users', ensureRecaptcha(), async (ctx) => {
    // Validation

    ctx
        .validateBody('uname')
        .isString('Username required')
        .trim()
        .isLength(3, 15, 'Username must be 3-15 chars')
        .match(
            /^[a-z0-9_-]+$/i,
            'Username must only contain a-z, 0-9, underscore (_), or hypen (-)'
        )
        .match(/[a-z]/i, 'Username must contain at least one letter (a-z)')
        .checkNot(await db.getUserByUname(ctx.vals.uname), 'Username taken')

    ctx
        .validateBody('password2')
        .isString('Password confirmation is required')
        .checkPred((s) => s.length > 0, 'Password confirmation is required')

    ctx
        .validateBody('password1')
        .isString('Password is required')
        .checkPred((s) => s.length > 0, 'Password is required')
        .isLength(6, 100, 'Password must be 6-100 chars')
        .eq(ctx.vals.password2, 'Password must match confirmation')

    ctx
        .validateBody('email')
        .optional() // only validate email if user provided one
        .isString()
        .trim()
        .isEmail('Invalid email address')
        .isLength(1, 140, 'Email must be less than 140 chars')

    // Insert user

    const user = await db.insertUser(
        ctx.vals.uname,
        ctx.vals.password1,
        ctx.vals.email
    )

    // Log them in

    const session = await db.insertSession(
        user.id,
        ctx.ip,
        ctx.headers['user-agent'],
        '1 year'
    )

    ctx.cookies.set('session_id', session.id, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
        httpOnly: true,
    })

    // Redirect to homepage with the good news

    ctx.flash = { message: ['success', 'Successfully registered. Welcome!'] }
    ctx.redirect('/')
})

// //////////////////////////////////////////////////////////

// Logout
router.del('/sessions/:id', async (ctx) => {
    // If user isn't logged in, give them the success case anyways
    if (!ctx.currUser) {
        ctx.flash = { message: ['success', 'You successfully logged out'] }
        ctx.redirect('/')
        return
    }
    ctx.validateParam('id')
    await db.logoutSession(ctx.currUser.id, ctx.vals.id)
    ctx.cookies.set('session_id', null)

    ctx.flash = { message: ['success', 'You successfully logged out'] }
    ctx.redirect('/')
})

// //////////////////////////////////////////////////////////

module.exports = router
