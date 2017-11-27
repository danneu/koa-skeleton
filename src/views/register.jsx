const React = require('react')
const PropTypes = require('prop-types')
const config = require('../config')

const Register = ({ ctx }) => [
    <ol className="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li className="active">Register</li>
    </ol>,

    <div className="page-header">
        <h1>Create an account</h1>
    </div>,

    <div className="row">
        <div className="col-lg-6 col-lg-offset-3">
            <ul className="nav nav-tabs">
                <li className="pull-right">
                    <a href="/login">Login</a>
                </li>
                <li className="pull-right active">
                    <a href="/register">Register</a>
                </li>
            </ul>

            <form method="POST" action="/users">
                <div className="panel panel-default" style={{ borderTop: 0 }}>
                    <div className="panel-body">
                        <div className="form-group">
                            <label htmlFor="uname-input">Username:</label>
                            <input
                                className="form-control"
                                id="uname-input"
                                name="uname"
                                required
                                autoFocus
                                value={
                                    ctx.flash.params && ctx.flash.params.uname
                                }
                            />
                            <div className="help-block">
                                Must be 3-15 chars long
                                <br />
                                Valid chars:
                                <code>a-z</code>, <code>0-9</code>, underscore (<code>_</code>),
                                hyphen (<code>-</code>)
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password1-input">Password:</label>
                            <input
                                id="password1-input"
                                className="form-control"
                                type="password"
                                name="password1"
                                required
                            />
                            <div className="help-block">
                                Must be at least 6 chars long
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password2-input">
                                Confirm Password:
                            </label>
                            <input
                                id="password2-input"
                                className="form-control"
                                type="password"
                                name="password2"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="remember-me-input">
                                <input
                                    id="remember-me-input"
                                    type="checkbox"
                                    name="remember-me"
                                    defaultChecked
                                />{' '}
                                Remember me?
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

Register.propTypes = {
    ctx: PropTypes.object.isRequired,
}

module.exports = Register
