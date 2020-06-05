import { isNone as none } from '@ember/utils';

import Transform from './transform';

/**
  @module @ember-data/serializer
*/

/**
  The `StringTransform` class is used to serialize and deserialize
  string attributes on Ember Data record objects. This transform is
  used when `string` is passed as the type parameter to the
  [attr](/ember-data/release/functions/@ember-data%2Fmodel/attr) function.

  Usage

  ```app/models/user.js
  import Model, { attr, belongsTo } from '@ember-data/model';

  export default Model.extend({
    isAdmin: attr('boolean'),
    name: attr('string'),
    email: attr('string')
  });
  ```

  @class StringTransform
  @extends Transform
 */
export default Transform.extend({
  deserialize(serialized) {
    return none(serialized) ? null : String(serialized);
  },
  serialize(deserialized) {
    return none(deserialized) ? null : String(deserialized);
  },
});
