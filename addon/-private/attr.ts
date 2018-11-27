import { computed } from '@ember/object';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import Model from './system/model/model';
import { getRecordDataFor } from './system/model/record-data-map';
/**
  @module ember-data
*/

function getDefaultValue(record, options, propertyName) {
  if (typeof options.defaultValue === 'function') {
    return options.defaultValue.call(null, record, options, propertyName);
  } else {
    let defaultValue = options.defaultValue;
    assert(
      `Non primitive defaultValues are not supported because they are shared between all instances. If you would like to use a complex object as a default value please provide a function that returns the complex object.`,
      typeof defaultValue !== 'object' || defaultValue === null
    );
    return defaultValue;
  }
}

interface AttrOptions {
  defaultValue?: string | null | (() => any);
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
export default function attr(type?: string | AttrOptions, options?: AttrOptions) {
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
    get(key: string) {
      if (DEBUG) {
        if (['_internalModel', 'recordData', 'currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }

      let recordData = getRecordDataFor(this);
      if (recordData.hasAttr(key)) {
        return recordData.getAttr(key);
      } else {
        return getDefaultValue(this, options, key);
      }
    },
    set(key: string, value: any) {
      if (DEBUG) {
        if (this instanceof Model) {
          if (['_internalModel', 'recordData', 'currentState'].indexOf(key) !== -1) {
            throw new Error(
              `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
            );
          }
        }
      }
      let recordData = getRecordDataFor(this);
      if (this instanceof Model) {
        updateViaInternalModel(this, key, value);
      } else {
        recordData.setDirtyAttribute(key, value);
      }

      return recordData.getAttr(key);
    },
  }).meta(meta);
}

function updateViaInternalModel(record: InstanceType<typeof Model>, key: string, value: any): void {
  let recordData = getRecordDataFor(record);
  let internalModel = record._internalModel;

  if (internalModel.isDeleted()) {
    throw new Error(
      `Attempted to set '${key}' to '${value}' on the deleted record ${internalModel}`
    );
  }

  let currentValue = recordData.getAttr(key);
  if (currentValue !== value) {
    recordData.setDirtyAttribute(key, value);
    let isDirty = recordData.isAttrDirty(key);

    internalModel.send('didSetProperty', {
      name: key,
      isDirty: isDirty,
    });
  }
}
