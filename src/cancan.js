'use strict';

// 3rd
var _ = require('lodash');
var debug = require('debug')('app:cancan');
var assert = require('better-assert');

// Retuns boolean
//
// `user` is object (logged in) or undefined (guest)
// `action` is required string, e.g. 'READ_TOPIC'
// `target` is optional value that the action applies to.
//
// Usage:
//
//    can(this.currUser, 'READ_TOPIC', topic)
//    can(this.currUser, 'CREATE_TOPIC');
exports.can = function(user, action, target) {
  assert(_.isString(action));

  switch(action) {
  case 'READ_MESSAGE': // target is message
    assert(target);
    // Anyone can see a message as long as it's not hidden
    if (!target.is_hidden) return true;
    // Only admins and mods can read hidden messages
    if (target.is_hidden) return _.includes(['ADMIN', 'MOD'], user && user.role);
    return false;
  case 'UPDATE_USER_*': // target is other user
    return exports.can(user, 'UPDATE_USER_SETTINGS', target)
      || exports.can(user, 'UPDATE_USER_ROLE', target);
  case 'UPDATE_USER_SETTINGS': // target is other user
    assert(target);
    // Guests never can
    if (!user) return false;
    // Banned never can
    if (user.role === 'BANNED') return false;
    // Admins always can
    if (user.role === 'ADMIN') return true;
    // Mods can only see non-admins
    if (user.role === 'MOD')
      return target.role !== 'ADMIN';
    // Members can only update their own settings
    if (user.role === 'MEMBER')
      return target.id === user.id;
    return false;
  case 'UPDATE_USER_ROLE': // target is other user
    assert(target);
    // Guests never can
    if (!user) return false;
    // Admins always can
    if (user.role === 'ADMIN') return true;
    return false;
  case 'CREATE_MESSAGE': // no target
    // Guests can
    if (!user) return true;
    // Any user can unless they are banned
    if (user.role === 'BANNED') return false;
    return true;
  case 'DELETE_MESSAGE': // target is message
    debug('[DELETE_MESSAGE] user=%j', user);
    assert(target);
    // Guests cannot
    if (!user) return false;
    // Banned cannot
    if (user.role === 'BANNED') return false;
    // Users can if it's their own message
    if (user.id === target.user_id) return true;
    // Admins and mods always can
    if (_.includes(['ADMIN', 'MOD'], user.role)) return true;
    return false;
  // Is user authorized for any of the UPDATE_MESSAGE_* actions?
  case 'UPDATE_MESSAGE': // target is message
    assert(target);
    return exports.can(user, 'UPDATE_MESSAGE_STATE', target)
      || exports.can(user, 'UPDATE_MESSAGE_MARKUP', target);
  // Can user change message.is_hidden?
  case 'UPDATE_MESSAGE_STATE': // target is message
    assert(target);
    // Guests never can
    if (!user) return false;
    // Only mods and admins
    if (_.includes(['ADMIN', 'MOD'], user.role)) return true;
    return false;
  case 'UPDATE_MESSAGE_MARKUP': // target is message
    assert(target);
    // Guests never can
    if (!user) return false;
    // Mods and admins can change any message markup
    if (_.includes(['ADMIN', 'MOD'], user.role)) return true;
    // Members can update their own messages
    if (user.role === 'MEMBER')
      return user.id = target.user_id;
    return false;
  default:
    debug('Unsupported cancan action: %j', action);
    return false;
  }
};
