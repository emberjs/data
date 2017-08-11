import { computed } from '@ember/object';
import { deprecate } from '@ember/debug';

/**
  @module ember-data
*/

function getDefaultValue(record, options, key) {
  if (typeof options.defaultValue === 'function') {
    return options.defaultValue.apply(null, arguments);
  } else {
    let defaultValue = options.defaultValue;
    deprecate(`Non primitive defaultValues are deprecated because they are shared between all instances. If you would like to use a complex object as a default value please provide a function that returns the complex object.`,
      typeof defaultValue !== 'object' || defaultValue === null, {
        id: 'ds.defaultValue.complex-object',
        until: '3.0.0'
      });
    return defaultValue;
  }
}

function hasValue(record, key) {
  return key in record._attributes ||
         key in record._inFlightAttributes ||
         key in record._data;
}

function getValue(record, key) {
  if (key in record._attributes) {
    return record._attributes[key];
  } else if (key in record._inFlightAttributes) {
    return record._inFlightAttributes[key];
  } else {
    return record._data[key];
  }
}

/**
  `DS.attr` defines an attribute on a [DS.Model](/api/data/classes/DS.Model.html).
  By default, attributes are passed through as-is, however you can specify an
  optional type to have the value automatically transformed.
  Ember Data ships with four basic transform types: `string`, `number`,
  `boolean` and `date`. You can define your own transforms by subclassing
  [DS.Transform](/api/data/classes/DS.Transform.html).

  Note that you cannot use `attr` to define an attribute of `id`.

  `DS.attr` takes an optional hash as a second parameter, currently
  supported options are:

  - `defaultValue`: Pass a string or a function to be called to set the attribute
                    to a default value if none is supplied.

  Example

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    username: DS.attr('string'),
    email: DS.attr('string'),
    verified: DS.attr('boolean', { defaultValue: false })
  });
  ```

  Default value can also be a function. This is useful it you want to return
  a new object for each attribute.

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    username: DS.attr('string'),
    email: DS.attr('string'),
    settings: DS.attr({
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
  import DS from 'ember-data';

  export default DS.Model.extend({
    text: DS.attr('text', {
      uppercase: true
    })
  });
  ```

  ```app/transforms/text.js
  import DS from 'ember-data';

  export default DS.Transform.extend({
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

  @namespace
  @method attr
  @for DS
  @param {String|Object} type the attribute type
  @param {Object} options a hash of options
  @return {Attribute}
*/

export default function attr(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    options = options || {};
  }

  let meta = {
    type: type,
    isAttribute: true,
    options: options
  };

  return computed({
    get(key) {
      let internalModel = this._internalModel;
      if (hasValue(internalModel, key)) {
        return getValue(internalModel, key);
      } else {
        return getDefaultValue(this, options, key);
      }
    },
    set(key, value) {
      let internalModel = this._internalModel;
      let oldValue = getValue(internalModel, key);
      let originalValue;

      if (value !== oldValue) {
        // Add the new value to the changed attributes hash; it will get deleted by
        // the 'didSetProperty' handler if it is no different from the original value
        internalModel._attributes[key] = value;

        if (key in internalModel._inFlightAttributes) {
          originalValue = internalModel._inFlightAttributes[key];
        } else {
          originalValue = internalModel._data[key];
        }

        this._internalModel.send('didSetProperty', {
          name: key,
          oldValue: oldValue,
          originalValue: originalValue,
          value: value
        });
      }

      return value;
    }
  }).meta(meta);
}
