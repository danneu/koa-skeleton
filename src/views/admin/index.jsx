const React = require('react')
const PropTypes = require('prop-types')

const AdminIndex = ({ ctx, stats }) => [
    <ol class="breadcrumb">
        <li>
            <a href="/">Home</a>
        </li>
        <li class="active">Admin</li>
    </ol>,

    <div class="page-header">
        <h1>Admin Panel</h1>
    </div>,

    <div className="row">
        <div className="col-lg-8 col-lg-offset-2">
            <div className="row">
                <div className="col-lg-6">
                    <div className="panel panel-default">
                        <div className="panel-body text-center">
                            <p className="lead">Users</p>
                            <p className="lead" style={{ fontSize: '300%' }}>
                                {stats.users_count}
                            </p>
                            <p>
                                <a href="/users">View All</a>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="panel panel-default">
                        <div className="panel-body text-center">
                            <p className="lead">Messages</p>
                            <p className="lead" style={{ fontSize: '300%' }}>
                                {stats.messages_count}
                            </p>
                            <p>
                                <a href="/messages">View All</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>,
]

AdminIndex.propTypes = {
    ctx: PropTypes.object.isRequired,
    stats: PropTypes.object.isRequired,
}

module.exports = AdminIndex
