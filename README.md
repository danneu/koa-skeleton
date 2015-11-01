
# koa-skeleton

[![Dependency Status](https://david-dm.org/danneu/koa-skeleton.svg)](https://david-dm.org/danneu/koa-skeleton)

Boilerplate demonstration that glues together Koa + Postgres + good defaults + common abstractions that I frequently use to create web applications.

Just fork, gut, and modify.

- Live Demo: https://koa-skeleton.danneu.com/

## The Stack

Depends on Node v4.x, but not very heavily.

- **Micro-framework**: [Koa](http://koajs.com/). It's very similar to [Express](http://expressjs.com/) except it supports synchronous-looking code with the use of `yield`/generators/and the [co](https://github.com/tj/co) abstraction.
- **Database**: [Postgres](http://www.postgresql.org/).
- **User-input validation**: [koa-bouncer](https://github.com/danneu/koa-bouncer). Admittedly, an undocumented work-in-progress.
- **View-layer templating**: [Nunjucks](https://mozilla.github.io/nunjucks/). Very similar to Django's [Jinja2](http://jinja.pocoo.org/) templates. The successor to [Swig](http://paularmstrong.github.io/swig/). Compatible with "Django HTML" editor syntax highlighter plugins like `htmldjango` in Vim.
- **Deployment**: [Heroku](https://heroku.com/). Keeps things easy while you focus on coding your webapp. Forces you to write your webapp statelessly and horizontally-scalably.

## Features/Demonstrations

- **User authentication** (/register, /login). Sessions are backed by the database and persisted on the client with a cookie `session_id=<UUID v4>`.
- **Role-based user authorization** (i.e. the permission system). Core abstraction is basically `can(currUser, action, target) -> Boolean`, which is implemented as one big switch statement. For example: `can(currUser, 'READ_TOPIC', topic)`. Inspired by [ryanb/cancan](https://github.com/ryanb/cancan), though my abstraction is an ultra simplification. My user table often has a `role` column that's either one of `ADMIN` | `MOD` | `MEMBER` (default) | `BANNED`.
- Recaptcha integration. Protect any route with Recaptcha by adding the `ensureRecaptcha` middleware to the route.
- Flash message cookie. You often want to display simple messages like "Topic created successfully" to the user, but you want the message to last just one request and survive any redirects.
- Relative human-friendly timestamps like 'Created 4 hours ago' that are updated live via Javascript as the user stays on the page. I accomplish this with the [timeago](http://timeago.yarp.com/) jQuery plugin.
- Comes with Bootstrap v3.x. I start almost every project with Bootstrap so that I can focus on the back-end code and have a decent looking front-end with minimal effort.
- `npm run reset-db`. During early development, I like to have a `reset-db` command that I can spam that will delete the schema, recreate it, and insert any sample data I put in a `seeds.sql` file.

## Setup

You must have Postgres installed. I recommend http://postgresapp.com/ for OSX.

    createdb koa-skeleton

Create a `.env` file in the root directory which will let you set environment variables in development. `npm run start-dev` will read from it.

Example `.env`:

    DATABASE_URL=postgres://username:password@localhost:5432/my-database
    DEBUG=app:*,-app:db

## Philosophy/Opinions

- It's better to write explicit glue code between small libraries than credentializing in larger libraries/frameworks that try to do everything for you. When you return to a project in eight months, it's generally easier to catch up by reading explicit glue code then library idiosyncrasies. Similarly, it's easier to catch up by reading SQL strings than your clever ORM backflips.
- Just write SQL. When you need more complex/composable queries (like a /search endpoint with various filter options), consider using a SQL query building library like [knex.js](http://knexjs.org/).
- Use whichever Javascript features that are supported by the lastest stable version of Node. I don't think Babel compilation and the resulting idiosyncrasies are worth the build step.

## Random Tips 

- Save the user's `user_agent` anywhere you save their `ip_address` for abuse prevention. People are well-conditioned to switch VPNs to circumvent ip_address bans, but they often forget to change their user_agent.
- koa-skeleton doesn't encrypt or sign cookies, so don't store sensitive information in cookies, or sign/encrypt cookies if you do.

## Conventions

- Aside from validation, never access query/body/url params via the Koa default like `this.request.body.username`. Instead, use koa-bouncer to move these to the `this.vals` object and access them there. This forces you to self-document what params you expect at the top of your route and prevents the case where you forget to validate params.

        router.post('/users', function*() {

          // Validation 

          this.validateBody('uname')
            .notEmpty('Username required')
            .isString()
            .tap(s => s.trim());
          // Email is optional
          if (this.request.body.email) {
            this.validateBody('email')
              .isString()
              .tap(s => s.trim())
              .isEmail();
          }
          this.validateBody('password1')
            .notEmpty('Password required')
            .isString()
            .tap(s => s.trim())
            .isLength(6, 100, 'Password must be 6-100 chars');
          this.validateBody('password2')
            .notEmpty('Password confirmation required')
            .isString()
            .tap(s => s.trim())
            .checkPred(p2 => p2 === this.vals.password1, 'Passwords must match');

          // Validation passed. Access the above params via `this.vals` for
          // the remainder of the route to ensure you're getting the validated
          // version.

          var user = yield db.insertUser({
            uname: this.vals.uname,
            password: this.vals.password1
          });

          this.redirect(`/users/${user.uname}`);
        })

## FAQ

- Q: Why pollute markup with Bootstrap classes?
    - A: When prototyping or trying to reach a webapp's minimally viable release, I find it much more efficient to prefer class pollution than having to maintain the markup alongside CSS files since the markup is likely to churn so frequently. 
    
    For instance, it's easier to reason about quick markup changes (like small nesting tweaks) when you can see things like `.row` and `.col-lg-6` right there in the markup you're editing.

    I think semantic markup purity is something that can wait until the webapp's general look and feel mature.

## License

MIT
