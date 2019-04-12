import { isNone as none } from '@ember/utils';
import Transform from './transform';

/**
  The `DS.StringTransform` class is used to serialize and deserialize
  string attributes on Ember Data record objects. This transform is
  used when `string` is passed as the type parameter to the
  [DS.attr](./DS/methods/attr?anchor=attr) function.

  Usage

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    isAdmin: DS.attr('boolean'),
    name: DS.attr('string'),
    email: DS.attr('string')
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
  },
});
