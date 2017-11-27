const React = require('react')
const PropTypes = require('prop-types')

const Paginate = ({ paginator }) =>
    paginator && (
        <nav className="paginator">
            <ul className="pagination">
                {paginator.map(pg => {
                    if (pg.kind === 'BUTTON') {
                        return (
                            <li className={pg.isActive ? 'active' : ''}>
                                <a href={pg.href}>
                                    <span ariaHidden={true}>{pg.text}</span>
                                </a>
                            </li>
                        )
                    } else if (pg.kind === 'SEPARATOR') {
                        return (
                            <li className="separator">
                                <span>...</span>
                            </li>
                        )
                    }
                })}
            </ul>
        </nav>
    )

Paginate.propTypes = {
    paginator: PropTypes.array,
}

module.exports = Paginate
