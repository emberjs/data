import Ember from 'ember';
import {
  _findMany
} from "./store/finders";

import coerceId from "./coerce-id";

let get = { Ember };

/**
 * A class that coalesces find requests
 * @param {DS.Store or subclass of DS.Store} store
 */
function FindCoalescer(store) {
  this.store = store;
}

let Promise = Ember.RSVP.Promise;

/**
 * Set up the coalescer
 */
FindCoalescer.prototype._begin = function() {
  // return if _begin has already been called
  if (this._pending) { return; }

  // flush
  Ember.run.scheduleOnce('afterRender', this, this._end);

  // Map<Type, Map>
  this._pending = new Ember.MapWithDefault({
    defaultValue: function() {
      return new Ember.Map();
    }
  });
};

/**
 * Check whether a record is loaded
 * @param  {DS.Model}  record
 * @return {Boolean}   true if the record is non-empty
 */
function isLoaded(record) {
  return record && !get(record, 'isEmpty');
}

FindCoalescer.prototype._end = function() {
  this._pending.forEach(this._findMany, this);
  this._pending = undefined;
};

/**
 * Find one or more records of a given type
 * @param {String} type of record to find
 * @param  {Map} map  record id to promise map
 */
FindCoalescer.prototype._findMany = function(map, type) {
  let store = this.store;
  let missing = [];

  // For each item in map
  map.forEach(function(deferred, id, map) {
    // Accumulate missing records
    let record = store.recordForId(type, id);
    if (!isLoaded(record)) {
      console.log("MISSING: " + type + ": " + id);
      missing.push(record);
    } else {
      console.log("NOT MISSING: " + type + ": " + id);
      map.get(get(record, 'id')).resolve(record);
    }
  });

  let adapter = this.store.adapterFor({
    typeKey: type
  });

  let ids = missing.map(function(record) {
    return get(record, 'id');
  });

  let grouped = adapter.groupRecordsForFindMany(this.store, missing);

  // Iterate over all groups of ids
  return Promise.all(grouped.map(function(group) {
    return _findMany(adapter, store, type, ids, group).then(function() {
      group.forEach(function(record) {
        if (isLoaded(record)) {
          map.get(record).resolve(record);
        } else {
          Ember.Logger.warn('expected: ' + type + ' id: ' + record.id);
        }
      });
    });
  }));
};



/**
 * Find a record
 * @param  {String or DS.Model subclass} type   type of record to find
 * @param  {String|Integer} id                  ID of record to find
 */
FindCoalescer.prototype.find = function(type, id) {
  let finder = this;

  this._begin();

  // Check to see if this record has already been requested
  let existingFind = finder._pending.get(type).get(record);
  let promise = null;

  let record = this.store.recordForId(type, id);

  if (existingFind) {
    // Already requested, return the existing promise
    promise = existingFind.promise;
  } else {
    // Not requested yet, create a new promise and return it
    promise = new Promise(function(resolve, reject) {
      finder._pending.get(type).set(coerceId(id), {
        resolve: resolve,
        reject: reject,
        promise: promise
      });
    });
  }

  return promise;
};

/**
 * Destroy the coalescer, cleaning up any pending requests
 */
FindCoalescer.prototype.destroy = function() {
  // kill pending stuff
};

export default FindCoalescer;
