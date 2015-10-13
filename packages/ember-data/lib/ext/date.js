/**
  @module ember-data
*/

/**
  Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>

  © 2011 Colin Snover <http://zetafleet.com>

  Released under MIT license.

  @class Date
  @namespace Ember
  @static
*/
Ember.Date = Ember.Date || {};

var origParse = Date.parse;

/**
  @method parse
  @param {Date} date
  @return {Number} timestamp
*/
Ember.Date.parse = origParse;
