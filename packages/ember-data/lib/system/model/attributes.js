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

function getAttr(record, options, key) {
  var attributes = get(record, 'data');
  var value = attributes[key];

  if (value === undefined) {
    if (typeof options.defaultValue === "function") {
      value = options.defaultValue();
    } else {
      value = options.defaultValue;
    }
  }

  return value;
}

DS.attr = function(type, options) {
  options = options || {};

  var meta = {
    type: type,
    isAttribute: true,
    options: options
  };

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.constructor.toString(), key !== 'id');
      this.send('didSetProperty', { name: key, oldValue: this._attributes[key] || this._data[key], value: value });
      this._attributes[key] = value;
    } else if (this._attributes[key]) {
      return this._attributes[key];
    } else {
      value = getAttr(this, options, key);
    }

    return value;
  // `data` is never set directly. However, it may be
  // invalidated from the state manager's setData
  // event.
  }).property('data').meta(meta);
};

