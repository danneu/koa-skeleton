// Node
const crypto = require('crypto')
// 3rd
const bcrypt = require('bcryptjs')
const assert = require('better-assert')
const debug = require('debug')('app:belt')
const Autolinker = require('autolinker')

// A dumping ground of common functions used around the app.
// As it gets full, consider extracting similar functions into
// separate modules to stay organized.

// Ex: formatDate(d) -> '8 Dec 2014 16:24'
exports.formatDate = function (d) {
  assert(d instanceof Date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr',
    'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec']
  const mins = d.getMinutes()
  // Pad mins to format "XX". e.g. 8 -> "08", 10 -> "10"
  const paddedMins = mins < 10 ? '0' + mins : mins
  return [
    d.getDate(),
    months[d.getMonth()],
    d.getFullYear(),
    d.getHours() + ':' + paddedMins
  ].join(' ')
}

// String -> Bool
exports.isValidUuid = (function () {
  const re = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
  return function (uuid) {
    return re.test(uuid)
  }
})()

exports.slugify = function (...xs) {
  const MAX_SLUG_LENGTH = 80
  // Slugifies one string
  function slugifyString (x) {
    return x.toString()
      .trim()
      // Remove apostrophes
      .replace(/'/g, '')
      // Hyphenize anything that's not alphanumeric, hyphens, or spaces
      .replace(/[^a-z0-9- ]/ig, '-')
      // Replace spaces with hyphens
      .replace(/ /g, '-')
      // Consolidate consecutive hyphens
      .replace(/-{2,}/g, '-')
      // Remove prefix and suffix hyphens
      .replace(/^[-]+|[-]+$/, '')
      .toLowerCase()
  }
  return slugifyString(
    xs.map(x => x.toString())
      .join('-')
      .slice(0, MAX_SLUG_LENGTH)
  )
}

// //////////////////////////////////////////////////////////

// Returns hashed password value to be used in `users.digest` column
// String -> String
exports.hashPassword = function (password) {
  return new Promise(function (resolve, reject) {
    bcrypt.hash(password, 4, function (err, hash) {
      if (err) return reject(err)
      resolve(hash)
    })
  })
}

// Compares password plaintext against bcrypted digest
// String, String -> Bool
exports.checkPassword = function (password, digest) {
  return new Promise(function (resolve, reject) {
    bcrypt.compare(password, digest, function (err, result) {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

// //////////////////////////////////////////////////////////

// Quickly generate Date objects in the future.
//
//    futureDate({ days: 4 })            -> Date
//    futureDate(someDate, { years: 2 }) -> Date
exports.futureDate = function (nowDate, opts) {
  if (!opts) {
    opts = nowDate
    nowDate = new Date()
  }
  return new Date(nowDate.getTime() +
    (opts.years || 0) * 1000 * 60 * 60 * 24 * 365 +
    (opts.days || 0) * 1000 * 60 * 60 * 24 +
    (opts.hours || 0) * 1000 * 60 * 60 +
    (opts.minutes || 0) * 1000 * 60 +
    (opts.seconds || 0) * 1000 +
    (opts.milliseconds || 0))
}

exports.nl2br = function (s) {
  // FIXME: nunjucks escape filter returns { val: String, length: Int }
  // object. Must've changed recently?
  if (s.val) s = s.val
  assert(typeof s === 'string')
  return s.replace(/\n/g, '<br>')
}

// Used for parsing form params so that a "true" string is parsed to `true`
// and everything is parsed to `false`.
exports.parseBoolean = function (s) {
  return s === 'true'
}

// Used to lightly process user-submitted message markup before
// saving to database.
exports.transformMarkup = function (s) {
  assert(typeof s === 'string')
  return s
    // Normalize \r\n into \n
    .replace(/\r\n/g, '\n')
    // FIXME: Unrobust way to collapse consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
}

// String -> String (MD5 hex)
exports.md5 = function (str) {
  assert(typeof str === 'string')
  return crypto.createHash('md5').update(str).digest('hex')
}

// String -> String
exports.toAvatarUrl = function (str) {
  assert(typeof str === 'string')
  const hash = exports.md5(str)
  return `https://www.gravatar.com/avatar/${hash}?d=monsterid`
}

exports.autolink = function (s) {
  assert(typeof s === 'string')
  return Autolinker.link(s, {
    email: false,
    phone: false,
    twitter: false
  })
}
