/**
  @module ember-data
*/

import Ember from 'ember';
var get = Ember.get;

/**
  An adapter is an object that receives requests from a store and
  translates them into the appropriate action to take against your
  persistence layer. The persistence layer is usually an HTTP API, but
  may be anything, such as the browser's local storage. Typically the
  adapter is not invoked directly instead its functionality is accessed
  through the `store`.

  ### Creating an Adapter

  Create a new subclass of `DS.Adapter` in the `app/adapters` folder:

  ```app/adapters/application.js
  import DS from 'ember-data';

  export default DS.Adapter.extend({
    // ...your code here
  });
  ```

  Model-specific adapters can be created by putting your adapter
  class in an `app/adapters/` + `model-name` + `.js` file of the application.

  ```app/adapters/post.js
  import DS from 'ember-data';

  export default DS.Adapter.extend({
    // ...Post-specific adapter code goes here
  });
  ```

  `DS.Adapter` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `findRecord()`
    * `createRecord()`
    * `updateRecord()`
    * `deleteRecord()`
    * `findAll()`
    * `query()`

  To improve the network performance of your application, you can optimize
  your adapter by overriding these lower-level methods:

    * `findMany()`


  For an example implementation, see `DS.RESTAdapter`, the
  included REST adapter.

  @class Adapter
  @namespace DS
  @extends Ember.Object
*/

export default Ember.Object.extend({

  /**
    If you would like your adapter to use a custom serializer you can
    set the `defaultSerializer` property to be the name of the custom
    serializer.

    Note the `defaultSerializer` serializer has a lower priority than
    a model specific serializer (i.e. `PostSerializer`) or the
    `application` serializer.

    ```app/adapters/django.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      defaultSerializer: 'django'
    });
    ```

    @property defaultSerializer
    @type {String}
  */
  defaultSerializer: '-default',

  /**
    The `findRecord()` method is invoked when the store is asked for a record that
    has not previously been loaded. In response to `findRecord()` being called, you
    should query your persistence layer for a record with the given ID. The `findRecord`
    method should return a promise that will resolve to a JavaScript object that will be
    normalized by the serializer.

    Here is an example `findRecord` implementation:

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      findRecord: function(store, type, id, snapshot) {

        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.getJSON(`/${type.modelName}/${id}`).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    });
    ```

    @method findRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} id
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  findRecord: null,

  /**
    The `findAll()` method is used to retrieve all records for a given type.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      findAll: function(store, type, sinceToken) {
        var query = { since: sinceToken };
        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.getJSON(`/${type.modelName}`, query).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    });
    ```

    @method findAll
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} sinceToken
    @param {DS.SnapshotRecordArray} snapshotRecordArray
    @return {Promise} promise
  */
  findAll: null,

  /**
    This method is called when you call `query` on the store.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      query: function(store, type, query) {
        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.getJSON(`/${type.modelName}`, query).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    });
    ```

    @method query
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Object} query
    @param {DS.AdapterPopulatedRecordArray} recordArray
    @return {Promise} promise
  */
  query: null,

  /**
    The `queryRecord()` method is invoked when the store is asked for a single
    record through a query object.

    In response to `queryRecord()` being called, you should always fetch fresh
    data. Once found, you can asynchronously call the store's `push()` method
    to push the record into the store.

    Here is an example `queryRecord` implementation:

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';
    import Ember from 'ember';

    export default DS.Adapter.extend(DS.BuildURLMixin, {
      queryRecord: function(store, type, query) {
        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.getJSON(`/${type.modelName}`, query).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    });
    ```

    @method queryRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} query
    @return {Promise} promise
  */
  queryRecord: null,

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
    import DS from 'ember-data';
    import { v4 } from 'uuid';

    export default DS.Adapter.extend({
      generateIdForRecord: function(store, inputProperties) {
        return v4();
      }
    });
    ```

    @method generateIdForRecord
    @param {DS.Store} store
    @param {DS.Model} type   the DS.Model class of the record
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {(String|Number)} id
  */
  generateIdForRecord: null,

  /**
    Proxies to the serializer's `serialize` method.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      createRecord: function(store, type, snapshot) {
        var data = this.serialize(snapshot, { includeId: true });
        var url = `/${type.modelName}`;

        // ...
      }
    });
    ```

    @method serialize
    @param {DS.Snapshot} snapshot
    @param {Object}   options
    @return {Object} serialized snapshot
  */
  serialize(snapshot, options) {
    return get(snapshot.record, 'store').serializerFor(snapshot.modelName).serialize(snapshot, options);
  },

  /**
    Implement this method in a subclass to handle the creation of
    new records.

    Serializes the record and sends it to the server.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      createRecord: function(store, type, snapshot) {
        var data = this.serialize(snapshot, { includeId: true });

        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.ajax({
            type: 'POST',
            url: `/${type.modelName}`,
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
    @param {DS.Model} type   the DS.Model class of the record
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  createRecord: null,

  /**
    Implement this method in a subclass to handle the updating of
    a record.

    Serializes the record update and sends it to the server.

    The updateRecord method is expected to return a promise that will
    resolve with the serialized record. This allows the backend to
    inform the Ember Data store the current state of this record after
    the update. If it is not possible to return a serialized record
    the updateRecord promise can also resolve with `undefined` and the
    Ember Data store will assume all of the updates were successfully
    applied on the backend.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      updateRecord: function(store, type, snapshot) {
        var data = this.serialize(snapshot, { includeId: true });
        var id = snapshot.id;

        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.ajax({
            type: 'PUT',
            url: `/${type.modelName}/${id}`,
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
    @param {DS.Model} type   the DS.Model class of the record
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord: null,

  /**
    Implement this method in a subclass to handle the deletion of
    a record.

    Sends a delete request for the record to the server.

    Example

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      deleteRecord: function(store, type, snapshot) {
        var data = this.serialize(snapshot, { includeId: true });
        var id = snapshot.id;

        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.ajax({
            type: 'DELETE',
            url: `/${type.modelName}/${id}`,
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
    @param {DS.Model} type   the DS.Model class of the record
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  deleteRecord: null,

  /**
    By default the store will try to coalesce all `fetchRecord` calls within the same runloop
    into as few requests as possible by calling groupRecordsForFindMany and passing it into a findMany call.
    You can opt out of this behaviour by either not implementing the findMany hook or by setting
    coalesceFindRequests to false.

    @property coalesceFindRequests
    @type {boolean}
  */
  coalesceFindRequests: true,

  /**
    The store will call `findMany` instead of multiple `findRecord`
    requests to find multiple records at once if coalesceFindRequests
    is true.

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.Adapter.extend({
      findMany(store, type, ids, snapshots) {
        return new Ember.RSVP.Promise(function(resolve, reject) {
          Ember.$.ajax({
            type: 'GET',
            url: `/${type.modelName}/`,
            dataType: 'json',
            data: { filter: { id: ids.join(',') } }
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

    @method findMany
    @param {DS.Store} store
    @param {DS.Model} type   the DS.Model class of the records
    @param {Array}    ids
    @param {Array} snapshots
    @return {Promise} promise
  */
  findMany: null,

  /**
    Organize records into groups, each of which is to be passed to separate
    calls to `findMany`.

    For example, if your api has nested URLs that depend on the parent, you will
    want to group records by their parent.

    The default implementation returns the records as a single group.

    @method groupRecordsForFindMany
    @param {DS.Store} store
    @param {Array} snapshots
    @return {Array}  an array of arrays of records, each of which is to be
                      loaded separately by `findMany`.
  */
  groupRecordsForFindMany(store, snapshots) {
    return [snapshots];
  },


  /**
    This method is used by the store to determine if the store should
    reload a record from the adapter when a record is requested by
    `store.findRecord`.

    If this method returns `true`, the store will re-fetch a record from
    the adapter. If this method returns `false`, the store will resolve
    immediately using the cached record.

    For example, if you are building an events ticketing system, in which users
    can only reserve tickets for 20 minutes at a time, and want to ensure that
    in each route you have data that is no more than 20 minutes old you could
    write:

    ```javascript
    shouldReloadRecord: function(store, ticketSnapshot) {
      var timeDiff = moment().diff(ticketSnapshot.attr('lastAccessedAt'), 'minutes');
      if (timeDiff > 20) {
        return true;
      } else {
        return false;
      }
    }
    ```

    This method would ensure that whenever you do `store.findRecord('ticket',
    id)` you will always get a ticket that is no more than 20 minutes old. In
    case the cached version is more than 20 minutes old, `findRecord` will not
    resolve until you fetched the latest version.

    By default this hook returns `false`, as most UIs should not block user
    interactions while waiting on data update.

    Note that, with default settings, `shouldBackgroundReloadRecord` will always
    re-fetch the records in the background even if `shouldReloadRecord` returns
    `false`. You can override `shouldBackgroundReloadRecord` if this does not
    suit your use case.

    @since 1.13.0
    @method shouldReloadRecord
    @param {DS.Store} store
    @param {DS.Snapshot} snapshot
    @return {Boolean}
  */
  shouldReloadRecord(store, snapshot) {
    return false;
  },

  /**
    This method is used by the store to determine if the store should
    reload all records from the adapter when records are requested by
    `store.findAll`.

    If this method returns `true`, the store will re-fetch all records from
    the adapter. If this method returns `false`, the store will resolve
    immediately using the cached records.

    For example, if you are building an events ticketing system, in which users
    can only reserve tickets for 20 minutes at a time, and want to ensure that
    in each route you have data that is no more than 20 minutes old you could
    write:

    ```javascript
    shouldReloadAll: function(store, snapshotArray) {
      var snapshots = snapshotArray.snapshots();

      return snapshots.any(function(ticketSnapshot) {
        var timeDiff = moment().diff(ticketSnapshot.attr('lastAccessedAt'), 'minutes');
        if (timeDiff > 20) {
          return true;
        } else {
          return false;
        }
      });
    }
    ```

    This method would ensure that whenever you do `store.findAll('ticket')` you
    will always get a list of tickets that are no more than 20 minutes old. In
    case a cached version is more than 20 minutes old, `findAll` will not
    resolve until you fetched the latest versions.

    By default this methods returns `true` if the passed `snapshotRecordArray`
    is empty (meaning that there are no records locally available yet),
    otherwise it returns `false`.

    Note that, with default settings, `shouldBackgroundReloadAll` will always
    re-fetch all the records in the background even if `shouldReloadAll` returns
    `false`. You can override `shouldBackgroundReloadAll` if this does not suit
    your use case.

    @since 1.13.0
    @method shouldReloadAll
    @param {DS.Store} store
    @param {DS.SnapshotRecordArray} snapshotRecordArray
    @return {Boolean}
  */
  shouldReloadAll(store, snapshotRecordArray) {
    return !snapshotRecordArray.length;
  },

  /**
    This method is used by the store to determine if the store should
    reload a record after the `store.findRecord` method resolves a
    cached record.

    This method is *only* checked by the store when the store is
    returning a cached record.

    If this method returns `true` the store will re-fetch a record from
    the adapter.

    For example, if you do not want to fetch complex data over a mobile
    connection, or if the network is down, you can implement
    `shouldBackgroundReloadRecord` as follows:

    ```javascript
    shouldBackgroundReloadRecord: function(store, snapshot) {
      var connection = window.navigator.connection;
      if (connection === 'cellular' || connection === 'none') {
        return false;
      } else {
        return true;
      }
    }
    ```

    By default this hook returns `true` so the data for the record is updated
    in the background.

    @since 1.13.0
    @method shouldBackgroundReloadRecord
    @param {DS.Store} store
    @param {DS.Snapshot} snapshot
    @return {Boolean}
  */
  shouldBackgroundReloadRecord(store, snapshot) {
    return true;
  },

  /**
    This method is used by the store to determine if the store should
    reload a record array after the `store.findAll` method resolves
    with a cached record array.

    This method is *only* checked by the store when the store is
    returning a cached record array.

    If this method returns `true` the store will re-fetch all records
    from the adapter.

    For example, if you do not want to fetch complex data over a mobile
    connection, or if the network is down, you can implement
    `shouldBackgroundReloadAll` as follows:

    ```javascript
    shouldBackgroundReloadAll: function(store, snapshotArray) {
      var connection = window.navigator.connection;
      if (connection === 'cellular' || connection === 'none') {
        return false;
      } else {
        return true;
      }
    }
    ```

    By default this method returns `true`, indicating that a background reload
    should always be triggered.

    @since 1.13.0
    @method shouldBackgroundReloadAll
    @param {DS.Store} store
    @param {DS.SnapshotRecordArray} snapshotRecordArray
    @return {Boolean}
  */
  shouldBackgroundReloadAll(store, snapshotRecordArray) {
    return true;
  }
});
