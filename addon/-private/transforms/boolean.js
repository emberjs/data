import Ember from 'ember';
import Transform from './transform';

const { isNone } = Ember;

/**
  The `DS.BooleanTransform` class is used to serialize and deserialize
  boolean attributes on Ember Data record objects. This transform is
  used when `boolean` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    isAdmin: DS.attr('boolean'),
    name: DS.attr('string'),
    email: DS.attr('string')
  });
  ```

  By default the boolean transform only allows for values of `true` or
  `false`. You can opt into allowing `null` values for
  boolean attributes via `DS.attr('boolean', { allowNull: true })`

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    email: DS.attr('string'),
    username: DS.attr('string'),
    wantsWeeklyEmail: DS.attr('boolean', { allowNull: true })
  });
  ```

  @class BooleanTransform
  @extends DS.Transform
  @namespace DS
 */
export default Transform.extend({
  deserialize(serialized, options) {
    let type = typeof serialized;

    if (isNone(serialized) && options.allowNull === true) {
      return null;
    }

    if (type === "boolean") {
      return serialized;
    } else if (type === "string") {
      return serialized.match(/^true$|^t$|^1$/i) !== null;
    } else if (type === "number") {
      return serialized === 1;
    } else {
      return false;
    }
  },

  serialize(deserialized, options) {
    if (isNone(deserialized) && options.allowNull === true) {
      return null;
    }

    return Boolean(deserialized);
  }
});
