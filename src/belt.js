// Node
const crypto = require('crypto')
// 3rd
const scrypt = require('scrypt')
const escapeHtml = require('escape-html')
const assert = require('better-assert')
const debug = require('debug')('app:belt')
const Autolinker = require('autolinker')
const timeago = require('timeago.js')

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
exports.isUuid = (() => {
    const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
    return (uuid) => UUID_REGEX.test(uuid)
})()

exports.slugify = (() => {
    const MAX_SLUG_LENGTH = 80

    const slugifyString = (x) =>
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

exports.scrypt = {
    // Returns Promise<bool>
    async verifyHash(password, hash) {
        assert(typeof password === 'string')
        assert(Buffer.isBuffer(hash))
        return scrypt.verifyKdf(hash, password)
    },

    // Returns Promise<Buffer>
    async hash(password) {
        assert(typeof password === 'string')
        // Hashing should take 0.1 seconds
        return scrypt.params(0.1).then((params) => scrypt.kdf(password, params))
    },
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

exports.toAvatarUrl = function(uuid) {
    assert(exports.isUuid(uuid))
    const hash = uuid.replace(/-/g, '')
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

exports.markupToHtml = (() => {
    // Turns all \n into <br>
    const nl2br = (s) => {
        assert(typeof s === 'string')
        return s.replace(/\n/g, '<br>')
    }
    return (markup) => {
        assert(typeof markup === 'string')
        return exports.autolink(nl2br(escapeHtml(markup)))
    }
})()

exports.capitalize = (s) => {
    assert(typeof s === 'string')
    return s[0] + s.slice(1).toLowerCase()
}

exports.timeago = (() => {
    const instance = timeago()
    return (date) => instance.format(date)
})()

// Format integer with commas.
//
//     commafy(1000) === '1,000'
//     commafy(1000000) === '1,000,000'
exports.commafy = (() => {
    const REGEX = /\B(?=(\d{3})+(?!\d))/g

    return (num) => {
        assert(Number.isInteger(num))
        return String(num).replace(REGEX, ',')
    }
})()
