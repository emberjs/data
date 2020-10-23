import EmberObject from '@ember/object';

type Store = import('@ember-data/store/-private/system/core-store').default;
type Snapshot = import('ember-data/-private').Snapshot;
type SnapshotRecordArray = import('@ember-data/store/-private/system/snapshot-record-array').default;

/**
  An adapter is an object that receives requests from a store and
  translates them into the appropriate action to take against your
  persistence layer. The persistence layer is usually an HTTP API but
  may be anything, such as the browser's local storage. Typically the
  adapter is not invoked directly instead its functionality is accessed
  through the `store`.

  ### Creating an Adapter

  Create a new subclass of `Adapter` in the `app/adapters` folder:

  ```app/adapters/application.js
  import Adapter from '@ember-data/adapter';

  export default Adapter.extend({
    // ...your code here
  });
  ```

  Model-specific adapters can be created by putting your adapter
  class in an `app/adapters/` + `model-name` + `.js` file of the application.

  ```app/adapters/post.js
  import Adapter from '@ember-data/adapter';

  export default Adapter.extend({
    // ...Post-specific adapter code goes here
  });
  ```

  `Adapter` is an abstract base class that you should override in your
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


  For an example of the implementation, see `RESTAdapter`, the
  included REST adapter.

  @module @ember-data/adapter
  @class Adapter
  @extends EmberObject
*/
export default class Adapter extends EmberObject {
  /**
    If you would like your adapter to use a custom serializer you can
    set the `defaultSerializer` property to be the name of the custom
    serializer.

    Note the `defaultSerializer` serializer has a lower priority than
    a model specific serializer (i.e. `PostSerializer`) or the
    `application` serializer.

    ```app/adapters/django.js
    import Adapter from '@ember-data/adapter';

    export default Adapter.extend({
      defaultSerializer: 'django'
    });
    ```

    @deprecated
    @property defaultSerializer
    @type {String}
  */
  defaultSerializer = '-default';

  /**
    The `findRecord()` method is invoked when the store is asked for a record that
    has not previously been loaded. In response to `findRecord()` being called, you
    should query your persistence layer for a record with the given ID. The `findRecord`
    method should return a promise that will resolve to a JavaScript object that will be
    normalized by the serializer.

    Here is an example of the `findRecord` implementation:

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      findRecord(store, type, id, snapshot) {
        return new RSVP.Promise(function(resolve, reject) {
          $.getJSON(`/${type.modelName}/${id}`).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    }
    ```

    @method findRecord
    @param {Store} store
    @param {Model} type
    @param {String} id
    @param {Snapshot} snapshot
    @return {Promise} promise
  */

  /**
    The `findAll()` method is used to retrieve all records for a given type.

    Example

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      findAll(store, type) {
        return new RSVP.Promise(function(resolve, reject) {
          $.getJSON(`/${type.modelName}`).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    }
    ```

    @method findAll
    @param {Store} store
    @param {Model} type
    @param {undefined} neverSet a value is never provided to this argument
    @param {SnapshotRecordArray} snapshotRecordArray
    @return {Promise} promise
  */

  /**
    This method is called when you call `query` on the store.

    Example

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      query(store, type, query) {
        return new RSVP.Promise(function(resolve, reject) {
          $.getJSON(`/${type.modelName}`, query).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    }
    ```

    @method query
    @param {Store} store
    @param {Model} type
    @param {Object} query
    @param {AdapterPopulatedRecordArray} recordArray
    @param {Object} adapterOptions
    @return {Promise} promise
  */

  /**
    The `queryRecord()` method is invoked when the store is asked for a single
    record through a query object.

    In response to `queryRecord()` being called, you should always fetch fresh
    data. Once found, you can asynchronously call the store's `push()` method
    to push the record into the store.

    Here is an example `queryRecord` implementation:

    Example

    ```app/adapters/application.js
    import Adapter, { BuildURLMixin } from '@ember-data/adapter';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter.extend(BuildURLMixin) {
      queryRecord(store, type, query) {
        return new RSVP.Promise(function(resolve, reject) {
          $.getJSON(`/${type.modelName}`, query).then(function(data) {
            resolve(data);
          }, function(jqXHR) {
            reject(jqXHR);
          });
        });
      }
    }
    ```

    @method queryRecord
    @param {Store} store
    @param {subclass of Model} type
    @param {Object} query
    @param {Object} adapterOptions
    @return {Promise} promise
  */

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
    import Adapter from '@ember-data/adapter';
    import { v4 } from 'uuid';

    export default class ApplicationAdapter extends Adapter {
      generateIdForRecord(store, type, inputProperties) {
        return v4();
      }
    }
    ```

    @method generateIdForRecord
    @param {Store} store
    @param {Model} type   the Model class of the record
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {(String|Number)} id
  */

  /**
    Proxies to the serializer's `serialize` method.

    Example

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';

    export default class ApplicationAdapter extends Adapter {
      createRecord(store, type, snapshot) {
        let data = this.serialize(snapshot, { includeId: true });
        let url = `/${type.modelName}`;

        // ...
      }
    }
    ```

    @method serialize
    @param {Snapshot} snapshot
    @param {Object}   options
    @return {Object} serialized snapshot
  */
  serialize(snapshot, options) {
    return snapshot.serialize(options);
  }

  /**
    Implement this method in a subclass to handle the creation of
    new records.

    Serializes the record and sends it to the server.

    Example

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';
    import { run } from '@ember/runloop';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      createRecord(store, type, snapshot) {
        let data = this.serialize(snapshot, { includeId: true });

        return new RSVP.Promise(function (resolve, reject) {
          $.ajax({
            type: 'POST',
            url: `/${type.modelName}`,
            dataType: 'json',
            data: data
          }).then(function (data) {
            run(null, resolve, data);
          }, function (jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            run(null, reject, jqXHR);
          });
        });
      }
    }
    ```

    @method createRecord
    @param {Store} store
    @param {Model} type   the Model class of the record
    @param {Snapshot} snapshot
    @return {Promise} promise
  */

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
    import Adapter from '@ember-data/adapter';
    import { run } from '@ember/runloop';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      updateRecord(store, type, snapshot) {
        let data = this.serialize(snapshot, { includeId: true });
        let id = snapshot.id;

        return new RSVP.Promise(function(resolve, reject) {
          $.ajax({
            type: 'PUT',
            url: `/${type.modelName}/${id}`,
            dataType: 'json',
            data: data
          }).then(function(data) {
            run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            run(null, reject, jqXHR);
          });
        });
      }
    }
    ```

    @method updateRecord
    @param {Store} store
    @param {Model} type   the Model class of the record
    @param {Snapshot} snapshot
    @return {Promise} promise
  */

  /**
    Implement this method in a subclass to handle the deletion of
    a record.

    Sends a delete request for the record to the server.

    Example

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';
    import { run } from '@ember/runloop';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      deleteRecord(store, type, snapshot) {
        let data = this.serialize(snapshot, { includeId: true });
        let id = snapshot.id;

        return new RSVP.Promise(function(resolve, reject) {
          $.ajax({
            type: 'DELETE',
            url: `/${type.modelName}/${id}`,
            dataType: 'json',
            data: data
          }).then(function(data) {
            run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            run(null, reject, jqXHR);
          });
        });
      }
    }
    ```

    @method deleteRecord
    @param {Store} store
    @param {Model} type   the Model class of the record
    @param {Snapshot} snapshot
    @return {Promise} promise
  */

  /**
    By default the store will try to coalesce all `fetchRecord` calls within the same runloop
    into as few requests as possible by calling groupRecordsForFindMany and passing it into a findMany call.
    You can opt out of this behaviour by either not implementing the findMany hook or by setting
    coalesceFindRequests to false.

    @property coalesceFindRequests
    @type {boolean}
  */
  coalesceFindRequests = true;

  /**
    The store will call `findMany` instead of multiple `findRecord`
    requests to find multiple records at once if coalesceFindRequests
    is true.

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';
    import { run } from '@ember/runloop';
    import RSVP from 'RSVP';
    import $ from 'jquery';

    export default class ApplicationAdapter extends Adapter {
      findMany(store, type, ids, snapshots) {
        return new RSVP.Promise(function(resolve, reject) {
          $.ajax({
            type: 'GET',
            url: `/${type.modelName}/`,
            dataType: 'json',
            data: { filter: { id: ids.join(',') } }
          }).then(function(data) {
            run(null, resolve, data);
          }, function(jqXHR) {
            jqXHR.then = null; // tame jQuery's ill mannered promises
            run(null, reject, jqXHR);
          });
        });
      }
    }
    ```

    @method findMany
    @param {Store} store
    @param {Model} type   the Model class of the records
    @param {Array}    ids
    @param {Array} snapshots
    @return {Promise} promise
  */

  /**
    Organize records into groups, each of which is to be passed to separate
    calls to `findMany`.

    For example, if your API has nested URLs that depend on the parent, you will
    want to group records by their parent.

    The default implementation returns the records as a single group.

    @method groupRecordsForFindMany
    @param {Store} store
    @param {Array} snapshots
    @return {Array}  an array of arrays of records, each of which is to be
                      loaded separately by `findMany`.
  */
  groupRecordsForFindMany(store: Store, snapshots: Snapshot[]) {
    return [snapshots];
  }

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
    shouldReloadRecord(store, ticketSnapshot) {
      let lastAccessedAt = ticketSnapshot.attr('lastAccessedAt');
      let timeDiff = moment().diff(lastAccessedAt, 'minutes');

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
    @param {Store} store
    @param {Snapshot} snapshot
    @return {Boolean}
  */
  shouldReloadRecord(store: Store, snapshot: Snapshot) {
    return false;
  }

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
    shouldReloadAll(store, snapshotArray) {
      let snapshots = snapshotArray.snapshots();

      return snapshots.any((ticketSnapshot) => {
        let lastAccessedAt = ticketSnapshot.attr('lastAccessedAt');
        let timeDiff = moment().diff(lastAccessedAt, 'minutes');

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

    By default, this method returns `true` if the passed `snapshotRecordArray`
    is empty (meaning that there are no records locally available yet),
    otherwise, it returns `false`.

    Note that, with default settings, `shouldBackgroundReloadAll` will always
    re-fetch all the records in the background even if `shouldReloadAll` returns
    `false`. You can override `shouldBackgroundReloadAll` if this does not suit
    your use case.

    @since 1.13.0
    @method shouldReloadAll
    @param {Store} store
    @param {SnapshotRecordArray} snapshotRecordArray
    @return {Boolean}
  */
  shouldReloadAll(store: Store, snapshotRecordArray) {
    return !snapshotRecordArray.length;
  }

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
    shouldBackgroundReloadRecord(store, snapshot) {
      let { downlink, effectiveType } = navigator.connection;

      return downlink > 0 && effectiveType === '4g';
    }
    ```

    By default, this hook returns `true` so the data for the record is updated
    in the background.

    @since 1.13.0
    @method shouldBackgroundReloadRecord
    @param {Store} store
    @param {Snapshot} snapshot
    @return {Boolean}
  */
  shouldBackgroundReloadRecord(store: Store, Snapshot) {
    return true;
  }

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
    shouldBackgroundReloadAll(store, snapshotArray) {
      let { downlink, effectiveType } = navigator.connection;

      return downlink > 0 && effectiveType === '4g';
    }
    ```

    By default this method returns `true`, indicating that a background reload
    should always be triggered.

    @since 1.13.0
    @method shouldBackgroundReloadAll
    @param {Store} store
    @param {SnapshotRecordArray} snapshotRecordArray
    @return {Boolean}
  */
  shouldBackgroundReloadAll(store: Store, snapshotRecordArray: SnapshotRecordArray) {
    return true;
  }
}

export { BuildURLMixin } from './-private';
