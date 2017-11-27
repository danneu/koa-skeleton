const React = require('react')
const PropTypes = require('prop-types')
const cancan = require('../../cancan')
const belt = require('../../belt')
const Timeago = require('./timeago')

const MessagePanel = ({ ctx, message }) => {
    if (!cancan.can(ctx.currUser, 'READ_MESSAGE', message)) {
        return null
    }

    return (
        <div className="panel panel-default">
            <div className="panel-heading text-right">
                {cancan.can(ctx.currUser, 'UPDATE_MESSAGE_STATE', message) && (
                    <DeleteButton message={message} />
                )}
                <small className="text-muted">
                    <Timeago date={message.created_at} />{' '}
                    {message.user ? (
                        [
                            <a href={message.user.url}>
                                <img
                                    src={belt.toAvatarUrl(message.user.uname)}
                                    alt={`${message.user.uname} avatar`}
                                    height={24}
                                    width={24}
                                />
                            </a>,
                            ' ',
                            <a href={message.user.url}>{message.user.uname}</a>,
                        ]
                    ) : (
                        <span>a guest</span>
                    )}
                </small>
            </div>
            <div
                className={`panel-body ${message.is_hidden ? 'bg-danger' : ''}`}
                style={{ maxHeight: '200px', overflow: 'auto' }}
                dangerouslySetInnerHTML={{
                    __html: belt.markupToHtml(message.markup),
                }}
            />
        </div>
    )
}

MessagePanel.propTypes = {
    ctx: PropTypes.object.isRequired,
    message: PropTypes.object.isRequired,
}

const DeleteButton = ({ message }) => (
    <form method="POST" action={`/messages/${message.id}`}>
        <input type="hidden" name="_method" value="PUT" />
        {message.is_hidden
            ? [
                  <input type="hidden" name="is_hidden" value="false" />,
                  <button className="btn btn-xs btn-default pull-left delete-message-btn">
                      Restore
                  </button>,
              ]
            : [
                  <input type="hidden" name="is_hidden" value="true" />,
                  <button className="btn btn-xs btn-danger pull-left delete-message-btn">
                      Delete
                  </button>,
              ]}
    </form>
)

DeleteButton.propTypes = {
    message: PropTypes.object.isRequired,
}

module.exports = MessagePanel
