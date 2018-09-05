// Presents are functions that take data from the database
// and extend/improve it for the view layer. They're used in routes.
//
// For instance, a presenter would promote a string timestamp into
// a Date object which is more convenient for the view layer to work with.
//
// Example:
//
//     let user = presentUser(yield db.getUser(42))
//     this.assert(user, 404)
//     this.body = user

// //////////////////////////////////////////////////////////

exports.presentUser = function(x) {
    if (!x) return
    // Fix embedded json representation
    if (typeof x.created_at === 'string') x.created_at = new Date(x.created_at)
    x.url = `/users/${x.uname}`
    return x
}

// //////////////////////////////////////////////////////////

exports.presentSession = function(x) {
    if (!x) return
    // Fix embedded json representation
    if (typeof x.created_at === 'string') x.created_at = new Date(x.created_at)
    if (typeof x.expired_at === 'string') x.expired_at = new Date(x.expired_at)
    return x
}

// //////////////////////////////////////////////////////////

exports.presentMessage = function(x) {
    if (!x) return
    exports.presentUser(x.user)
    x.url = `/messages/${x.id}`
    return x
}
