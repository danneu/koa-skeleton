const React = require('react')
const PropTypes = require('prop-types')
const Paginate = require('./partials/paginate')
const cancan = require('../cancan')
const belt = require('../belt')
const Timeago = require('./partials/timeago')

const UsersList = ({ ctx, users, usersCount, paginator }) => [
    <ol className="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li className="active">Users</li>
    </ol>,
    <div className="page-header">
        <h1>
            Users <small>{usersCount} total</small>
        </h1>
    </div>,
    <Paginate paginator={paginator} />,
    <table className="table">
        <thead>
            <tr>
                <th>User</th>
                {cancan.isAdmin(ctx.currUser) && <th>Email</th>}
                <th>Messages</th>
                <th>Joined</th>
                <th>Last Online</th>
                <th>Role</th>
            </tr>
        </thead>
        <tbody>{users.map(user => <UserRow ctx={ctx} user={user} />)}</tbody>
    </table>,
    <Paginate paginator={paginator} />,
]

UsersList.propTypes = {
    usersCount: PropTypes.number.isRequired,
    users: PropTypes.array.isRequired,
    ctx: PropTypes.object.isRequired,
    paginator: PropTypes.array,
}

const UserRow = ({ ctx, user }) => (
    <tr>
        {/* Username */}
        <td>
            <a href={user.url}>
                <img
                    src={belt.toAvatarUrl(user.uname)}
                    alt={`${user.uname} avatar`}
                    height={32}
                    width={32}
                />
            </a>{' '}
            <a href={user.url}>{user.uname}</a>
        </td>
        {/* Email */}
        {cancan.isAdmin(ctx.currUser) && (
            <td>{user.email ? <code>{user.email}</code> : '--'}</td>
        )}
        {/* Messages */}
        <td>{user.messages_count}</td>
        {/* Joined */}
        <td>
            <Timeago date={user.created_at} />
        </td>
        {/* Last Online */}
        <td>
            <Timeago date={user.last_online_at} />
        </td>
        {/* Role */}
        {cancan.can(ctx.currUser, 'UPDATE_USER_ROLE', user) ? (
            <td>
                <form method="POST" action={`${user.url}/role`}>
                    <input type="hidden" name="_method" value="PUT" />
                    <input type="hidden" name="redirectTo" value="/users" />
                    <select name="role">
                        {['ADMIN', 'MOD', 'MEMBER', 'BANNED'].map(role => (
                            <option value={role} selected={user.role === role}>
                                {belt.capitalize(role)}
                                {user.role === role && '←'}
                            </option>
                        ))}
                    </select>{' '}
                    <button type="submit" className="btn btn-xs btn-default">
                        Save
                    </button>
                </form>
            </td>
        ) : (
            <td>
                {(() => {
                    switch (user.role) {
                        case 'ADMIN':
                            return (
                                <span className="label label-primary">
                                    {belt.capitalize(user.role)}
                                </span>
                            )
                        case 'MOD':
                            return (
                                <span className="label label-info">
                                    {belt.capitalize(user.role)}
                                </span>
                            )
                        case 'BANNED':
                            return (
                                <span className="label label-danger">
                                    {belt.capitalize(user.role)}
                                </span>
                            )
                        default:
                            return belt.capitalize(user.role)
                    }
                })()}
            </td>
        )}
    </tr>
)

UserRow.propTypes = {
    ctx: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
}

module.exports = UsersList
