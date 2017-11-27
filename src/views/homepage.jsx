const React = require('react')
const config = require('../config')
const PropTypes = require('prop-types')
const MessagePanel = require('./partials/message-panel')

const Homepage = ({ ctx, messages }) => [
    <Jumbotron />,

    <div className="row">
        <div className="col-lg-6 col-lg-offset-3">
            <NewMessagePanel ctx={ctx} />
            <h2>Recent Messages</h2>
            {messages.length === 0 ? (
                <span>No messages. Wanna be the first?</span>
            ) : (
                [
                    messages.map(message => (
                        <MessagePanel ctx={ctx} message={message} />
                    )),
                    <p className="text-center">
                        <div className="col-lg-6 col-lg-offset-3">
                            <a
                                className="btn btn-default btn-block"
                                href="/messages"
                            >
                                View All →
                            </a>
                        </div>
                    </p>,
                ]
            )}
        </div>
    </div>,

    <script src="https://www.google.com/recaptcha/api.js" />,

    <script src="/js/on-recaptcha-success.js" />,
]

const Jumbotron = () => (
    <div
        className="jumbotron text-center"
        style={{ backgroundColor: 'inherit' }}
    >
        <h1>
            <a href="/" style={{ color: '#333' }}>
                koa-skeleton
            </a>
        </h1>
        <img
            src="/img/skeleton.png"
            height="75"
            width="75"
            alt="skeleton icon"
        />
        <p style={{ marginTop: '15px' }}>
            A simple <a href="http://koajs.com/">Koa</a> + Postgres webapp demo
            <br />
            that comes with useful abstractions and
            <br />
            boilerplate that work for me
        </p>
        <a
            className="btn btn-lg btn-success"
            href="https://github.com/danneu/koa-skeleton"
            style={{ marginBottom: '20px' }}
        >
            View on GitHub
            <p style={{ fontSize: '14px', marginBottom: '5px' }}>
                Just clone, gut, and modify
            </p>
        </a>
        <a
            href="https://heroku.com/deploy?template=https://github.com/danneu/koa-skeleton"
            style={{ display: 'block' }}
        >
            <img
                src="https://www.herokucdn.com/deploy/button.svg"
                alt="Deploy"
            />
        </a>
    </div>
)

const NewMessagePanel = ({ ctx }) => (
    <form method="POST" action="/messages">
        <div className="panel panel-default">
            <div className="panel-body">
                <p className="lead text-center">Leave a message</p>
                <div className="form-group">
                    <textarea
                        className="form-control"
                        id="markup-input"
                        rows="4"
                        name="markup"
                        placeholder="Click here and begin typing..."
                        required
                        maxLength="3000"
                    >
                        {ctx.flash.params && ctx.flash.params.markup}
                    </textarea>
                    <div className="help-block">
                        Note: There is a 5 second ratelimit.
                    </div>
                </div>
            </div>
            <div className="panel-footer text-right">
                <button
                    type="submit"
                    class="g-recaptcha btn btn-default"
                    data-badge="inline"
                    data-sitekey={config.RECAPTCHA_SITEKEY}
                    data-callback="onRecaptchaSuccess"
                >
                    Submit{' '}
                    {ctx.currUser ? `as ${ctx.currUser.uname}` : 'anonymously'}
                </button>
            </div>
        </div>
    </form>
)

Homepage.propTypes = {
    messages: PropTypes.array.isRequired,
}

module.exports = Homepage
