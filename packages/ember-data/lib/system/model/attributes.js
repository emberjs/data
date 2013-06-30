require("ember-data/system/model/model");

/**
  @module data
  @submodule data-model
*/

var get = Ember.get;

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
  })
});


DS.Model.reopen({
  eachAttribute: function(callback, binding) {
    get(this.constructor, 'attributes').forEach(function(name, meta) {
      callback.call(binding, name, meta);
    }, binding);
  },

  attributeWillChange: Ember.beforeObserver(function(record, key) {
    var reference = get(record, '_reference'),
        store = get(record, 'store');

    record.send('willSetProperty', { reference: reference, store: store, name: key });
  }),

  attributeDidChange: Ember.observer(function(record, key) {
    record.send('didSetProperty', { name: key });
  }),

  getAttr: function(key, options) {
    var attributes = get(this, 'data').attributes;
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
});

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
    } else {
      value = this.getAttr(key, options);
    }

    return value;
  // `data` is never set directly. However, it may be
  // invalidated from the state manager's setData
  // event.
  }).property('data').meta(meta);
};

