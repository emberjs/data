import Transform from './transform';

function isNumber(value) {
  return value === value && value !== Infinity && value !== -Infinity;
}

/**
  The `DS.NumberTransform` class is used to serialize and deserialize
  numeric attributes on Ember Data record objects. This transform is
  used when `number` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```app/models/score.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    value: DS.attr('number'),
    player: DS.belongsTo('player'),
    date: DS.attr('date')
  });
  ```

  @class NumberTransform
  @extends DS.Transform
  @namespace DS
 */
export default Transform.extend({
  deserialize(serialized) {
    let transformed;

    if (serialized === '' || serialized === null || serialized === undefined) {
      return null;
    } else {
      transformed = Number(serialized);

      return isNumber(transformed) ? transformed : null;
    }
  },

  serialize(deserialized) {
    let transformed;

    if (deserialized === '' || deserialized === null || deserialized === undefined) {
      return null;
    } else {
      transformed = Number(deserialized);

      return isNumber(transformed) ? transformed : null;
    }
  },
});
