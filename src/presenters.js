'use strict';

// 3rd party
const assert = require('better-assert');
const _ = require('lodash');

////////////////////////////////////////////////////////////

exports.presentUser = function(u) {
  // Fix embedded json representation
  if (_.isString(u.created_at))
    u.created_at = new Date(u.created_at);

  u.url = `/users/${u.uname}`;

  return u;
};

////////////////////////////////////////////////////////////

exports.presentSession = function(x) {
  // Fix embedded json representation
  if (_.isString(x.created_at))
    x.created_at = new Date(x.created_at);
  if (_.isString(x.expired_at))
    x.expired_at = new Date(x.expired_at);

  return x;
};

////////////////////////////////////////////////////////////

exports.presentMessage = function(m) {
  if (m.user)
    m.user = exports.presentUser(m.user);
  m.url = `/messages/${m.id}`;
  return m;
};
