'use strict';

// Node
var url = require('url');
// 3rd
var request = require('co-request');
var _ = require('lodash');
var assert = require('better-assert');
// 1st
var config = require('./config');

// Docs: https://developers.google.com/recaptcha/docs/verify
//
// Returns bool
exports.ensure = function*(userResponse, userIp) {
  assert(config.RECAPTCHA_SITESECRET);
  assert(_.isString(userResponse));
  assert(_.isString(userIp));

  var googleUrl = url.format({
    pathname: 'https://www.google.com/recaptcha/api/siteverify',
    query: {
      secret: config.RECAPTCHA_SITESECRET,
      response: userResponse,
      remoteip: userIp
    }
  });

  // Body will look like:
  // {
  //    "success": true | false,
  //    "error-codes":  [...]      // Optional
  // }

  var result = yield request({ url: googleUrl, json: true });

  return result.body.success;
};
