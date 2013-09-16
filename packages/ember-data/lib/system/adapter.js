/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var map = Ember.ArrayPolyfills.map;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

DS.InvalidError = function(errors) {
  var tmp = Error.prototype.constructor.call(this, "The backend rejected the commit because it was invalid: " + Ember.inspect(errors));
  this.errors = errors;

  for (var i=0, l=errorProps.length; i<l; i++) {
    this[errorProps[i]] = tmp[errorProps[i]];
  }
};
DS.InvalidError.prototype = Ember.create(Error.prototype);

/**
  An adapter is an object that receives requests from a store and
  translates them into the appropriate action to take against your
  persistence layer. The persistence layer is usually an HTTP API, but may
  be anything, such as the browser's local storage.

  ### Creating an Adapter

  First, create a new subclass of `DS.Adapter`:

      App.MyAdapter = DS.Adapter.extend({
        // ...your code here
      });

  To tell your store which adapter to use, set its `adapter` property:

      App.store = DS.Store.create({
        adapter: App.MyAdapter.create()
      });

  `DS.Adapter` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `find()`
    * `createRecord()`
    * `updateRecord()`
    * `deleteRecord()`

  To improve the network performance of your application, you can optimize
  your adapter by overriding these lower-level methods:

    * `findMany()`
    * `createRecords()`
    * `updateRecords()`
    * `deleteRecords()`
    * `commit()`

  For an example implementation, see `DS.RESTAdapter`, the
  included REST adapter.

  @class Adapter
  @namespace DS
  @extends Ember.Object
  @uses DS._Mappable
*/

DS.Adapter = Ember.Object.extend(DS._Mappable, {

  /**
    The `find()` method is invoked when the store is asked for a record that
    has not previously been loaded. In response to `find()` being called, you
    should query your persistence layer for a record with the given ID. Once
    found, you can asynchronously call the store's `push()` method to push
    the record into the store.

    Here is an example `find` implementation:

        find: function(store, type, id) {
          var url = type.url;
          url = url.fmt(id);

          jQuery.getJSON(url, function(data) {
              // data is a hash of key/value pairs. If your server returns a
              // root, simply do something like:
              // store.push(type, id, data.person)
              store.push(type, id, data);
          });
        }

    @method find
  */
  find: Ember.required(Function),

  /**
    Optional

    @method findAll
    @param  store
    @param  type
    @param  since
  */
  findAll: null,

  /**
    Optional

    @method findQuery
    @param  store
    @param  type
    @param  query
    @param  recordArray
  */
  findQuery: null,

  /**
    If the globally unique IDs for your records should be generated on the client,
    implement the `generateIdForRecord()` method. This method will be invoked
    each time you create a new record, and the value returned from it will be
    assigned to the record's `primaryKey`.

    Most traditional REST-like HTTP APIs will not use this method. Instead, the ID
    of the record will be set by the server, and your adapter will update the store
    with the new ID when it calls `didCreateRecord()`. Only implement this method if
    you intend to generate record IDs on the client-side.

    The `generateIdForRecord()` method will be invoked with the requesting store as
    the first parameter and the newly created record as the second parameter:

        generateIdForRecord: function(store, record) {
          var uuid = App.generateUUIDWithStatisticallyLowOddsOfCollision();
          return uuid;
        }

    @method generateIdForRecord
    @param {DS.Store} store
    @param {DS.Model} record
  */
  generateIdForRecord: null,

  /**
    Proxies to the serializer's `serialize` method.

    @method serialize
    @param {DS.Model} record
    @param {Object}   options
  */
  serialize: function(record, options) {
    return get(record, 'store').serializerFor(record.constructor.typeKey).serialize(record, options);
  },

  /**
    Implement this method in a subclass to handle the creation of
    new records.

    Serializes the record and send it to the server.

    This implementation should call the adapter's `didCreateRecord`
    method on success or `didError` method on failure.

    @method createRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the record
    @param {DS.Model} record
  */
  createRecord: Ember.required(Function),

  /**
    Implement this method in a subclass to handle the updating of
    a record.

    Serializes the record update and send it to the server.

    @method updateRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the record
    @param {DS.Model} record
  */
  updateRecord: Ember.required(Function),

  /**
    Implement this method in a subclass to handle the deletion of
    a record.

    Sends a delete request for the record to the server.

    @method deleteRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the record
    @param {DS.Model} record
  */
  deleteRecord: Ember.required(Function),

  /**
    Find multiple records at once.

    By default, it loops over the provided ids and calls `find` on each.
    May be overwritten to improve performance and reduce the number of
    server requests.

    @method findMany
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the records
    @param {Array}    ids
  */
  findMany: function(store, type, ids) {
    var promises = map.call(ids, function(id) {
      return this.find(store, type, id);
    }, this);

    return Ember.RSVP.all(promises);
  }
});
