// Node
const crypto = require('crypto')
// 3rd
const bcrypt = require('bcrypt')
const assert = require('better-assert')
const debug = require('debug')('app:belt')
const Autolinker = require('autolinker')

// A dumping ground of common functions used around the app.
// As it gets full, consider extracting similar functions into
// separate modules to stay organized.

// Ex: formatDate(d) -> '8 Dec 2014 16:24'
exports.formatDate = function(d) {
    assert(d instanceof Date)
    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ]
    const mins = d.getMinutes()
    // Pad mins to format "XX". e.g. 8 -> "08", 10 -> "10"
    const paddedMins = mins < 10 ? '0' + mins : mins
    return [
        d.getDate(),
        months[d.getMonth()],
        d.getFullYear(),
        d.getHours() + ':' + paddedMins,
    ].join(' ')
}

// String -> Bool
exports.isValidUuid = (() => {
    const re = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
    return uuid => re.test(uuid)
})()

exports.slugify = (() => {
    const MAX_SLUG_LENGTH = 80

    const slugifyString = x =>
        String(x)
            .trim()
            // Remove apostrophes
            .replace(/'/g, '')
            // Hyphenize anything that's not alphanumeric, hyphens, or spaces
            .replace(/[^a-z0-9- ]/gi, '-')
            // Replace spaces with hyphens
            .replace(/ /g, '-')
            // Consolidate consecutive hyphens
            .replace(/-{2,}/g, '-')
            // Remove prefix and suffix hyphens
            .replace(/^[-]+|[-]+$/, '')
            .toLowerCase()

    return (...xs) =>
        slugifyString(
            xs
                .map(String)
                .join('-')
                .slice(0, MAX_SLUG_LENGTH)
        )
})()

// //////////////////////////////////////////////////////////

// Returns hashed password value to be used in `users.digest` column
// String -> String
exports.hashPassword = function(password) {
    return bcrypt.hash(password, 10)
}

// Compares password plaintext against bcrypted digest
// String, String -> Bool
exports.checkPassword = function(password, digest) {
    return bcrypt.compare(password, digest)
}

exports.nl2br = function(s) {
    //nunjucks escape filter returns { val: String, length: Int }
    if (s.val) s = s.val
    assert(typeof s === 'string')
    return s.replace(/\n/g, '<br>')
}

// Used to lightly process user-submitted message markup before
// saving to database.
exports.transformMarkup = function(s) {
    assert(typeof s === 'string')
    return (
        s
            // Normalize \r\n into \n
            .replace(/\r\n/g, '\n')
            // FIXME: Unrobust way to collapse consecutive newlines
            .replace(/\n{3,}/g, '\n\n')
    )
}

// String -> String (MD5 hex)
exports.md5 = function(str) {
    assert(typeof str === 'string')
    return crypto
        .createHash('md5')
        .update(str)
        .digest('hex')
}

// String -> String
exports.toAvatarUrl = function(str) {
    assert(typeof str === 'string')
    const hash = exports.md5(str)
    return `https://www.gravatar.com/avatar/${hash}?d=monsterid`
}

exports.autolink = function(s) {
    assert(typeof s === 'string')
    return Autolinker.link(s, {
        email: false,
        phone: false,
        twitter: false,
    })
}
