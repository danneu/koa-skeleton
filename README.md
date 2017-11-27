<div align="center">
  <img src="/public/img/skeleton.png" alt="skeleton">
</div>

# koa-skeleton

[![Dependency Status](https://david-dm.org/danneu/koa-skeleton.svg)](https://david-dm.org/danneu/koa-skeleton)

An example Koa application that glues together Koa + Postgres + good defaults + common abstractions that I frequently use to create web applications.

Originally this project was intended to be forked and modified, but it's grown to the point
that it's better left as a demonstration of how one can structure a Koa + Postgres application.

- Live Demo: https://koa-skeleton.danneu.com/

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/danneu/koa-skeleton)

## The Stack

Depends on Node v8.x+:

- **Micro-framework**: [Koa 2.x](http://koajs.com/). It's very similar to [Express](http://expressjs.com/) except it supports async/await.
- **Database**: [Postgres](http://www.postgresql.org/).
- **User-input validation**: [koa-bouncer](https://github.com/danneu/koa-bouncer).
- **HTML templating**: [React/JSX](https://github.com/danneu/react-template-render). HTML is rendered on the server via React JSX templates.
- **Deployment**: [Heroku](https://heroku.com/). Keeps things easy while you focus on coding your webapp. Forces you to write your webapp statelessly and horizontally-scalably.

## Setup

You must have Postgres installed. I recommend http://postgresapp.com/ for OSX.

    createdb koa-skeleton
    git clone git@github.com:danneu/koa-skeleton.git
    cd koa-skeleton
    touch .env
    npm install
    npm run reset-db
    npm run start-dev

    > Server is listening on http://localhost:3000...

Create a `.env` file in the root directory which will let you set environment variables. `npm run start-dev` will read from it.

Example `.env`:

    DATABASE_URL=postgres://username:password@localhost:5432/my-database
    DEBUG=app:*
    RECAPTCHA_SITEKEY=''
    RECAPTCHA_SITESECRET=''

## Configuration (Environment Variables)

koa-skeleton is configured with environment variables.

You can set these by putting them in a `.env` file at the project root (good
for development) or by exporting them in the environment (good for production,
like on Heroku).

You can look at `src/config.js` to view these and their defaults.

| Evironment Variable | Type | Default | Description |
| --- | --- | --- | --- |
| <code>NODE_ENV</code> | String | "development" | Set to `"production"` on the production server to enable some optimizations and security checks that are turned off in development for convenience. |
| <code>PORT</code> | Integer | 3000 | Overriden by Heroku in production. |
| <code>DATABASE_URL</code> | String | "postgres://localhost:5432/koa-skeleton" | Overriden by Heroku in production if you use its Heroku Postgres addon. |
| <code>TRUST_PROXY</code> | Boolean | false | Set it to the string `"true"` to turn it on. Turn it on if you're behind a proxy like Cloudflare which means you can trust the IP address supplied in the `X-Forwarded-For` header. If so, then `ctx.request.ip` will use that header if it's set. |
| <code>HOSTNAME</code> | String | undefined | Set it to your hostname in production to enable basic CSRF protection. i.e. `example.com`, `subdomain.example.com`. If set, then any requests not one of `GET | HEAD | OPTIONS` must have a `Referer` header set that originates from the given HOSTNAME. The referer is always set for `<form>` submissions, for example. Very crude protection. |
| <code>RECAPTCHA_SITEKEY</code> | String | undefined | Must be set to enable the Recaptcha system. <https://www.google.com/recaptcha> |
| <code>RECAPTCHA_SITESECRET</code> | String | undefined | Must be set to enable the Recaptcha system. <https://www.google.com/recaptcha> |
| <code>MESSAGES_PER_PAGE</code> | Integer | 10 | Determines how many messages to show per page when viewing paginated lists |
| <code>USERS_PER_PAGE</code> | Integer | 10 | Determines how many users to show per page when viewing paginated lists |

Don't access `process.env.*` directly in the app.
Instead, require the `src/config.js` and access them there.

## Features/Demonstrations

- **User authentication** (/register, /login). Sessions are backed by the database and persisted on the client with a cookie `session_id=<UUID v4>`.
- **Role-based user authorization** (i.e. the permission system). Core abstraction is basically `can(currUser, action, target) -> Boolean`, which is implemented as one big switch statement. For example: `can(currUser, 'READ_TOPIC', topic)`. Inspired by [ryanb/cancan](https://github.com/ryanb/cancan), though my abstraction is an ultra simplification. My user table often has a `role` column that's either one of `ADMIN` | `MOD` | `MEMBER` (default) | `BANNED`.
- **Recaptcha integration**. Protect any route with Recaptcha by adding the `ensureRecaptcha` middleware to the route.
- Flash message cookie. You often want to display simple messages like "Topic created successfully" to the user, but you want the message to last just one request and survive any redirects.
- Relative human-friendly timestamps like 'Created 4 hours ago' that are updated live via Javascript as the user stays on the page. I accomplish this with the [timeago](http://timeago.yarp.com/) jQuery plugin.
- Comes with Bootstrap v3.x. I start almost every project with Bootstrap so that I can focus on the back-end code and have a decent looking front-end with minimal effort.
- `npm run reset-db`. During early development, I like to have a `reset-db` command that I can spam that will delete the schema, recreate it, and insert any sample data I put in a `seeds.sql` file.
- Ratelimit middleware. An IP address can only insert a message every X seconds.

## Philosophy/Opinions

- It's better to write explicit glue code between small libraries than credentializing in larger libraries/frameworks that try to do everything for you. When you return to a project in eight months, it's generally easier to catch up by reading explicit glue code then library idiosyncrasies. Similarly, it's easier to catch up by reading SQL strings than your clever ORM backflips.
- Just write SQL. When you need more complex/composable queries (like a /search endpoint with various filter options), consider using a SQL query building library like [knex.js](http://knexjs.org/).
- Use whichever Javascript features that are supported by the lastest stable version of Node. I don't think Babel compilation and the resulting idiosyncrasies are worth the build step.

## Conventions

- Aside from validation, never access query/body/url params via the Koa default like `ctx.request.body.username`. Instead, use koa-bouncer to move these to the `ctx.vals` object and access them there. This forces you to self-document what params you expect at the top of your route and prevents the case where you forget to validate params.

    ``` javascript
    router.post('/users', async (ctx, next) => {

      // Validation

      ctx.validateBody('uname')
        .isString('Username required')
        .trim()
        .isLength(3, 15, 'Username must be 3-15 chars')
      ctx.validateBody('email')
        .optional()
        .isString()
        .trim()
        .isEmail()
      ctx.validateBody('password1')
        .isString('Password required')
        .isLength(6, 100, 'Password must be 6-100 chars')
      ctx.validateBody('password2')
        .isString('Password confirmation required')
        .eq(ctx.vals.password1, 'Passwords must match')

      // Validation passed. Access the above params via `ctx.vals` for
      // the remainder of the route to ensure you're getting the validated
      // version.

      const user = await db.insertUser(
        ctx.vals.uname, ctx.vals.password1, ctx.vals.email
      )

      ctx.redirect(`/users/${user.uname}`)
    })
    ```

## Changelog

The following version numbers are meaningless.

- `4.0.0` 26 Nov 2017
  - Replace Pug with React/JSX for HTML templating.
- `3.1.0` 14 Nov 2017
  - Replace Nunjucks with Pug for HTML templating.
- `3.0.0` 25 Apr 2017
  - Removed Babel since the features we want are now supported by Node 7.x.
- `2.0.0` 29 Oct 2015
  - Refactored from Koa 1.x to Koa 2.x.
- `0.1.0` 29 Oct 2016
  - koa-skeleton is a year old, but I just started versioning it
    started at v0.1.0.
  - Extracted `src/db/util.js` into `pg-extra` npm module.
    Now util.js just exports the connection pool for other modules to use.

## License

MIT
