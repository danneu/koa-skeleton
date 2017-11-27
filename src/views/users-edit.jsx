const React = require('react')
const PropTypes = require('prop-types')
const Paginate = require('./partials/paginate')
const cancan = require('../cancan')
const belt = require('../belt')
const Timeago = require('./partials/timeago')

const UsersEdit = ({ ctx, user }) => [
    <ol className="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li>
            <a href="/users">Users</a>
        </li>
        <li>
            <a href={user.url}>{user.uname}</a>
        </li>
        <li className="active">Edit</li>
    </ol>,

    <div className="page-header">
        <h1>
            Edit{' '}
            <a href={user.url} style={{ color: '#333' }}>
                {user.uname}
            </a>
        </h1>
        <a href={user.url}>← Back to profile</a>
    </div>,

    <div className="row">
        <div className="col-lg-8 col-lg-offset-2">
            <form method="POST" action={user.url}>
                <input type="hidden" name="_method" value="PUT" />
                <div className="panel panel-default">
                    <div className="panel-body">
                        <div className="form-group">
                            <label htmlFor="email-input">Email</label>
                            <input
                                id="email-input"
                                className="form-control"
                                name="email"
                                value={user.email}
                            />
                        </div>
                    </div>
                    <div className="panel-footer text-right">
                        <button type="submit" className="btn btn-default">
                            Submit
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>,
]

UsersEdit.propTypes = {
    ctx: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
}

module.exports = UsersEdit
