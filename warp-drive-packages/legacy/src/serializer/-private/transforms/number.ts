import type { TransformName } from '@warp-drive/core/types/symbols';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { attr } from '../../../model';

function isNumber(value: number) {
  return value === value && value !== Infinity && value !== -Infinity;
}

export interface NumberTransform {
  [TransformName]: 'number';
}

/**
  The `NumberTransform` class is used to serialize and deserialize
  numeric attributes on Ember Data record objects. This transform is
  used when `number` is passed as the type parameter to the
  {@link attr} function.

  Usage

  ```js [app/models/score.js]
  import Model, { attr, belongsTo } from '@ember-data/model';

  export default class ScoreModel extends Model {
    @attr('number') value;
    @belongsTo('player') player;
    @attr('date') date;
  }
  ```

  @public
 */
export class NumberTransform {
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

  static create(): NumberTransform {
    return new this();
  }
}
