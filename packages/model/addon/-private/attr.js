import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { RECORD_DATA_ERRORS } from '@ember-data/canary-features';
import { recordDataFor } from '@ember-data/store/-private';

import { computedMacroWithOptionalParams } from './util';

/**
  @module @ember-data/model
*/

function getDefaultValue(record, options, key) {
  if (typeof options.defaultValue === 'function') {
    return options.defaultValue.apply(null, arguments);
  } else {
    let defaultValue = options.defaultValue;
    assert(
      `Non primitive defaultValues are not supported because they are shared between all instances. If you would like to use a complex object as a default value please provide a function that returns the complex object.`,
      typeof defaultValue !== 'object' || defaultValue === null
    );
    return defaultValue;
  }
}

function hasValue(internalModel, key) {
  return recordDataFor(internalModel).hasAttr(key);
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

  export default Model.extend({
    username: attr('string'),
    email: attr('string'),
    verified: attr('boolean', { defaultValue: false })
  });
  ```

  Default value can also be a function. This is useful it you want to return
  a new object for each attribute.

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default Model.extend({
    username: attr('string'),
    email: attr('string'),
    settings: attr({
      defaultValue() {
        return {};
      }
    })
  });
  ```

  The `options` hash is passed as second argument to a transforms'
  `serialize` and `deserialize` method. This allows to configure a
  transformation and adapt the corresponding value, based on the config:

  ```app/models/post.js
  import Model, { attr } from '@ember-data/model';

  export default Model.extend({
    text: attr('text', {
      uppercase: true
    })
  });
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
    kind: 'attribute',
    options: options,
  };

  return computed({
    get(key) {
      if (DEBUG) {
        if (['_internalModel', 'recordData', 'currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }
      let internalModel = this._internalModel;
      if (hasValue(internalModel, key)) {
        return internalModel.getAttributeValue(key);
      } else {
        return getDefaultValue(this, options, key);
      }
    },
    set(key, value) {
      if (DEBUG) {
        if (['_internalModel', 'recordData', 'currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }
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
      return this._internalModel.setDirtyAttribute(key, value);
    },
  }).meta(meta);
}

export default computedMacroWithOptionalParams(attr);
