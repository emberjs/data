import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { recordIdentifierFor, storeFor } from '@ember-data/store';
import { recordDataFor } from '@ember-data/store/-private';

import { computedMacroWithOptionalParams } from './util';

/**
  @module @ember-data/model
*/

/**
  `attr` defines an attribute on a [Model](/ember-data/release/classes/Model).
  By default, attributes are passed through as-is, however you can specify an
  optional type to have the value automatically transformed.
  Ember Data ships with four basic transform types: `string`, `number`,
  `boolean` and `date`. You can define your own transforms by subclassing
  [Transform](/ember-data/release/classes/Transform).

  Note that you cannot use `attr` to define an attribute of `id`.

  `attr` takes an optional hash as a second parameter, currently
  supported options are:

  - `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

  Example

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('string') username;
    @attr('string') email;
    @attr('boolean', { defaultValue: false }) verified;
  }
  ```

  Default value can also be a function. This is useful it you want to return
  a new object for each attribute.

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('string') username;
    @attr('string') email;

    @attr({
      defaultValue() {
        return {};
      }
    })
    settings;
  }
  ```

  The `options` hash is passed as second argument to a transforms'
  `serialize` and `deserialize` method. This allows to configure a
  transformation and adapt the corresponding value, based on the config:

  ```app/models/post.js
  import Model, { attr } from '@ember-data/model';

  export default class PostModel extends Model {
    @attr('text', {
      uppercase: true
    })
    text;
  }
  ```

  ```app/transforms/text.js
  import Transform from '@ember-data/serializer/transform';

  export default class TextTransform extends Transform {
    serialize(value, options) {
      if (options.uppercase) {
        return value.toUpperCase();
      }

      return value;
    }

    deserialize(value) {
      return value;
    }
  }
  ```

  @method attr
  @public
  @static
  @for @ember-data/model
  @param {String|Object} type the attribute type
  @param {Object} options a hash of options
  @return {Attribute}
*/
function attr(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    options = options || {};
  }

  let meta = {
    type: type,
    isAttribute: true,
    options: options,
  };

  return computed({
    get(key) {
      if (DEBUG) {
        if (['currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }
      if (this.isDestroyed || this.isDestroying) {
        return;
      }
      return recordDataFor(this).getAttr(recordIdentifierFor(this), key);
    },
    set(key, value) {
      if (DEBUG) {
        if (['currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }
      assert(
        `Attempted to set '${key}' on the deleted record ${recordIdentifierFor(this)}`,
        !this.currentState.isDeleted
      );
      const identifier = recordIdentifierFor(this);
      const recordData = storeFor(this)._instanceCache.getRecordData(identifier);
      let currentValue = recordData.getAttr(identifier, key);
      if (currentValue !== value) {
        recordData.setAttr(identifier, key, value);

        if (!this.isValid) {
          const { errors } = this;
          if (errors.get(key)) {
            errors.remove(key);
            this.currentState.cleanErrorRequests();
          }
        }
      }

      return value;
    },
  }).meta(meta);
}

export default computedMacroWithOptionalParams(attr);
