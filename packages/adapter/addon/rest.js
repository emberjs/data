/* globals najax jQuery */

/**
  @module @ember-data/adapter
*/

import RSVP, { Promise as EmberPromise } from 'rsvp';
import { get, computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { run } from '@ember/runloop';
import Adapter, { BuildURLMixin } from '@ember-data/adapter';
import { assign } from '@ember/polyfills';
import { determineBodyPromise, fetch, parseResponseHeaders, serializeQueryParams } from './-private';
import AdapterError, {
  InvalidError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServerError,
  TimeoutError,
  AbortError,
} from '@ember-data/adapter/error';
import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { serializeIntoHash } from './-private';

const Promise = EmberPromise;
const hasJQuery = typeof jQuery !== 'undefined';
const hasNajax = typeof najax !== 'undefined';

/**
  The REST adapter allows your store to communicate with an HTTP server by
  transmitting JSON via XHR. Most Ember.js apps that consume a JSON API
  should use the REST adapter.

  This adapter is designed around the idea that the JSON exchanged with
  the server should be conventional.

  ## Success and failure

  The REST adapter will consider a success any response with a status code
  of the 2xx family ("Success"), as well as 304 ("Not Modified"). Any other
  status code will be considered a failure.

  On success, the request promise will be resolved with the full response
  payload.

  Failed responses with status code 422 ("Unprocessable Entity") will be
  considered "invalid". The response will be discarded, except for the
  `errors` key. The request promise will be rejected with a `InvalidError`.
  This error object will encapsulate the saved `errors` value.

  Any other status codes will be treated as an "adapter error". The request
  promise will be rejected, similarly to the "invalid" case, but with
  an instance of `AdapterError` instead.

  ## JSON Structure

  The REST adapter expects the JSON returned from your server to follow
  these conventions.

  ### Object Root

  The JSON payload should be an object that contains the record inside a
  root property. For example, in response to a `GET` request for
  `/posts/1`, the JSON should look like this:

  ```js
  {
    "posts": {
      "id": 1,
      "title": "I'm Running to Reform the W3C's Tag",
      "author": "Yehuda Katz"
    }
  }
  ```

  Similarly, in response to a `GET` request for `/posts`, the JSON should
  look like this:

  ```js
  {
    "posts": [
      {
        "id": 1,
        "title": "I'm Running to Reform the W3C's Tag",
        "author": "Yehuda Katz"
      },
      {
        "id": 2,
        "title": "Rails is omakase",
        "author": "D2H"
      }
    ]
  }
  ```

  Note that the object root can be pluralized for both a single-object response
  and an array response: the REST adapter is not strict on this. Further, if the
  HTTP server responds to a `GET` request to `/posts/1` (e.g. the response to a
  `findRecord` query) with more than one object in the array, Ember Data will
  only display the object with the matching ID.

  ### Conventional Names

  Attribute names in your JSON payload should be the camelCased versions of
  the attributes in your Ember.js models.

  For example, if you have a `Person` model:

  ```app/models/person.js
  import Model, { attr } from '@ember-data/model';

  export default Model.extend({
    firstName: attr('string'),
    lastName: attr('string'),
    occupation: attr('string')
  });
  ```

  The JSON returned should look like this:

  ```js
  {
    "people": {
      "id": 5,
      "firstName": "Zaphod",
      "lastName": "Beeblebrox",
      "occupation": "President"
    }
  }
  ```

  #### Relationships

  Relationships are usually represented by ids to the record in the
  relationship. The related records can then be sideloaded in the
  response under a key for the type.

  ```js
  {
    "posts": {
      "id": 5,
      "title": "I'm Running to Reform the W3C's Tag",
      "author": "Yehuda Katz",
      "comments": [1, 2]
    },
    "comments": [{
      "id": 1,
      "author": "User 1",
      "message": "First!",
    }, {
      "id": 2,
      "author": "User 2",
      "message": "Good Luck!",
    }]
  }
  ```

  If the records in the relationship are not known when the response
  is serialized it's also possible to represent the relationship as a
  URL using the `links` key in the response. Ember Data will fetch
  this URL to resolve the relationship when it is accessed for the
  first time.

  ```js
  {
    "posts": {
      "id": 5,
      "title": "I'm Running to Reform the W3C's Tag",
      "author": "Yehuda Katz",
      "links": {
        "comments": "/posts/5/comments"
      }
    }
  }
  ```

  ### Errors

  If a response is considered a failure, the JSON payload is expected to include
  a top-level key `errors`, detailing any specific issues. For example:

  ```js
  {
    "errors": {
      "msg": "Something went wrong"
    }
  }
  ```

  This adapter does not make any assumptions as to the format of the `errors`
  object. It will simply be passed along as is, wrapped in an instance
  of `InvalidError` or `AdapterError`. The serializer can interpret it
  afterwards.

  ## Customization

  ### Endpoint path customization

  Endpoint paths can be prefixed with a `namespace` by setting the namespace
  property on the adapter:

  ```app/adapters/application.js
  import RESTAdapter from '@ember-data/adapter/rest';

  export default RESTAdapter.extend({
    namespace: 'api/1'
  });
  ```
  Requests for the `Person` model would now target `/api/1/people/1`.

  ### Host customization

  An adapter can target other hosts by setting the `host` property.

  ```app/adapters/application.js
  import RESTAdapter from '@ember-data/adapter/rest';

  export default RESTAdapter.extend({
    host: 'https://api.example.com'
  });
  ```

  ### Headers customization

  Some APIs require HTTP headers, e.g. to provide an API key. Arbitrary
  headers can be set as key/value pairs on the `RESTAdapter`'s `headers`
  object and Ember Data will send them along with each ajax request.


  ```app/adapters/application.js
  import RESTAdapter from '@ember-data/adapter/rest';
  import { computed } from '@ember/object';

  export default RESTAdapter.extend({
    headers: computed(function() {
      return {
        'API_KEY': 'secret key',
        'ANOTHER_HEADER': 'Some header value'
      };
    }
  });
  ```

  `headers` can also be used as a computed property to support dynamic
  headers. In the example below, the `session` object has been
  injected into an adapter by Ember's container.

  ```app/adapters/application.js
  import RESTAdapter from '@ember-data/adapter/rest';
  import { computed } from '@ember/object';

  export default RESTAdapter.extend({
    headers: computed('session.authToken', function() {
      return {
        'API_KEY': this.get('session.authToken'),
        'ANOTHER_HEADER': 'Some header value'
      };
    })
  });
  ```

  In some cases, your dynamic headers may require data from some
  object outside of Ember's observer system (for example
  `document.cookie`). You can use the
  [volatile](/api/classes/Ember.ComputedProperty.html#method_volatile)
  function to set the property into a non-cached mode causing the headers to
  be recomputed with every request.

  ```app/adapters/application.js
  import RESTAdapter from '@ember-data/adapter/rest';
  import { get } from '@ember/object';
  import { computed } from '@ember/object';

  export default RESTAdapter.extend({
    headers: computed(function() {
      return {
        'API_KEY': get(document.cookie.match(/apiKey\=([^;]*)/), '1'),
        'ANOTHER_HEADER': 'Some header value'
      };
    }).volatile()
  });
  ```

  @class RESTAdapter
  @constructor
  @extends Adapter
  @uses BuildURLMixin
*/
const RESTAdapter = Adapter.extend(BuildURLMixin, {
  defaultSerializer: '-rest',

  fastboot: computed(function() {
    return getOwner(this).lookup('service:fastboot');
  }),

  useFetch: computed(function() {
    let ENV = getOwner(this).resolveRegistration('config:environment');
    // TODO: https://github.com/emberjs/data/issues/6093
    let jQueryIntegrationDisabled = ENV && ENV.EmberENV && ENV.EmberENV._JQUERY_INTEGRATION === false;

    if (jQueryIntegrationDisabled) {
      return true;
    } else if (hasNajax || hasJQuery) {
      return false;
    } else {
      return true;
    }
  }),

  /**
    By default, the RESTAdapter will send the query params sorted alphabetically to the
    server.

    For example:

    ```js
    store.query('posts', { sort: 'price', category: 'pets' });
    ```

    will generate a requests like this `/posts?category=pets&sort=price`, even if the
    parameters were specified in a different order.

    That way the generated URL will be deterministic and that simplifies caching mechanisms
    in the backend.

    Setting `sortQueryParams` to a falsey value will respect the original order.

    In case you want to sort the query parameters with a different criteria, set
    `sortQueryParams` to your custom sort function.

    ```app/adapters/application.js
    import RESTAdapter from '@ember-data/adapter/rest';

    export default RESTAdapter.extend({
      sortQueryParams(params) {
        let sortedKeys = Object.keys(params).sort().reverse();
        let len = sortedKeys.length, newParams = {};

        for (let i = 0; i < len; i++) {
          newParams[sortedKeys[i]] = params[sortedKeys[i]];
        }

        return newParams;
      }
    });
    ```

    @method sortQueryParams
    @param {Object} obj
    @return {Object}
  */
  sortQueryParams(obj) {
    let keys = Object.keys(obj);
    let len = keys.length;
    if (len < 2) {
      return obj;
    }
    let newQueryParams = {};
    let sortedKeys = keys.sort();

    for (let i = 0; i < len; i++) {
      newQueryParams[sortedKeys[i]] = obj[sortedKeys[i]];
    }
    return newQueryParams;
  },

  /**
    By default the RESTAdapter will send each find request coming from a `store.find`
    or from accessing a relationship separately to the server. If your server supports passing
    ids as a query string, you can set coalesceFindRequests to true to coalesce all find requests
    within a single runloop.

    For example, if you have an initial payload of:

    ```javascript
    {
      post: {
        id: 1,
        comments: [1, 2]
      }
    }
    ```

    By default calling `post.get('comments')` will trigger the following requests(assuming the
    comments haven't been loaded before):

    ```
    GET /comments/1
    GET /comments/2
    ```

    If you set coalesceFindRequests to `true` it will instead trigger the following request:

    ```
    GET /comments?ids[]=1&ids[]=2
    ```

    Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
    relationships accessed within the same runloop. If you set `coalesceFindRequests: true`

    ```javascript
    store.findRecord('comment', 1);
    store.findRecord('comment', 2);
    ```

    will also send a request to: `GET /comments?ids[]=1&ids[]=2`

    Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
    `groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.

    @property coalesceFindRequests
    @type {boolean}
  */
  coalesceFindRequests: false,

  /**
    Endpoint paths can be prefixed with a `namespace` by setting the namespace
    property on the adapter:

    ```app/adapters/application.js
    import RESTAdapter from '@ember-data/adapter/rest';

    export default RESTAdapter.extend({
      namespace: 'api/1'
    });
    ```

    Requests for the `Post` model would now target `/api/1/post/`.

    @property namespace
    @type {String}
  */

  /**
    An adapter can target other hosts by setting the `host` property.

    ```app/adapters/application.js
    import RESTAdapter from '@ember-data/adapter/rest';

    export default RESTAdapter.extend({
      host: 'https://api.example.com'
    });
    ```

    Requests for the `Post` model would now target `https://api.example.com/post/`.

    @property host
    @type {String}
  */

  /**
    Some APIs require HTTP headers, e.g. to provide an API
    key. Arbitrary headers can be set as key/value pairs on the
    `RESTAdapter`'s `headers` object and Ember Data will send them
    along with each ajax request. For dynamic headers see [headers
    customization](/api/data/classes/DS.RESTAdapter.html).

    ```app/adapters/application.js
    import RESTAdapter from '@ember-data/adapter/rest';
    import { computed } from '@ember/object';

    export default RESTAdapter.extend({
      headers: computed(function() {
        return {
          'API_KEY': 'secret key',
          'ANOTHER_HEADER': 'Some header value'
        };
      })
    });
    ```

    @property headers
    @type {Object}
   */

  /**
    Called by the store in order to fetch the JSON for a given
    type and ID.

    The `findRecord` method makes an Ajax request to a URL computed by
    `buildURL`, and returns a promise for the resulting payload.

    This method performs an HTTP `GET` request with the id provided as part of the query string.

    @since 1.13.0
    @method findRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {String} id
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  findRecord(store, type, id, snapshot) {
    let url = this.buildURL(type.modelName, id, snapshot, 'findRecord');
    let query = this.buildQuery(snapshot);

    return this.ajax(url, 'GET', { data: query });
  },

  /**
    Called by the store in order to fetch a JSON array for all
    of the records for a given type.

    The `findAll` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method findAll
    @param {DS.Store} store
    @param {DS.Model} type
    @param {undefined} neverSet a value is never provided to this argument
    @param {DS.SnapshotRecordArray} snapshotRecordArray
    @return {Promise} promise
  */
  findAll(store, type, sinceToken, snapshotRecordArray) {
    let query = this.buildQuery(snapshotRecordArray);
    let url = this.buildURL(type.modelName, null, snapshotRecordArray, 'findAll');

    if (sinceToken) {
      query.since = sinceToken;
    }

    return this.ajax(url, 'GET', { data: query });
  },

  /**
    Called by the store in order to fetch a JSON array for
    the records that match a particular query.

    The `query` method makes an Ajax (HTTP GET) request to a URL
    computed by `buildURL`, and returns a promise for the resulting
    payload.

    The `query` argument is a simple JavaScript object that will be passed directly
    to the server as parameters.

    @method query
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Object} query
    @return {Promise} promise
  */
  query(store, type, query) {
    let url = this.buildURL(type.modelName, null, null, 'query', query);

    if (this.sortQueryParams) {
      query = this.sortQueryParams(query);
    }

    return this.ajax(url, 'GET', { data: query });
  },

  /**
    Called by the store in order to fetch a JSON object for
    the record that matches a particular query.

    The `queryRecord` method makes an Ajax (HTTP GET) request to a URL
    computed by `buildURL`, and returns a promise for the resulting
    payload.

    The `query` argument is a simple JavaScript object that will be passed directly
    to the server as parameters.

    @since 1.13.0
    @method queryRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Object} query
    @return {Promise} promise
  */
  queryRecord(store, type, query) {
    let url = this.buildURL(type.modelName, null, null, 'queryRecord', query);

    if (this.sortQueryParams) {
      query = this.sortQueryParams(query);
    }

    return this.ajax(url, 'GET', { data: query });
  },

  /**
    Called by the store in order to fetch several records together if `coalesceFindRequests` is true

    For example, if the original payload looks like:

    ```js
    {
      "id": 1,
      "title": "Rails is omakase",
      "comments": [ 1, 2, 3 ]
    }
    ```

    The IDs will be passed as a URL-encoded Array of IDs, in this form:

    ```
    ids[]=1&ids[]=2&ids[]=3
    ```

    Many servers, such as Rails and PHP, will automatically convert this URL-encoded array
    into an Array for you on the server-side. If you want to encode the
    IDs, differently, just override this (one-line) method.

    The `findMany` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method findMany
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Array} ids
    @param {Array} snapshots
    @return {Promise} promise
  */
  findMany(store, type, ids, snapshots) {
    let url = this.buildURL(type.modelName, ids, snapshots, 'findMany');
    return this.ajax(url, 'GET', { data: { ids: ids } });
  },

  /**
    Called by the store in order to fetch a JSON array for
    the unloaded records in a has-many relationship that were originally
    specified as a URL (inside of `links`).

    For example, if your original payload looks like this:

    ```js
    {
      "post": {
        "id": 1,
        "title": "Rails is omakase",
        "links": { "comments": "/posts/1/comments" }
      }
    }
    ```

    This method will be called with the parent record and `/posts/1/comments`.

    The `findHasMany` method will make an Ajax (HTTP GET) request to the originally specified URL.

    The format of your `links` value will influence the final request URL via the `urlPrefix` method:

    * Links beginning with `//`, `http://`, `https://`, will be used as is, with no further manipulation.

    * Links beginning with a single `/` will have the current adapter's `host` value prepended to it.

    * Links with no beginning `/` will have a parentURL prepended to it, via the current adapter's `buildURL`.

    @method findHasMany
    @param {DS.Store} store
    @param {DS.Snapshot} snapshot
    @param {String} url
    @param {Object} relationship meta object describing the relationship
    @return {Promise} promise
  */
  findHasMany(store, snapshot, url, relationship) {
    let id = snapshot.id;
    let type = snapshot.modelName;

    url = this.urlPrefix(url, this.buildURL(type, id, snapshot, 'findHasMany'));

    return this.ajax(url, 'GET');
  },

  /**
    Called by the store in order to fetch the JSON for the unloaded record in a
    belongs-to relationship that was originally specified as a URL (inside of
    `links`).

    For example, if your original payload looks like this:

    ```js
    {
      "person": {
        "id": 1,
        "name": "Tom Dale",
        "links": { "group": "/people/1/group" }
      }
    }
    ```

    This method will be called with the parent record and `/people/1/group`.

    The `findBelongsTo` method will make an Ajax (HTTP GET) request to the originally specified URL.

    The format of your `links` value will influence the final request URL via the `urlPrefix` method:

    * Links beginning with `//`, `http://`, `https://`, will be used as is, with no further manipulation.

    * Links beginning with a single `/` will have the current adapter's `host` value prepended to it.

    * Links with no beginning `/` will have a parentURL prepended to it, via the current adapter's `buildURL`.

    @method findBelongsTo
    @param {DS.Store} store
    @param {DS.Snapshot} snapshot
    @param {String} url
    @param {Object} relationship meta object describing the relationship
    @return {Promise} promise
  */
  findBelongsTo(store, snapshot, url, relationship) {
    let id = snapshot.id;
    let type = snapshot.modelName;

    url = this.urlPrefix(url, this.buildURL(type, id, snapshot, 'findBelongsTo'));
    return this.ajax(url, 'GET');
  },

  /**
    Called by the store when a newly created record is
    saved via the `save` method on a model record instance.

    The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
    to a URL computed by `buildURL`.

    See `serialize` for information on how to customize the serialized form
    of a record.

    @method createRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  createRecord(store, type, snapshot) {
    let url = this.buildURL(type.modelName, null, snapshot, 'createRecord');

    const data = serializeIntoHash(store, type, snapshot);

    return this.ajax(url, 'POST', { data });
  },

  /**
    Called by the store when an existing record is saved
    via the `save` method on a model record instance.

    The `updateRecord` method serializes the record and makes an Ajax (HTTP PUT) request
    to a URL computed by `buildURL`.

    See `serialize` for information on how to customize the serialized form
    of a record.

    @method updateRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord(store, type, snapshot) {
    const data = serializeIntoHash(store, type, snapshot, {});

    let id = snapshot.id;
    let url = this.buildURL(type.modelName, id, snapshot, 'updateRecord');

    return this.ajax(url, 'PUT', { data });
  },

  /**
    Called by the store when a record is deleted.

    The `deleteRecord` method  makes an Ajax (HTTP DELETE) request to a URL computed by `buildURL`.

    @method deleteRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  deleteRecord(store, type, snapshot) {
    let id = snapshot.id;

    return this.ajax(this.buildURL(type.modelName, id, snapshot, 'deleteRecord'), 'DELETE');
  },

  _stripIDFromURL(store, snapshot) {
    let url = this.buildURL(snapshot.modelName, snapshot.id, snapshot);

    let expandedURL = url.split('/');
    // Case when the url is of the format ...something/:id
    // We are decodeURIComponent-ing the lastSegment because if it represents
    // the id, it has been encodeURIComponent-ified within `buildURL`. If we
    // don't do this, then records with id having special characters are not
    // coalesced correctly (see GH #4190 for the reported bug)
    let lastSegment = expandedURL[expandedURL.length - 1];
    let id = snapshot.id;
    if (decodeURIComponent(lastSegment) === id) {
      expandedURL[expandedURL.length - 1] = '';
    } else if (endsWith(lastSegment, '?id=' + id)) {
      //Case when the url is of the format ...something?id=:id
      expandedURL[expandedURL.length - 1] = lastSegment.substring(0, lastSegment.length - id.length - 1);
    }

    return expandedURL.join('/');
  },

  // http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
  maxURLLength: 2048,

  /**
    Organize records into groups, each of which is to be passed to separate
    calls to `findMany`.

    This implementation groups together records that have the same base URL but
    differing ids. For example `/comments/1` and `/comments/2` will be grouped together
    because we know findMany can coalesce them together as `/comments?ids[]=1&ids[]=2`

    It also supports urls where ids are passed as a query param, such as `/comments?id=1`
    but not those where there is more than 1 query param such as `/comments?id=2&name=David`
    Currently only the query param of `id` is supported. If you need to support others, please
    override this or the `_stripIDFromURL` method.

    It does not group records that have differing base urls, such as for example: `/posts/1/comments/2`
    and `/posts/2/comments/3`

    @method groupRecordsForFindMany
    @param {DS.Store} store
    @param {Array} snapshots
    @return {Array}  an array of arrays of records, each of which is to be
                      loaded separately by `findMany`.
  */
  groupRecordsForFindMany(store, snapshots) {
    let groups = new Map();
    let adapter = this;
    let maxURLLength = this.maxURLLength;

    snapshots.forEach(snapshot => {
      let baseUrl = adapter._stripIDFromURL(store, snapshot);
      if (!groups.has(baseUrl)) {
        groups.set(baseUrl, []);
      }

      groups.get(baseUrl).push(snapshot);
    });

    function splitGroupToFitInUrl(group, maxURLLength, paramNameLength) {
      let idsSize = 0;
      let baseUrl = adapter._stripIDFromURL(store, group[0]);
      let splitGroups = [[]];

      group.forEach(snapshot => {
        let additionalLength = encodeURIComponent(snapshot.id).length + paramNameLength;
        if (baseUrl.length + idsSize + additionalLength >= maxURLLength) {
          idsSize = 0;
          splitGroups.push([]);
        }

        idsSize += additionalLength;

        let lastGroupIndex = splitGroups.length - 1;
        splitGroups[lastGroupIndex].push(snapshot);
      });

      return splitGroups;
    }

    let groupsArray = [];
    groups.forEach((group, key) => {
      let paramNameLength = '&ids%5B%5D='.length;
      let splitGroups = splitGroupToFitInUrl(group, maxURLLength, paramNameLength);

      splitGroups.forEach(splitGroup => groupsArray.push(splitGroup));
    });

    return groupsArray;
  },

  /**
    Takes an ajax response, and returns the json payload or an error.

    By default this hook just returns the json payload passed to it.
    You might want to override it in two cases:

    1. Your API might return useful results in the response headers.
    Response headers are passed in as the second argument.

    2. Your API might return errors as successful responses with status code
    200 and an Errors text or object. You can return a `InvalidError` or a
    `AdapterError` (or a sub class) from this hook and it will automatically
    reject the promise and put your record into the invalid or error state.

    Returning a `InvalidError` from this method will cause the
    record to transition into the `invalid` state and make the
    `errors` object available on the record. When returning an
    `InvalidError` the store will attempt to normalize the error data
    returned from the server using the serializer's `extractErrors`
    method.

    @since 1.13.0
    @method handleResponse
    @param  {Number} status
    @param  {Object} headers
    @param  {Object} payload
    @param  {Object} requestData - the original request information
    @return {Object | DS.AdapterError} response
  */
  handleResponse(status, headers, payload, requestData) {
    if (this.isSuccess(status, headers, payload)) {
      return payload;
    } else if (this.isInvalid(status, headers, payload)) {
      return new InvalidError(payload.errors);
    }

    let errors = this.normalizeErrorResponse(status, headers, payload);
    let detailedMessage = this.generatedDetailedMessage(status, headers, payload, requestData);

    switch (status) {
      case 401:
        return new UnauthorizedError(errors, detailedMessage);
      case 403:
        return new ForbiddenError(errors, detailedMessage);
      case 404:
        return new NotFoundError(errors, detailedMessage);
      case 409:
        return new ConflictError(errors, detailedMessage);
      default:
        if (status >= 500) {
          return new ServerError(errors, detailedMessage);
        }
    }

    return new AdapterError(errors, detailedMessage);
  },

  /**
    Default `handleResponse` implementation uses this hook to decide if the
    response is a success.

    @since 1.13.0
    @method isSuccess
    @param  {Number} status
    @param  {Object} headers
    @param  {Object} payload
    @return {Boolean}
  */
  isSuccess(status, headers, payload) {
    return (status >= 200 && status < 300) || status === 304;
  },

  /**
    Default `handleResponse` implementation uses this hook to decide if the
    response is an invalid error.

    @since 1.13.0
    @method isInvalid
    @param  {Number} status
    @param  {Object} headers
    @param  {Object} payload
    @return {Boolean}
  */
  isInvalid(status, headers, payload) {
    return status === 422;
  },

  /**
    Takes a URL, an HTTP method and a hash of data, and makes an
    HTTP request.

    When the server responds with a payload, Ember Data will call into `extractSingle`
    or `extractArray` (depending on whether the original query was for one record or
    many records).

    By default, `ajax` method has the following behavior:

    * It sets the response `dataType` to `"json"`
    * If the HTTP method is not `"GET"`, it sets the `Content-Type` to be
      `application/json; charset=utf-8`
    * If the HTTP method is not `"GET"`, it stringifies the data passed in. The
      data is the serialized record in the case of a save.
    * Registers success and failure handlers.

    @method ajax
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} options
    @return {Promise} promise
  */
  ajax(url, type, options) {
    let adapter = this;
    let useFetch = get(this, 'useFetch');

    let requestData = {
      url: url,
      method: type,
    };
    let hash = adapter.ajaxOptions(url, type, options);

    if (useFetch) {
      return this._fetchRequest(hash)
        .then(response => {
          return RSVP.hash({
            response,
            payload: determineBodyPromise(response, requestData),
          });
        })
        .then(({ response, payload }) => {
          if (response.ok) {
            return fetchSuccessHandler(adapter, payload, response, requestData);
          } else {
            throw fetchErrorHandler(adapter, payload, response, null, requestData);
          }
        });
    }

    return new Promise(function(resolve, reject) {
      hash.success = function(payload, textStatus, jqXHR) {
        let response = ajaxSuccessHandler(adapter, payload, jqXHR, requestData);
        run.join(null, resolve, response);
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        let error = ajaxErrorHandler(adapter, jqXHR, errorThrown, requestData);
        run.join(null, reject, error);
      };

      adapter._ajax(hash);
    }, 'DS: RESTAdapter#ajax ' + type + ' to ' + url);
  },

  /**
    @method _ajaxRequest
    @private
    @param {Object} options jQuery ajax options to be used for the ajax request
  */
  _ajaxRequest(options) {
    jQuery.ajax(options);
  },

  /**
    @method _najaxRequest
    @private
    @param {Object} options jQuery ajax options to be used for the najax request
  */
  _najaxRequest(options) {
    if (hasNajax) {
      najax(options);
    } else {
      throw new Error(
        'najax does not seem to be defined in your app. Did you override it via `addOrOverrideSandboxGlobals` in the fastboot server?'
      );
    }
  },

  _fetchRequest(options) {
    let fetchFunction = fetch();

    if (fetchFunction) {
      return fetchFunction(options.url, options);
    } else {
      throw new Error(
        'cannot find the `fetch` module or the `fetch` global. Did you mean to install the `ember-fetch` addon?'
      );
    }
  },

  _ajax(options) {
    if (get(this, 'useFetch')) {
      this._fetchRequest(options);
    } else if (get(this, 'fastboot.isFastBoot')) {
      this._najaxRequest(options);
    } else {
      this._ajaxRequest(options);
    }
  },

  /**
    @method ajaxOptions
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} options
    @return {Object}
  */
  ajaxOptions(url, method, options) {
    options = assign(
      {
        url,
        method,
        type: method,
      },
      options
    );

    let headers = get(this, 'headers');
    if (headers !== undefined) {
      options.headers = assign({}, options.headers, headers);
    } else if (!options.headers) {
      options.headers = {};
    }

    if (options.data && options.type !== 'GET') {
      let contentType = options.contentType || 'application/json; charset=utf-8';
      options.headers['content-type'] = contentType;
    }

    if (get(this, 'useFetch')) {
      options = fetchOptions(options, this);
    } else {
      options = ajaxOptions(options, this);
    }

    options.url = this._ajaxURL(options.url);

    return options;
  },

  _ajaxURL(url) {
    if (get(this, 'fastboot.isFastBoot')) {
      let httpRegex = /^https?:\/\//;
      let protocolRelativeRegex = /^\/\//;
      let protocol = get(this, 'fastboot.request.protocol');
      let host = get(this, 'fastboot.request.host');

      if (protocolRelativeRegex.test(url)) {
        return `${protocol}${url}`;
      } else if (!httpRegex.test(url)) {
        try {
          return `${protocol}//${host}${url}`;
        } catch (fbError) {
          throw new Error(
            'You are using Ember Data with no host defined in your adapter. This will attempt to use the host of the FastBoot request, which is not configured for the current host of this request. Please set the hostWhitelist property for in your environment.js. FastBoot Error: ' +
              fbError.message
          );
        }
      }
    }

    return url;
  },

  /**
    @method parseErrorResponse
    @private
    @param {String} responseText
    @return {Object}
  */
  parseErrorResponse(responseText) {
    let json = responseText;

    try {
      json = JSON.parse(responseText);
    } catch (e) {
      // ignored
    }

    return json;
  },

  /**
    @method normalizeErrorResponse
    @private
    @param  {Number} status
    @param  {Object} headers
    @param  {Object} payload
    @return {Array} errors payload
  */
  normalizeErrorResponse(status, headers, payload) {
    if (payload && typeof payload === 'object' && payload.errors) {
      return payload.errors;
    } else {
      return [
        {
          status: `${status}`,
          title: 'The backend responded with an error',
          detail: `${payload}`,
        },
      ];
    }
  },

  /**
    Generates a detailed ("friendly") error message, with plenty
    of information for debugging (good luck!)

    @method generatedDetailedMessage
    @private
    @param  {Number} status
    @param  {Object} headers
    @param  {Object} payload
    @param  {Object} requestData
    @return {String} detailed error message
  */
  generatedDetailedMessage: function(status, headers, payload, requestData) {
    let shortenedPayload;
    let payloadContentType = headers['content-type'] || 'Empty Content-Type';

    if (payloadContentType === 'text/html' && payload.length > 250) {
      shortenedPayload = '[Omitted Lengthy HTML]';
    } else {
      shortenedPayload = payload;
    }

    let requestDescription = requestData.method + ' ' + requestData.url;
    let payloadDescription = 'Payload (' + payloadContentType + ')';

    return [
      'Ember Data Request ' + requestDescription + ' returned a ' + status,
      payloadDescription,
      shortenedPayload,
    ].join('\n');
  },

  // @since 2.5.0
  buildQuery(snapshot) {
    let query = {};

    if (snapshot) {
      let { include } = snapshot;

      if (include) {
        query.include = include;
      }
    }

    return query;
  },
});

function ajaxSuccess(adapter, payload, requestData, responseData) {
  let response;
  try {
    response = adapter.handleResponse(responseData.status, responseData.headers, payload, requestData);
  } catch (error) {
    return Promise.reject(error);
  }

  if (response && response.isAdapterError) {
    return Promise.reject(response);
  } else {
    return response;
  }
}

function ajaxError(adapter, payload, requestData, responseData) {
  if (DEBUG) {
    let message = `The server returned an empty string for ${requestData.method} ${requestData.url}, which cannot be parsed into a valid JSON. Return either null or {}.`;
    let validJSONString = !(responseData.textStatus === 'parsererror' && payload === '');
    warn(message, validJSONString, {
      id: 'ds.adapter.returned-empty-string-as-JSON',
    });
  }

  let error;

  if (responseData.errorThrown instanceof Error) {
    error = responseData.errorThrown;
  } else if (responseData.textStatus === 'timeout') {
    error = new TimeoutError();
  } else if (responseData.textStatus === 'abort' || responseData.status === 0) {
    error = handleAbort(requestData, responseData);
  } else {
    try {
      error = adapter.handleResponse(
        responseData.status,
        responseData.headers,
        payload || responseData.errorThrown,
        requestData
      );
    } catch (e) {
      error = e;
    }
  }

  return error;
}

// Adapter abort error to include any relevent info, e.g. request/response:
function handleAbort(requestData, responseData) {
  let { method, url, errorThrown } = requestData;
  let { status } = responseData;
  let msg = `Request failed: ${method} ${url} ${errorThrown || ''}`;
  let errors = [{ title: 'Adapter Error', detail: msg.trim(), status }];
  return new AbortError(errors);
}

//From http://stackoverflow.com/questions/280634/endswith-in-javascript
function endsWith(string, suffix) {
  if (typeof String.prototype.endsWith !== 'function') {
    return string.indexOf(suffix, string.length - suffix.length) !== -1;
  } else {
    return string.endsWith(suffix);
  }
}

function fetchSuccessHandler(adapter, payload, response, requestData) {
  let responseData = fetchResponseData(response);
  return ajaxSuccess(adapter, payload, requestData, responseData);
}

function fetchErrorHandler(adapter, payload, response, errorThrown, requestData) {
  let responseData = fetchResponseData(response);
  responseData.errorThrown = errorThrown;
  return ajaxError(adapter, payload, requestData, responseData);
}

function ajaxSuccessHandler(adapter, payload, jqXHR, requestData) {
  let responseData = ajaxResponseData(jqXHR);
  return ajaxSuccess(adapter, payload, requestData, responseData);
}

function ajaxErrorHandler(adapter, jqXHR, errorThrown, requestData) {
  let responseData = ajaxResponseData(jqXHR);
  responseData.errorThrown = errorThrown;
  let payload = adapter.parseErrorResponse(jqXHR.responseText);
  return ajaxError(adapter, payload, requestData, responseData);
}

function fetchResponseData(response) {
  return {
    status: response.status,
    textStatus: response.textStatus,
    headers: headersToObject(response.headers),
  };
}

function ajaxResponseData(jqXHR) {
  return {
    status: jqXHR.status,
    textStatus: jqXHR.statusText,
    headers: parseResponseHeaders(jqXHR.getAllResponseHeaders()),
  };
}

function headersToObject(headers) {
  let headersObject = {};

  if (headers) {
    headers.forEach((value, key) => (headersObject[key] = value));
  }

  return headersObject;
}

/**
 * Helper function that translates the options passed to `jQuery.ajax` into a format that `fetch` expects.
 * @param {Object} _options
 * @param {DS.Adapter} adapter
 * @returns {Object}
 */
export function fetchOptions(options, adapter) {
  options.credentials = 'same-origin';

  if (options.data) {
    // GET and HEAD requests can't have a `body`
    if (options.method === 'GET' || options.method === 'HEAD') {
      // If no options are passed, Ember Data sets `data` to an empty object, which we test for.
      if (Object.keys(options.data).length) {
        // Test if there are already query params in the url (mimics jQuey.ajax).
        const queryParamDelimiter = options.url.indexOf('?') > -1 ? '&' : '?';
        options.url += `${queryParamDelimiter}${serializeQueryParams(options.data)}`;
      }
    } else {
      // NOTE: a request's body cannot be an object, so we stringify it if it is.
      // JSON.stringify removes keys with values of `undefined` (mimics jQuery.ajax).
      options.body = JSON.stringify(options.data);
    }
  }

  return options;
}

function ajaxOptions(options, adapter) {
  options.dataType = 'json';
  options.context = adapter;

  if (options.data && options.type !== 'GET') {
    options.data = JSON.stringify(options.data);
    options.contentType = 'application/json; charset=utf-8';
  }

  options.beforeSend = function(xhr) {
    Object.keys(options.headers).forEach(key => xhr.setRequestHeader(key, options.headers[key]));
  };

  return options;
}

export default RESTAdapter;
