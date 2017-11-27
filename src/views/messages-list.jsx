const React = require('react')
const PropTypes = require('prop-types')
const cancan = require('../cancan')
const MessagePanel = require('./partials/message-panel')
const Paginate = require('./partials/paginate')

const MessagesList = ({ ctx, messages, messagesCount, paginator }) => [
    <ol className="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li className="active">Messages</li>
    </ol>,
    <div className="page-header">
        <h1>
            {cancan.isAdmin(ctx.currUser) && (
                <form
                    className="pull-right"
                    method="POST"
                    action="/admin/messages/hidden"
                >
                    <input type="hidden" name="_method" value="DELETE" />
                    <button type="submit" className="btn btn-default">
                        <span className="glyphicon glyphicon-trash" />
                        Clear hidden messages
                    </button>
                </form>
            )}{' '}
            Messages <small>{messagesCount} total</small>
        </h1>
        <Paginate paginator={paginator} />
        {messages.map(message => <MessagePanel ctx={ctx} message={message} />)}
        <Paginate paginator={paginator} />
    </div>,
]

MessagesList.propTypes = {
    ctx: PropTypes.object.isRequired,
    messages: PropTypes.array.isRequired,
    messagesCount: PropTypes.number.isRequired,
    paginator: PropTypes.array.isRequired,
}

module.exports = MessagesList
