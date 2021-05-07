import Transform from './transform';

/**
  @module @ember-data/serializer
*/

function isNumber(value) {
  return value === value && value !== Infinity && value !== -Infinity;
}

/**
  The `NumberTransform` class is used to serialize and deserialize
  numeric attributes on Ember Data record objects. This transform is
  used when `number` is passed as the type parameter to the
  [attr](/ember-data/release/functions/@ember-data%2Fmodel/attr) function.

  Usage

  ```app/models/score.js
  import Model, { attr, belongsTo } from '@ember-data/model';

  export default class ScoreModel extends Model {
    @attr('number') value;
    @belongsTo('player') player;
    @attr('date') date;
  }
  ```

  @class NumberTransform
  @public
  @extends Transform
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
