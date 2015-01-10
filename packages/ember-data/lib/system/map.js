/*
 The Map/MapWithDefault/OrderedSet code has been in flux as we try
 to catch up with ES6. This is difficult as we support multiple
 versions of Ember.
 This file is currently here in case we have to polyfill ember's code
 across a few releases. As ES6 comes to a close we should have a smaller
 and smaller gap in implementations between Ember releases.
*/
var Map, MapWithDefault;
var OrderedSet = Ember.OrderedSet;

function copyNull(obj) {
  var output = Ember.create(null);

  for (var prop in obj) {
    // hasOwnPropery is not needed because obj is Object.create(null);
    output[prop] = obj[prop];
  }

  return output;
}
function copyMap(original, newObject) {
  var keys = original._keys.copy();
  var values = copyNull(original._values);

  newObject._keys = keys;
  newObject._values = values;
  newObject.size = original.size;

  return newObject;
}

var map = new Ember.Map();
if (!Object.hasOwnProperty.call(map, '_keys')) {
  Map = function ED_Map() {
    if (this instanceof this.constructor) {
      this._keys = OrderedSet.create();
      this._keys._silenceRemoveDeprecation = true;
      this._values = Ember.create(null);
      this.size = 0;
    } else {
      throw new TypeError("Constructor OrderedSet requires 'new'");
    }
  };

  Map.prototype = Ember.create(Ember.Map.prototype);

  Map.prototype.copy = function() {
    return copyMap(this, new Map());
  };

  Map.prototype.get = function(key) {
    if (this.size === 0) { return; }

    var values = this._values;
    var guid = Ember.guidFor(key);

    return values[guid];
  };

  Map.prototype.set = function(key, value) {
    var keys = this._keys;
    var values = this._values;
    var guid = Ember.guidFor(key);

    // ensure we don't store -0
    var k = key === -0 ? 0 : key;

    keys.add(k, guid);

    values[guid] = value;

    this.size = keys.size;

    return this;
  };

  Map.prototype.delete = function(key) {
    if (this.size === 0) { return false; }
    var keys = this._keys;
    var values = this._values;
    var guid = Ember.guidFor(key);

    if (Ember.keys.delete(key, guid)) {
      delete values[guid];
      this.size = keys.size;
      return true;
    } else {
      return false;
    }
  };

  Map.prototype.has = function(key) {
    return this._keys.has(key);
  };

  Map.prototype.forEach = function(callback /*, thisArg*/) {
    if (typeof callback !== 'function') {
      throw new TypeError('' + Object.prototype.toString.call(callback) + " is not a function");
    }

    if (this.size === 0) { return; }

    var length = arguments.length;
    var map = this;
    var cb, thisArg;

    if (length === 2) {
      thisArg = arguments[1];
      cb = function(key) {
        callback.call(thisArg, map.get(key), key, map);
      };
    } else {
      cb = function(key) {
        callback(map.get(key), key, map);
      };
    }

    this._keys.forEach(cb);
  };

  Map.prototype.clear = function() {
    this._keys.clear();
    this._values = Ember.create(null);
    this.size = 0;
  };

  Map.constructor = Map;

  Map.create = function() {
    return new this.constructor();
  };

  MapWithDefault = function ED_MapWithDefault(options) {
    this._super$constructor();
    this.defaultValue = options.defaultValue;
  };

  MapWithDefault.prototype = Ember.create(Map.prototype);
  MapWithDefault.prototype._super$constructor = Map;
  MapWithDefault.prototype._super$get = Map.prototype.get;

  MapWithDefault.prototype.get = function(key) {
    var hasValue = this.has(key);

    if (hasValue) {
      return this._super$get(key);
    } else {
      var defaultValue = this.defaultValue(key);
      this.set(key, defaultValue);
      return defaultValue;
    }
  };

  MapWithDefault.prototype.copy = function() {
    var Constructor = this.constructor;
    return copyMap(this, new Constructor({
      defaultValue: this.defaultValue
    }));
  };

  MapWithDefault.constructor = MapWithDefault;

  MapWithDefault.create = function(options) {
    if (options) {
      return new MapWithDefault(options);
    } else {
      return new Map();
    }
  };
} else {
  Map = Ember.Map;
  MapWithDefault = Ember.MapWithDefault;
}

export default Map;
export {Map, MapWithDefault, OrderedSet};
