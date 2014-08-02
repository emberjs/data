/**
  @module ember-data
*/

var get = Ember.get;
var set = Ember.set;
var map = Ember.ArrayPolyfills.map;

var errorProps = [
  'description',
  'fileName',
  'lineNumber',
  'message',
  'name',
  'number',
  'stack'
];

/**
  A `DS.InvalidError` is used by an adapter to signal the external API
  was unable to process a request because the content was not
  semantically correct or meaningful per the API. Usually this means a
  record failed some form of server side validation. When a promise
  from an adapter is rejected with a `DS.InvalidError` the record will
  transition to the `invalid` state and the errors will be set to the
  `errors` property on the record.

  Example

  ```javascript
  App.ApplicationAdapter = DS.RESTAdapter.extend({
    ajaxError: function(jqXHR) {
      var error = this._super(jqXHR);

      if (jqXHR && jqXHR.status === 422) {
        var jsonErrors = Ember.$.parseJSON(jqXHR.responseText)["errors"];
        return new DS.InvalidError(jsonErrors);
      } else {
        return error;
      }
    }
  });
  ```

  The `DS.InvalidError` must be constructed with a single object whose
  keys are the invalid model properties, and whose values are the
  corresponding error messages. For example:

  ```javascript
  return new DS.InvalidError({
    length: 'Must be less than 15',
    name: 'Must not be blank
  });
  ```

  @class InvalidError
  @namespace DS
*/
function InvalidError(errors) {
  var tmp = Error.prototype.constructor.call(this, "The backend rejected the commit because it was invalid: " + Ember.inspect(errors));
  this.errors = errors;

  for (var i=0, l=errorProps.length; i<l; i++) {
    this[errorProps[i]] = tmp[errorProps[i]];
  }
}

InvalidError.prototype = Ember.create(Error.prototype);

/**
  An adapter is an object that receives requests from a store and
  translates them into the appropriate action to take against your
  persistence layer. The persistence layer is usually an HTTP API, but
  may be anything, such as the browser's local storage. Typically the
  adapter is not invoked directly instead its functionality is accessed
  through the `store`.

  ### Creating an Adapter

  Create a new subclass of `DS.Adapter`, then assign
  it to the `ApplicationAdapter` property of the application.

  ```javascript
  var MyAdapter = DS.Adapter.extend({
    // ...your code here
  });

  App.ApplicationAdapter = MyAdapter;
  ```

  Model-specific adapters can be created by assigning your adapter
  class to the `ModelName` + `Adapter` property of the application.

  ```javascript
  var MyPostAdapter = DS.Adapter.extend({
    // ...Post-specific adapter code goes here
  });

  App.PostAdapter = MyPostAdapter;
  ```

  `DS.Adapter` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `find()`
    * `createRecord()`
    * `updateRecord()`
    * `deleteRecord()`
    * `findAll()`
    * `findQuery()`

  To improve the network performance of your application, you can optimize
  your adapter by overriding these lower-level methods:

    * `findMany()`


  For an example implementation, see `DS.RESTAdapter`, the
  included REST adapter.

  @class Adapter
  @namespace DS
  @extends Ember.Object
*/

var Adapter = Ember.Object.extend({

  /**
    If you would like your adapter to use a custom serializer you can
    set the `defaultSerializer` property to be the name of the custom
    serializer.

    Note the `defaultSerializer` serializer has a lower priority than
    a model specific serializer (i.e. `PostSerializer`) or the
    `application` serializer.

    ```javascript
    var DjangoAdapter = DS.Adapter.extend({
      defaultSerializer: 'django'
    });
    ```

    @property defaultSerializer
    @type {String}
  */

  /**
    The `find()` method is invoked when the store is asked for a record that
    has not previously been loaded. In response to `find()` being called, you
    should query your persistence layer for a record with the given ID. Once
    found, you can asynchronously call the store's `push()` method to push
    the record into the store.

    Here is an example `find` implementation:

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      find: function(store, type, id) {
        var url = [type.typeKey, id].join('/');

        return new Ember.RSVP.Promise(function(resolve, reject) {
          jQuery.getJSON(url).then(function(data) {
            Ember.run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            Ember.run(null, reject, jqXHR);
          });
        });
      }
    });
    ```

    @method find
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} id
    @return {Promise} promise
  */
  find: Ember.required(Function),

  /**
    The `findAll()` method is called when you call `find` on the store
    without an ID (i.e. `store.find('post')`).

    Example

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      findAll: function(store, type, sinceToken) {
        var url = type;
        var query = { since: sinceToken };
        return new Ember.RSVP.Promise(function(resolve, reject) {
          jQuery.getJSON(url, query).then(function(data) {
            Ember.run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            Ember.run(null, reject, jqXHR);
          });
        });
      }
    });
    ```

    @private
    @method findAll
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} sinceToken
    @return {Promise} promise
  */
  findAll: null,

  /**
    This method is called when you call `find` on the store with a
    query object as the second parameter (i.e. `store.find('person', {
    page: 1 })`).

    Example

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      findQuery: function(store, type, query) {
        var url = type;
        return new Ember.RSVP.Promise(function(resolve, reject) {
          jQuery.getJSON(url, query).then(function(data) {
            Ember.run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            Ember.run(null, reject, jqXHR);
          });
        });
      }
    });
    ```

    @private
    @method findQuery
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} query
    @param {DS.AdapterPopulatedRecordArray} recordArray
    @return {Promise} promise
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

    ```javascript
    generateIdForRecord: function(store, record) {
      var uuid = App.generateUUIDWithStatisticallyLowOddsOfCollision();
      return uuid;
    }
    ```

    @method generateIdForRecord
    @param {DS.Store} store
    @param {DS.Model} record
    @return {String|Number} id
  */
  generateIdForRecord: null,

  /**
    Proxies to the serializer's `serialize` method.

    Example

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      createRecord: function(store, type, record) {
        var data = this.serialize(record, { includeId: true });
        var url = type;

        // ...
      }
    });
    ```

    @method serialize
    @param {DS.Model} record
    @param {Object}   options
    @return {Object} serialized record
  */
  serialize: function(record, options) {
    return get(record, 'store').serializerFor(record.constructor.typeKey).serialize(record, options);
  },

  /**
    Implement this method in a subclass to handle the creation of
    new records.

    Serializes the record and send it to the server.

    Example

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      createRecord: function(store, type, record) {
        var data = this.serialize(record, { includeId: true });
        var url = type;

        return new Ember.RSVP.Promise(function(resolve, reject) {
          jQuery.ajax({
            type: 'POST',
            url: url,
            dataType: 'json',
            data: data
          }).then(function(data) {
            Ember.run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            Ember.run(null, reject, jqXHR);
          });
        });
      }
    });
    ```

    @method createRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the record
    @param {DS.Model} record
    @return {Promise} promise
  */
  createRecord: Ember.required(Function),

  /**
    Implement this method in a subclass to handle the updating of
    a record.

    Serializes the record update and send it to the server.

    Example

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      updateRecord: function(store, type, record) {
        var data = this.serialize(record, { includeId: true });
        var id = record.get('id');
        var url = [type, id].join('/');

        return new Ember.RSVP.Promise(function(resolve, reject) {
          jQuery.ajax({
            type: 'PUT',
            url: url,
            dataType: 'json',
            data: data
          }).then(function(data) {
            Ember.run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            Ember.run(null, reject, jqXHR);
          });
        });
      }
    });
    ```

    @method updateRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the record
    @param {DS.Model} record
    @return {Promise} promise
  */
  updateRecord: Ember.required(Function),

  /**
    Implement this method in a subclass to handle the deletion of
    a record.

    Sends a delete request for the record to the server.

    Example

    ```javascript
    App.ApplicationAdapter = DS.Adapter.extend({
      deleteRecord: function(store, type, record) {
        var data = this.serialize(record, { includeId: true });
        var id = record.get('id');
        var url = [type, id].join('/');

        return new Ember.RSVP.Promise(function(resolve, reject) {
          jQuery.ajax({
            type: 'DELETE',
            url: url,
            dataType: 'json',
            data: data
          }).then(function(data) {
            Ember.run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            Ember.run(null, reject, jqXHR);
          });
        });
      }
    });
    ```

    @method deleteRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the record
    @param {DS.Model} record
    @return {Promise} promise
  */
  deleteRecord: Ember.required(Function),

  /**
    By default the store will try to coalesce all `fetchRecord` calls within the same runloop
    into as few requests as possible by calling groupRecordsForFindMany and passing it into a findMany call.
    You can opt out of this behaviour by either not implementing the findMany hook or by setting
    coalesceFindRequests to false

    @property coalesceFindRequests
    @type {boolean}
  */
  coalesceFindRequests: true,

  /**
    Find multiple records at once if coalesceFindRequests is true

    @method findMany
    @param {DS.Store} store
    @param {subclass of DS.Model} type   the DS.Model class of the records
    @param {Array}    ids
    @param {Array} records
    @return {Promise} promise
  */

  /**
    Organize records into groups, each of which is to be passed to separate
    calls to `findMany`.

    For example, if your api has nested URLs that depend on the parent, you will
    want to group records by their parent.

    The default implementation returns the records as a single group.

    @method groupRecordsForFindMany
    @param {Array} records
    @return {Array}  an array of arrays of records, each of which is to be
                      loaded separately by `findMany`.
  */
  groupRecordsForFindMany: function (store, records) {
    return [records];
  }
});

export {
  InvalidError,
  Adapter
};
export default Adapter;
