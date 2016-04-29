import Ember from 'ember';
import Transform from "ember-data/transform";
import isEnabled from 'ember-data/-private/features';

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

  @class BooleanTransform
  @extends DS.Transform
  @namespace DS
 */
export default Transform.extend({
  deserialize(serialized, options) {
    var type = typeof serialized;

    if (isEnabled('ds-boolean-transform-allow-null')) {
      if (isNone(serialized) && options.allowNull === true) {
        return null;
      }
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
    if (isEnabled('ds-boolean-transform-allow-null')) {
      if (isNone(deserialized) && options.allowNull === true) {
        return null;
      }
    }

    return Boolean(deserialized);
  }
});
