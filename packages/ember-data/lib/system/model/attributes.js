import Model from "ember-data/system/model/model";
import {
  Map
} from "ember-data/system/map";

import computedPolyfill from "ember-data/utils/computed-polyfill";

/**
  @module ember-data
*/

var get = Ember.get;

/**
  @class Model
  @namespace DS
*/
Model.reopenClass({
  /**
    A map whose keys are the attributes of the model (properties
    described by DS.attr) and whose values are the meta object for the
    property.

    Example

    ```javascript

    App.Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      birthday: attr('date')
    });

    var attributes = Ember.get(App.Person, 'attributes')

    attributes.forEach(function(name, meta) {
      console.log(name, meta);
    });

    // prints:
    // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
    // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
    // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
    ```

    @property attributes
    @static
    @type {Ember.Map}
    @readOnly
  */
  attributes: Ember.computed(function() {
    var map = Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute) {
        Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.toString(), name !== 'id');

        meta.name = name;
        map.set(name, meta);
      }
    });

    return map;
  }).readOnly(),

  /**
    A map whose keys are the attributes of the model (properties
    described by DS.attr) and whose values are type of transformation
    applied to each attribute. This map does not include any
    attributes that do not have an transformation type.

    Example

    ```javascript
    App.Person = DS.Model.extend({
      firstName: attr(),
      lastName: attr('string'),
      birthday: attr('date')
    });

    var transformedAttributes = Ember.get(App.Person, 'transformedAttributes')

    transformedAttributes.forEach(function(field, type) {
      console.log(field, type);
    });

    // prints:
    // lastName string
    // birthday date
    ```

    @property transformedAttributes
    @static
    @type {Ember.Map}
    @readOnly
  */
  transformedAttributes: Ember.computed(function() {
    var map = Map.create();

    this.eachAttribute(function(key, meta) {
      if (meta.type) {
        map.set(key, meta.type);
      }
    });

    return map;
  }).readOnly(),

  /**
    Iterates through the attributes of the model, calling the passed function on each
    attribute.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(name, meta);
    ```

    - `name` the name of the current property in the iteration
    - `meta` the meta object for the attribute property in the iteration

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context.

    Example

    ```javascript
    App.Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      birthday: attr('date')
    });

    App.Person.eachAttribute(function(name, meta) {
      console.log(name, meta);
    });

    // prints:
    // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
    // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
    // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
   ```

    @method eachAttribute
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @static
  */
  eachAttribute: function(callback, binding) {
    get(this, 'attributes').forEach(function(meta, name) {
      callback.call(binding, name, meta);
    }, binding);
  },

  /**
    Iterates through the transformedAttributes of the model, calling
    the passed function on each attribute. Note the callback will not be
    called for any attributes that do not have an transformation type.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(name, type);
    ```

    - `name` the name of the current property in the iteration
    - `type` a string containing the name of the type of transformed
      applied to the attribute

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context.

    Example

    ```javascript
    App.Person = DS.Model.extend({
      firstName: attr(),
      lastName: attr('string'),
      birthday: attr('date')
    });

    App.Person.eachTransformedAttribute(function(name, type) {
      console.log(name, type);
    });

    // prints:
    // lastName string
    // birthday date
   ```

    @method eachTransformedAttribute
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @static
  */
  eachTransformedAttribute: function(callback, binding) {
    get(this, 'transformedAttributes').forEach(function(type, name) {
      callback.call(binding, name, type);
    });
  }
});


Model.reopen({
  eachAttribute: function(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
  }
});

function getDefaultValue(record, options, key) {
  if (typeof options.defaultValue === "function") {
    return options.defaultValue.apply(null, arguments);
  } else {
    return options.defaultValue;
  }
}

function hasValue(record, key) {
  return key in record._attributes ||
         key in record._inFlightAttributes ||
         record._data.hasOwnProperty(key);
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

  ```javascript
  var attr = DS.attr;

  App.User = DS.Model.extend({
    username: attr('string'),
    email: attr('string'),
    verified: attr('boolean', {defaultValue: false})
  });
  ```

  Default value can also be a function. This is useful it you want to return
  a new object for each attribute.

  ```javascript
  var attr = DS.attr;

  App.User = DS.Model.extend({
    username: attr('string'),
    email: attr('string'),
    settings: attr({defaultValue: function() {
      return {};
    }})
  });
  ```

  @namespace
  @method attr
  @for DS
  @param {String} type the attribute type
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

  var meta = {
    type: type,
    isAttribute: true,
    options: options
  };

  return computedPolyfill({
    get: function(key) {
      var reference = this.reference;
      if (hasValue(reference, key)) {
        return getValue(reference, key);
      } else {
        return getDefaultValue(this, options, key);
      }
    },
    set: function(key, value) {
      Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.constructor.toString(), key !== 'id');
      var reference = this.reference;
      var oldValue = getValue(reference, key);

      if (value !== oldValue) {
        // Add the new value to the changed attributes hash; it will get deleted by
        // the 'didSetProperty' handler if it is no different from the original value
        reference._attributes[key] = value;

        this.reference.send('didSetProperty', {
          name: key,
          oldValue: oldValue,
          originalValue: reference._data[key],
          value: value
        });
      }

      return value;
    }
  }).meta(meta);
}
