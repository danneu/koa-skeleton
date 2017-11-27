const React = require('react')
const PropTypes = require('prop-types')
const belt = require('../../belt')

const Timeago = ({ date }) => (
    <abbr title={date.toISOString()}>{belt.timeago(date)}</abbr>
)

Timeago.propTypes = {
    date: PropTypes.instanceOf(Date),
}

module.exports = Timeago
