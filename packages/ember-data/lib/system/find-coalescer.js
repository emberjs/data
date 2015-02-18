export default function FindCoalescer(store) {
  this.store = store;
}

var a_map = Ember.EnumerableUtils.map;
var a_forEach = Ember.EnumerableUtils.forEach;
var Promise = Ember.RSVP.Promise;

FindCoalescer.prototype._begin = function() {
  if (this._pending) { return; }

  Ember.run.scheduleOnce('afterRender', this, this._end);

  this._pending = new Ember.MapWithDefault({
    defaultValue: function() {
      return new Ember.Map();
    }
  });
};

function isLoaded(record) {
  return record && !get(record, 'isEmpty');
}

FindCoalescer.prototype._end = function() {
  this._pending.forEach(this._findMany, this);
  this._pending = undefined;
};

FindCoalescer.prototype._findMany = function(type, map) {
  var store = this.store;
  var missing = [];

  a_forEach(map, function(deferred, record, map) {
    if (isLoaded(record)) {
      missing.push(record);
    } else {
      map.get(get(record, 'id')).resolve(record);
    }
  });

  var adapter = this.store.adapterFor({
    typeKey: type
  });

  var ids = a_map(missing, function(record) {
    return get(record, 'id');
  });

  var grouped = adapter.groupRecordsForFindMany(this, missing);

  return Promise.all(a_map(grouped, function(group) {
    return store._findMany(adapter, store, type, ids, group).then(function() {
      a_forEach(group, function(record) {
        if (isLoaded(record)) {
          map.get(record).resolve(record);
        } else {
          Ember.Logger.warn('expected: ' + type + ' id: ' + id +
                            ' to have been returned by ' + url);

        }
      });
    });
  }));
};

FindCoalescer.prototype.find = function(type, record) {
  var finder = this;

  this._begin();

  return new Promise(function(resolve, reject) {
    finder._pending.get(type).set(record, {
      resolve,
      reject
    });
  });
};

FindCoalescer.prototype.destroy = function() {
  // kill pending stuff
};
