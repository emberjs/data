require("ember-data/system/model/model");

/**
  @module ember-data
*/

var get = Ember.get;

/**
  @class Model
  @namespace DS
*/
DS.Model.reopenClass({
  attributes: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute) {
        Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.toString(), name !== 'id');

        meta.name = name;
        map.set(name, meta);
      }
    });

    return map;
  }),

  transformedAttributes: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachAttribute(function(key, meta) {
      if (meta.type) {
        map.set(key, meta.type);
      }
    });

    return map;
  }),

  eachAttribute: function(callback, binding) {
    get(this, 'attributes').forEach(function(name, meta) {
      callback.call(binding, name, meta);
    }, binding);
  },

  eachTransformedAttribute: function(callback, binding) {
    get(this, 'transformedAttributes').forEach(function(name, type) {
      callback.call(binding, name, type);
    });
  }
});


DS.Model.reopen({
  eachAttribute: function(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
  }
});

function getDefaultValue(record, options, key) {
  if (typeof options.defaultValue === "function") {
    return options.defaultValue();
  } else {
    return options.defaultValue;
  }
}

function hasValue(record, key) {
  return record._attributes.hasOwnProperty(key) ||
         record._inFlightAttributes.hasOwnProperty(key) ||
         record._data.hasOwnProperty(key);
}

function getValue(record, key) {
  if (record._attributes.hasOwnProperty(key)) {
    return record._attributes[key];
  } else if (record._inFlightAttributes.hasOwnProperty(key)) {
    return record._inFlightAttributes[key];
  } else {
    return record._data[key];
  }
}

/**
  `DS.attr` defines an attribute on a DS.Model.
  By default, attributes are passed through as-is, however you can specify an
  optional type to have the value automatically transformed.
  Ember Data ships with four basic transform types:
    'string', 'number', 'boolean' and 'date'.
  You can define your own transforms by subclassing DS.Transform.

  DS.attr takes an optional hash as a second parameter, currently
  supported options are:
    'defaultValue': Pass a string or a function to be called to set the attribute
                    to a default value if none is supplied.

  @method attr
  @param {String} type the attribute type
  @param {Object} options a hash of options
*/

DS.attr = function(type, options) {
  options = options || {};

  var meta = {
    type: type,
    isAttribute: true,
    options: options
  };

  return Ember.computed(function(key, value) {
    if (arguments.length > 1) {
      Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.constructor.toString(), key !== 'id');
      var oldValue = this._attributes[key] || this._inFlightAttributes[key] || this._data[key];
      this.send('didSetProperty', { name: key, oldValue: oldValue, originalValue: this._data[key], value: value });
      this._attributes[key] = value;
      return value;
    } else if (hasValue(this, key)) {
      return getValue(this, key);
    } else {
      return getDefaultValue(this, options, key);
    }

  // `data` is never set directly. However, it may be
  // invalidated from the state manager's setData
  // event.
  }).property('data').meta(meta);
};

