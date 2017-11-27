const React = require('react')
const PropTypes = require('prop-types')
const Paginate = require('./partials/paginate')
const cancan = require('../cancan')
const belt = require('../belt')
const Timeago = require('./partials/timeago')
const MessagePanel = require('./partials/message-panel')

const UsersShow = ({ ctx, user, messages }) => [
    <ol className="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li>
            <a href="/users">Users</a>
        </li>
        <li className="active">
            <a href={user.url} style={{ color: 'inherit' }}>
                {user.uname}
            </a>
        </li>
    </ol>,

    <div className="page-header">
        <div className="media">
            <div className="media-left">
                <a href={user.url}>
                    <img
                        className="media-object thumbnail"
                        src={belt.toAvatarUrl(user.uname)}
                        alt={`${user.uname} avatar`}
                        height={128}
                        width={128}
                    />
                </a>
            </div>
            <div className="media-body">
                <h1>
                    <a href={user.url} style={{ color: '#333' }}>
                        {user.uname}
                    </a>{' '}
                    <small>{belt.capitalize(user.role)}</small>
                    {cancan.can(ctx.currUser, 'UPDATE_USER_*', user) && [
                        ' ',
                        <a
                            href={`${user.url}/edit`}
                            className="btn btn-xs btn-default"
                        >
                            Edit
                        </a>,
                    ]}
                </h1>
                <ul>
                    <li>
                        Joined <Timeago date={user.created_at} />
                    </li>
                    <li>
                        Last online <Timeago date={user.last_online_at} />
                    </li>
                </ul>
            </div>
        </div>
    </div>,

    <h2>
        {ctx.currUser && ctx.currUser.id === user.id ? 'Your' : 'Their'} Recent
        Messages
    </h2>,

    messages.length === 0
        ? 'No messages'
        : messages.map(message => <MessagePanel ctx={ctx} message={message} />),
]

UsersShow.propTypes = {
    ctx: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    messages: PropTypes.array.isRequired,
}

module.exports = UsersShow
