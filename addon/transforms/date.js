import Transform from './transform';
import Ember from 'ember';
import { deprecate } from '@ember/debug';

Ember.Date = Ember.Date || {};

/**
 Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>

 © 2011 Colin Snover <http://zetafleet.com>

 Released under MIT license.

 @class Date
 @namespace Ember
 @static
 @deprecated
 */
Ember.Date.parse = function(date) {
  // throw deprecation
  deprecate(`Ember.Date.parse is deprecated because Safari 5-, IE8-, and
    Firefox 3.6- are no longer supported (see
    https://github.com/csnover/js-iso8601 for the history of this issue).
    Please use Date.parse instead`,
    false,
    {
      id: 'ds.ember.date.parse-deprecate',
      until: '3.0.0'
    });

  return Date.parse(date);
};


/**
 The `DS.DateTransform` class is used to serialize and deserialize
 date attributes on Ember Data record objects. This transform is used
 when `date` is passed as the type parameter to the
 [DS.attr](../../data#method_attr) function. It uses the [`ISO 8601`](https://en.wikipedia.org/wiki/ISO_8601)
 standard.

 ```app/models/score.js
 import DS from 'ember-data';

 export default DS.Model.extend({
    value: DS.attr('number'),
    player: DS.belongsTo('player'),
    date: DS.attr('date')
  });
 ```

 @class DateTransform
 @extends DS.Transform
 @namespace DS
 */

export default Transform.extend({
  deserialize(serialized) {
    let type = typeof serialized;

    if (type === "string") {
      let offset = serialized.indexOf('+');

      if (offset !== -1 && serialized.length - 3 === offset) {
        deprecate(`The ECMA2015 Spec for ISO 8601 dates does not allow for shorthand timezone offsets such as +00.
          Ember Data's normalization of date's allowing for this shorthand has been deprecated, please update your API to return
          UTC dates formatted with ±hh:mm timezone offsets or implement a custom UTC transform.`,
          false,
          {
            id: 'ds.attr.date.normalize-utc',
            until: '3.0.0'
          });
        return new Date(`${serialized}:00`);

      // this is a phantom specific bug fix in which +0000 is not supported
      } else if (offset !== -1 && serialized.length - 5 === offset) {
        offset += 3;
        return new Date(serialized.slice(0, offset) + ':' + serialized.slice(offset));
      }
      return new Date(serialized);
    } else if (type === "number") {
      return new Date(serialized)
    } else if (serialized === null || serialized === undefined) {
      // if the value is null return null
      // if the value is not present in the data return undefined
      return serialized;
    } else {
      return null;
    }
  },

  serialize(date) {
    if (date instanceof Date && !isNaN(date)) {
      return date.toISOString();
    } else {
      return null;
    }
  }
});
