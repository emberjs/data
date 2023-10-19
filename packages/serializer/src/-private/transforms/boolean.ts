/**
  @module @ember-data/serializer
*/

/**
  The `BooleanTransform` class is used to serialize and deserialize
  boolean attributes on Ember Data record objects. This transform is
  used when `boolean` is passed as the type parameter to the
  [attr](/ember-data/release/functions/@ember-data%2Fmodel/attr) function.

  Usage

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('boolean') isAdmin;
    @attr('string') name;
    @attr('string') email;
  }
  ```

  By default, the boolean transform only allows for values of `true` or
  `false`. You can opt into allowing `null` values for
  boolean attributes via `attr('boolean', { allowNull: true })`

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('string') email;
    @attr('string') username;
    @attr('boolean', { allowNull: true }) wantsWeeklyEmail;
  }
  ```

  @class BooleanTransform
  @public
 */
export default class BooleanTransform {
  deserialize(serialized: boolean | null | number | string, options?: { allowNull?: boolean }): boolean | null {
    if ((serialized === null || serialized === undefined) && options?.allowNull === true) {
      return null;
    }

    if (typeof serialized === 'boolean') {
      return serialized;
    } else if (typeof serialized === 'string') {
      return /^(true|t|1)$/i.test(serialized);
    } else if (typeof serialized === 'number') {
      return serialized === 1;
    } else {
      return false;
    }
  }

  serialize(deserialized: boolean | null, options?: { allowNull?: boolean }): boolean | null {
    if ((deserialized === null || deserialized === undefined) && options?.allowNull === true) {
      return null;
    }

    return Boolean(deserialized);
  }

  static create() {
    return new this();
  }
}
