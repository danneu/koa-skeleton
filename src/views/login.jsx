const React = require('react')
const config = require('../config')

const Login = ({ ctx }) => [
    <ol className="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li className="active">Login</li>
    </ol>,

    <div className="page-header">
        <h1>Login to your account</h1>
    </div>,

    <div className="row">
        <div className="col-lg-6 col-lg-offset-3">
            <ul className="nav nav-tabs">
                <li className="active pull-right">
                    <a href="/login">Login</a>
                </li>
                <li className="pull-right">
                    <a href="/register">Register</a>
                </li>
            </ul>

            <form action="/login" method="POST">
                <div className="panel panel-default" style={{ borderTop: 0 }}>
                    <div className="panel-body">
                        <div className="form-group">
                            <label htmlFor="uname-input">Username:</label>
                            <input
                                type="text"
                                name="uname"
                                id="uname-input"
                                className="form-control"
                                required
                                autoFocus
                                value={
                                    (ctx.flash.params &&
                                        ctx.flash.params.uname) ||
                                    ''
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password-input">Password:</label>
                            <input
                                type="password"
                                name="password"
                                id="password-input"
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="remember-me-input">
                                <input
                                    type="checkbox"
                                    name="remember-me"
                                    id="remember-me-input"
                                    defaultChecked
                                />{' '}
                                Remember Me?
                            </label>
                        </div>
                    </div>
                    <div className="panel-footer text-right">
                        <button
                            type="submit"
                            className="g-recaptcha btn btn-default"
                            data-badge="inline"
                            data-sitekey={config.RECAPTCHA_SITEKEY}
                            data-callback="onRecaptchaSuccess"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>,

    <script src="https://www.google.com/recaptcha/api.js" />,

    <script src="/js/on-recaptcha-success.js" />,
]

module.exports = Login
