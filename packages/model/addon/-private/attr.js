import { assert } from '@ember/debug';

import { RECORD_DATA_ERRORS } from '@ember-data/canary-features';
import { recordDataFor } from '@ember-data/store/-private';

import { makeDecorator } from './util';

/**
  @module @ember-data/model
*/

function getDefaultValue(record, options, key) {
  if (typeof options.defaultValue === 'function') {
    return options.defaultValue.call(null, record, options, key);
  } else {
    let defaultValue = options.defaultValue;
    assert(
      `Non primitive defaultValues are not supported because they are shared between all instances. If you would like to use a complex object as a default value please provide a function that returns the complex object.`,
      typeof defaultValue !== 'object' || defaultValue === null
    );
    return defaultValue;
  }
}

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

  export default Transform.extend({
    serialize(value, options) {
      if (options.uppercase) {
        return value.toUpperCase();
      }

      return value;
    },

    deserialize(value) {
      return value;
    }
  })
  ```

  @method attr
  @public
  @static
  @for @ember-data/model
  @param {String|Object} type the attribute type
  @param {Object} options a hash of options
  @return {Attribute}
*/
export default makeDecorator('attribute', {
  getter(key, meta) {
    return function() {
      let recordData = recordDataFor(this);
      if (recordData.hasAttr(key)) {
        let v = recordData.getAttr(key);
        return v;
      } else {
        return getDefaultValue(this, meta.options, key);
      }
    };
  },
  setter(key) {
    return function(value) {
      if (RECORD_DATA_ERRORS) {
        let oldValue = this._internalModel._recordData.getAttr(key);
        if (oldValue !== value) {
          let errors = this.get('errors');
          if (errors.get(key)) {
            errors.remove(key);
          }
          this._markInvalidRequestAsClean();
        }
      }
      this._internalModel.setDirtyAttribute(key, value);
    };
  },
});
