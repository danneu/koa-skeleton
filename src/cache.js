// 3rd
const IntervalCache = require('interval-cache')
// 1st
const db = require('./db')

//
// Some things are too wasteful to calculate on every request,
// but too trivial to extract into a real caching layer.
// e.g. SELECT COUNT(*)
// For these things, a setInterval on each server gets the job
// done.
//

// //////////////////////////////////////////////////////////

module.exports = new IntervalCache()
    .every('messages-count', 1000 * 60, db.getMessagesCount, 0)
    .every('users-count', 1000 * 60, db.getUsersCount, 0)
    .start()
