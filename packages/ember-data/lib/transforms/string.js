import Transform from "ember-data/transforms/base";
var none = Ember.isNone;

/**
  The `DS.StringTransform` class is used to serialize and deserialize
  string attributes on Ember Data record objects. This transform is
  used when `string` is passed as the type parameter to the
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

  @class StringTransform
  @extends DS.Transform
  @namespace DS
 */
export default Transform.extend({
  deserialize(serialized) {
    return none(serialized) ? null : String(serialized);
  },
  serialize(deserialized) {
    return none(deserialized) ? null : String(deserialized);
  }
});
