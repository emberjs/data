import Transform from "ember-data/transforms/base";

/**
  The `DS.BooleanTransform` class is used to serialize and deserialize
  boolean attributes on Ember Data record objects. This transform is
  used when `boolean` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  Usage

  ```javascript
  var attr = DS.attr;
  App.User = DS.Model.extend({
    isAdmin: attr('boolean'),
    name: attr('string'),
    email: attr('string')
  });
  ```

  @class BooleanTransform
  @extends DS.Transform
  @namespace DS
 */
export default Transform.extend({
  deserialize: function(serialized) {
    var type = typeof serialized;

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

  serialize: function(deserialized) {
    return Boolean(deserialized);
  }
});
