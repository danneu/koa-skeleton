
# koa-skeleton

[![Dependency Status](https://david-dm.org/danneu/koa-skeleton.svg)](https://david-dm.org/danneu/koa-skeleton)

Boilerplate demonstration that glues together Koa + Postgres + good defaults + common abstractions that I frequently use to create web applications.

Just fork, gut, and modify.

- Live Demo: https://koa-skeleton.danneu.com/

## The Stack

Depends on Node v4.x+:

- **Micro-framework**: [Koa](http://koajs.com/). It's very similar to [Express](http://expressjs.com/) except it supports synchronous-looking code with the use of `yield`/generators/and the [co](https://github.com/tj/co) abstraction.
- **Database**: [Postgres](http://www.postgresql.org/).
- **User-input validation**: [koa-bouncer](https://github.com/danneu/koa-bouncer).
- **View-layer templating**: [Nunjucks](https://mozilla.github.io/nunjucks/). Very similar to Django's [Jinja2](http://jinja.pocoo.org/) templates. The successor to [Swig](http://paularmstrong.github.io/swig/). Compatible with "Django HTML" editor syntax highlighter plugins like `htmldjango` in Vim.
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
| <code>TRUST_PROXY</code> | Boolean | false | Set it to the string `"true"` to turn it on. Turn it on if you're behind a proxy like Cloudflare which means you can trust the IP address supplied in the `X-Forwarded-For` header. If so, then `this.request.ip` will use that header if it's set. |
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

## Philosophy/Opinions

- It's better to write explicit glue code between small libraries than credentializing in larger libraries/frameworks that try to do everything for you. When you return to a project in eight months, it's generally easier to catch up by reading explicit glue code then library idiosyncrasies. Similarly, it's easier to catch up by reading SQL strings than your clever ORM backflips.
- Just write SQL. When you need more complex/composable queries (like a /search endpoint with various filter options), consider using a SQL query building library like [knex.js](http://knexjs.org/).
- Use whichever Javascript features that are supported by the lastest stable version of Node. I don't think Babel compilation and the resulting idiosyncrasies are worth the build step.

## Random Tips

- Save the user's `user_agent` anywhere you save their `ip_address` for abuse prevention. People are well-conditioned to switch VPNs to circumvent ip_address bans, but they often forget to change their user_agent.
- koa-skeleton doesn't encrypt or sign cookies, so don't store sensitive information in cookies, or sign/encrypt cookies if you do.

## Conventions

- Aside from validation, never access query/body/url params via the Koa default like `this.request.body.username`. Instead, use koa-bouncer to move these to the `this.vals` object and access them there. This forces you to self-document what params you expect at the top of your route and prevents the case where you forget to validate params.

    ``` javascript
    router.post('/users', function*() {

      // Validation

      this.validateBody('uname')
        .required('Username required')
        .isString()
        .trim();
      this.validateBody('email')
        .optional()
        .isString()
        .trim()
        .isEmail();
      this.validateBody('password1')
        .required('Password required')
        .isString()
        .isLength(6, 100, 'Password must be 6-100 chars');
      this.validateBody('password2')
        .required('Password confirmation required')
        .isString()
        .eq(this.vals.password1, 'Passwords must match');

      // Validation passed. Access the above params via `this.vals` for
      // the remainder of the route to ensure you're getting the validated
      // version.

      var user = yield db.insertUser({
        uname: this.vals.uname,
        password: this.vals.password1
      });

      this.redirect(`/users/${user.uname}`);
    });
    ```

## License

MIT
