/**
  @module ember-data
*/

import Ember from 'ember';
import { deprecate } from 'ember-data/-private/debug';

Ember.Date = Ember.Date || {};

/**
  @method parse
  @param {Date} date
  @return {Number} timestamp
*/

Ember.Date.parse = function (date) {
  // throw deprecation
  deprecate(`Ember.Date.parse is deprecated because Safari 5-, IE8-, and
    Firefox 3.6- are no longer supported (see
    https://github.com/csnover/js-iso8601 for the history of this issue).
    Please use Date.parse instead`, false, {
    id: 'ds.date.parse-deprecate',
    until: '3.0.0'
  });

  return Date.parse(date);
};
