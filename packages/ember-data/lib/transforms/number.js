import Transform from "ember-data/transforms/base";

var empty = Ember.isEmpty;

function isNumber(value) {
  return value === value && value !== Infinity && value !== -Infinity;
}

/**
  The `DS.NumberTransform` class is used to serialize and deserialize
  numeric attributes on Ember Data record objects. This transform is
  used when `number` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```javascript
  var attr = DS.attr;
  App.Score = DS.Model.extend({
    value: attr('number'),
    player: DS.belongsTo('player'),
    date: attr('date')
  });
  ```

  @class NumberTransform
  @extends DS.Transform
  @namespace DS
 */
export default Transform.extend({
  deserialize: function(serialized) {
    var transformed;

    if (empty(serialized)) {
      return null;
    } else {
      transformed = Number(serialized);

      return isNumber(transformed) ? transformed : null;
    }
  },

  serialize: function(deserialized) {
    var transformed;

    if (empty(deserialized)) {
      return null;
    } else {
      transformed = Number(deserialized);

      return isNumber(transformed) ? transformed : null;
    }
  }
});
