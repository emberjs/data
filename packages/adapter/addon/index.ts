/**
  ## Overview

  In order to properly fetch and update data, EmberData
  needs to understand how to connect to your API.

  `Adapters` accept various kinds of requests from the store
  and manage fulfillment of the request from your API.

  ### Request Flow

  When the store decides it needs to issue a request it uses the
  following flow to manage the request and process the data.

  - find the appropriate adapter
  - issue the request to the adapter
  - await the adapter's response
    - if an error occurs reject with the error
    - if no error
      - if there is response data
        - pass the response data to the appropriate serializer
        - update the cache using the JSON:API formatted data from the serializer's response
      - return the primary record(s) associated with the request

  ### Request Errors

  When a request errors and your adapter does not have the ability to recover from the error,
  you may either reject the promise returned by your adapter method with the error or simply
  throw the error.

  If the request was for a `createRecord` `updateRecord` or `deleteRecord` special rules
  apply to how this error will affect the state of the store and additional properties on
  the `Error` class may be used. See the documentation for these methods in the
  `MinimumAdapterInterface` for more information.

  ### Implementing an Adapter

  There are seven required adapter methods, one for each of
  the primary request types that EmberData issues.

  They are:

  - findRecord
  - findAll
  - queryRecord
  - query
  - createRecord
  - updateRecord
  - deleteRecord

  Each of these request types has a matching store method that triggers it
  and matching `requestType` that is passed to the serializer's
  `normalizeResponse` method.

  If your app only reads data but never writes data, it is not necessary
  to implement the methods for create, update, and delete. This extends to
  all of the store's find methods with the exception of `findRecord` (`findAll`,
  `query`, `queryRecord`): if you do not use the store method in your app then
  your Adapter does not need the method.

  ```ts
  import EmberObject from '@ember/object';

  async function fetchData(url, options = {}) {
    let response = await fetch(url, options);
    return response.toJSON();
  }

  export default class ApplicationAdapter extends EmberObject {
    findRecord(_, { modelName }, id) {
      return fetchData(`./${modelName}s/${id}`);
    }
  }
  ```

  ### Adapter Resolution

  `store.adapterFor(name)` will lookup adapters defined in `app/adapters/` and
  return an instance.

  `adapterFor` first attempts to find an adapter with an exact match on `name`,
  then falls back to checking for the presence of an adapter named `application`.

  If no adapter is found, an error will be thrown.

  ```ts
  store.adapterFor('author');

  // lookup paths (in order) =>
  //   app/adapters/author.js
  //   app/adapters/application.js
  ```

  Most requests in EmberData are made with respect to a particular `type` (or `modelName`)
  (e.g., "get me the full collection of **books**" or "get me the **employee** whose id is 37"). We
  refer to this as the **primary** resource `type`.

  `adapterFor` is used by the store to find an adapter with a name matching that of the primary
  resource `type` for the request, which then falls back to the `application` adapter.

  It is recommended that applications define only a single `application` adapter and serializer
  where possible, only implementing an adapter specific to the `type` when absolutely necessary.

  If you need to support multiple API versions for the same type, the per-type strategy for
  defining adapters might not be adequate.

  If you have multiple APIs or multiple API versions and the single application adapter and per-type
  strategy does not suite your needs, one strategy is to write an `application` adapter and serializer
  that make use of `options` to specify the desired format when making a request, then forwards to the
  request to the desired adapter or serializer as needed.

  ```app/adapters/application.js
  export default class Adapter extends EmberObject {
    findRecord(store, schema, id, snapshot) {
      let { apiVersion } = snapshot.adapterOptions;
      return this.adapterFor(`-api-${apiVersion}`).findRecord(store, schema, id, snapshot);
    }
  }
  ```

  ### Using an Adapter

  Any adapter in `app/adapters/` can be looked up by `name` using `store.adapterFor(name)`.

  ### Default Adapters

  Applications whose API's structure endpoint URLs *very close to* or *exactly* the **REST**
  or **JSON:API** convention, the `@ember-data/adapter` package contains implementations
  these applications can extend.

  Many applications will find writing their own adapter to be allow greater flexibility,
  customization, and maintenance than attempting to override methods in these adapters.

  @module @ember-data/adapter
  @main @ember-data/adapter
*/

import EmberObject from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { Promise as RSVPPromise } from 'rsvp';

import type { Snapshot } from '@ember-data/store/-private';
import type Store from '@ember-data/store/-private/system/core-store';
import type ShimModelClass from '@ember-data/store/-private/system/model/shim-model-class';
import type SnapshotRecordArray from '@ember-data/store/-private/system/snapshot-record-array';
import type MinimumAdapterInterface from '@ember-data/store/-private/ts-interfaces/minimum-adapter-interface';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';

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

  @class Adapter
  @public
  @extends Ember.EmberObject
*/
export default class Adapter extends EmberObject implements MinimumAdapterInterface {
  declare _coalesceFindRequests: boolean;

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
    @public
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
    @public
  */
  findRecord(store: Store, type: ShimModelClass, id: string, snapshot: Snapshot): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a findRecord override');
    }

    return RSVPPromise.resolve();
  }

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
    @public
  */
  findAll(store: Store, type: ShimModelClass, neverSet, snapshotRecordArray: SnapshotRecordArray): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a findAll override');
    }

    return RSVPPromise.resolve();
  }

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
    @public
  */
  query(store: Store, type: ShimModelClass, query): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a query override');
    }

    return RSVPPromise.resolve();
  }

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
    @public
  */
  queryRecord(store: Store, type: ShimModelClass, query, adapterOptions): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a queryRecord override');
    }

    return RSVPPromise.resolve();
  }

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
    @public
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
    @public
  */
  serialize(snapshot, options): Dict<unknown> {
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
    @public
  */
  createRecord(store: Store, type: ShimModelClass, snapshot: Snapshot): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a createRecord override');
    }

    return RSVPPromise.resolve();
  }

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
    @public
  */
  updateRecord(store: Store, type: ShimModelClass, snapshot: Snapshot): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a updateRecord override');
    }

    return RSVPPromise.resolve();
  }

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
    @public
  */
  deleteRecord(store: Store, type: ShimModelClass, snapshot: Snapshot): Promise<unknown> {
    if (DEBUG) {
      throw new Error('You subclassed the Adapter class but missing a deleteRecord override');
    }

    return RSVPPromise.resolve();
  }

  /**
    By default the store will try to coalesce all `fetchRecord` calls within the same runloop
    into as few requests as possible by calling groupRecordsForFindMany and passing it into a findMany call.
    You can opt out of this behaviour by either not implementing the findMany hook or by setting
    coalesceFindRequests to false.

    @property coalesceFindRequests
    @public
    @type {boolean}
  */
  get coalesceFindRequests() {
    let coalesceFindRequests = this._coalesceFindRequests;
    if (typeof coalesceFindRequests === 'boolean') {
      return coalesceFindRequests;
    }
    return (this._coalesceFindRequests = true);
  }

  set coalesceFindRequests(value: boolean) {
    this._coalesceFindRequests = value;
  }

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
    @public
  */

  /**
    Organize records into groups, each of which is to be passed to separate
    calls to `findMany`.

    For example, if your API has nested URLs that depend on the parent, you will
    want to group records by their parent.

    The default implementation returns the records as a single group.

    @method groupRecordsForFindMany
    @public
    @param {Store} store
    @param {Array} snapshots
    @return {Array}  an array of arrays of records, each of which is to be
                      loaded separately by `findMany`.
  */
  groupRecordsForFindMany(store: Store, snapshots: Snapshot[]): Snapshot[][] {
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
    @public
  */
  shouldReloadRecord(store: Store, snapshot: Snapshot): boolean {
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
    @public
  */
  shouldReloadAll(store: Store, snapshotRecordArray: SnapshotRecordArray): boolean {
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
    @public
  */
  shouldBackgroundReloadRecord(store: Store, Snapshot): boolean {
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
    @public
  */
  shouldBackgroundReloadAll(store: Store, snapshotRecordArray: SnapshotRecordArray): boolean {
    return true;
  }
}

export { BuildURLMixin } from './-private';
