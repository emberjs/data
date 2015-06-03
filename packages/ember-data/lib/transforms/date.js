/**
  The `DS.DateTransform` class is used to serialize and deserialize
  date attributes on Ember Data record objects. This transform is used
  when `date` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  ```javascript
  var attr = DS.attr;
  App.Score = DS.Model.extend({
    value: attr('number'),
    player: DS.belongsTo('player'),
    date: attr('date')
  });
  ```

  @class DateTransform
  @extends DS.Transform
  @namespace DS
 */
import Transform from "ember-data/transforms/base";

// Date.prototype.toISOString shim
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
var toISOString = Date.prototype.toISOString || function() {
  function pad(number) {
    if ( number < 10 ) {
      return '0' + number;
    }
    return number;
  }

  return this.getUTCFullYear() +
    '-' + pad(this.getUTCMonth() + 1) +
    '-' + pad(this.getUTCDate()) +
    'T' + pad(this.getUTCHours()) +
    ':' + pad(this.getUTCMinutes()) +
    ':' + pad(this.getUTCSeconds()) +
    '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
    'Z';
};

if (Ember.SHIM_ES5) {
  if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = toISOString;
  }
}

export default Transform.extend({
  deserialize(serialized) {
    var type = typeof serialized;

    if (type === "string") {
      return new Date(Ember.Date.parse(serialized));
    } else if (type === "number") {
      return new Date(serialized);
    } else if (serialized === null || serialized === undefined) {
      // if the value is not present in the data,
      // return undefined, not null.
      return serialized;
    } else {
      return null;
    }
  },

  serialize(date) {
    if (date instanceof Date) {
      return toISOString.call(date);
    } else {
      return null;
    }
  }
});
