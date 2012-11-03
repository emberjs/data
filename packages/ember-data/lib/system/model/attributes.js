var get = Ember.get;
var set = Ember.set;

require("ember-data/system/model/model");

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
  }
});

function getAttr(record, options, key) {
  var attributes = get(record, 'data').attributes;
  var value = attributes[key];

  if (value === undefined) {
    value = options.defaultValue;
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

  return Ember.computed(function(key, value) {
    function observeArray(arr, path, target) {
      arr.addObserver('[]', this, function() {
        target.setProperty(path, Ember.copy(arr));
      });
    }

    function observeObject(proxy, path, child) {
      function triggerChanges() {
        this.triggerChanges();
      }

      if (child === undefined) child = get(proxy, 'content');

      for (var key in child) {
        var pathToVal = path.fmt(key);
        var val = get(proxy, pathToVal);
        if (typeof val === 'object') {
          if (Ember.isArray(val)) {
            observeArray(val, pathToVal, proxy.get('record'));
          } else {
            var childPath = pathToVal + '.%@';
            observeObject(proxy, childPath, val);
          }
        } else {
          proxy.addObserver(pathToVal, proxy, triggerChanges);
        }
      }
    }

    if (arguments.length === 2) {
      Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.toString(), key !== 'id');
      this.setProperty(key, value);
    } else {
      value = getAttr(this, options, key);
      if (Ember.isArray(value)) {
        observeArray(value, key, this);
      } else if (typeof value === 'object') {
        var proxyKey = '%@Proxy'.fmt(key);
        if (get(this, proxyKey) === undefined) {
          var record = this;
          var proxy = Ember.ObjectProxy.create({
            content: Ember.Object.create(value),
            record: record,
            triggerChanges: function() {
              this.get('record').setProperty(key, this.get('content'));
            }
          });

          observeObject(proxy, 'content.%@');

          set(this, proxyKey, proxy);
        }

        value = get(this, proxyKey);
      }
    }

    return value;
  // `data` is never set directly. However, it may be
  // invalidated from the state manager's setData
  // event.
  }).property('data').meta(meta);
};

