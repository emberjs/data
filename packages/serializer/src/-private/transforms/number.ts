/**
  @module @ember-data/serializer
*/

function isNumber(value: number) {
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
 */
export default class NumberTransform {
  deserialize(serialized: string | number | null | undefined, _options?: Record<string, unknown>): number | null {
    if (serialized === '' || serialized === null || serialized === undefined) {
      return null;
    } else {
      const transformed = Number(serialized);

      return isNumber(transformed) ? transformed : null;
    }
  }

  serialize(deserialized: string | number | null | undefined, _options?: Record<string, unknown>): number | null {
    if (deserialized === '' || deserialized === null || deserialized === undefined) {
      return null;
    } else {
      const transformed = Number(deserialized);

      return isNumber(transformed) ? transformed : null;
    }
  }

  static create() {
    return new this();
  }
}
