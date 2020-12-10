/**
  @module @ember-data/adapter
*/
import { dasherize } from '@ember/string';

import { pluralize } from 'ember-inflector';

import { serializeIntoHash } from './-private';
import RESTAdapter from './rest';

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;
type ConfidentDict<T> = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<T>;
type ShimModelClass = import('@ember-data/store/-private/system/model/shim-model-class').default;
type Store = import('@ember-data/store/-private/system/core-store').default;
type Snapshot = import('@ember-data/store/-private/system/snapshot').default;

/**
  The `JSONAPIAdapter` is the default adapter used by Ember Data. It
  is responsible for transforming the store's requests into HTTP
  requests that follow the [JSON API](http://jsonapi.org/format/)
  format.

  ## JSON API Conventions

  The JSONAPIAdapter uses JSON API conventions for building the URL
  for a record and selecting the HTTP verb to use with a request. The
  actions you can take on a record map onto the following URLs in the
  JSON API adapter:

<table>
  <tr>
    <th>
      Action
    </th>
    <th>
      HTTP Verb
    </th>
    <th>
      URL
    </th>
  </tr>
  <tr>
    <th>
      `store.findRecord('post', 123)`
    </th>
    <td>
      GET
    </td>
    <td>
      /posts/123
    </td>
  </tr>
  <tr>
    <th>
      `store.findAll('post')`
    </th>
    <td>
      GET
    </td>
    <td>
      /posts
    </td>
  </tr>
  <tr>
    <th>
      Update `postRecord.save()`
    </th>
    <td>
      PATCH
    </td>
    <td>
      /posts/123
    </td>
  </tr>
  <tr>
    <th>
      Create `store.createRecord('post').save()`
    </th>
    <td>
      POST
    </td>
    <td>
      /posts
    </td>
  </tr>
  <tr>
    <th>
      Delete `postRecord.destroyRecord()`
    </th>
    <td>
      DELETE
    </td>
    <td>
      /posts/123
    </td>
  </tr>
</table>

  ## Success and failure

  The JSONAPIAdapter will consider a success any response with a
  status code of the 2xx family ("Success"), as well as 304 ("Not
  Modified"). Any other status code will be considered a failure.

  On success, the request promise will be resolved with the full
  response payload.

  Failed responses with status code 422 ("Unprocessable Entity") will
  be considered "invalid". The response will be discarded, except for
  the `errors` key. The request promise will be rejected with a
  `InvalidError`. This error object will encapsulate the saved
  `errors` value.

  Any other status codes will be treated as an adapter error. The
  request promise will be rejected, similarly to the invalid case,
  but with an instance of `AdapterError` instead.

  ### Endpoint path customization

  Endpoint paths can be prefixed with a `namespace` by setting the
  namespace property on the adapter:

  ```app/adapters/application.js
  import JSONAPIAdapter from '@ember-data/adapter/json-api';

  export default class ApplicationAdapter extends JSONAPIAdapter {
    namespace = 'api/1';
  }
  ```
  Requests for the `person` model would now target `/api/1/people/1`.

  ### Host customization

  An adapter can target other hosts by setting the `host` property.

  ```app/adapters/application.js
  import JSONAPIAdapter from '@ember-data/adapter/json-api';

  export default class ApplicationAdapter extends JSONAPIAdapter {
    host = 'https://api.example.com';
  }
  ```

  Requests for the `person` model would now target
  `https://api.example.com/people/1`.

  @since 1.13.0
  @class JSONAPIAdapter
  @constructor
  @extends RESTAdapter
*/
class JSONAPIAdapter extends RESTAdapter {
  defaultSerializer = '-json-api';

  _defaultContentType = 'application/vnd.api+json';

  /**
    @method ajaxOptions
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} options
    @return {Object}
  */
  ajaxOptions(url: string, type: string, options: Dict<any> = {}): ConfidentDict<any> {
    let hash = super.ajaxOptions(url, type, options);

    hash.headers['Accept'] = hash.headers['Accept'] || 'application/vnd.api+json';

    return hash;
  }

  /**
    By default the JSONAPIAdapter will send each find request coming from a `store.find`
    or from accessing a relationship separately to the server. If your server supports passing
    ids as a query string, you can set coalesceFindRequests to true to coalesce all find requests
    within a single runloop.

    For example, if you have an initial payload of:

    ```javascript
    {
      data: {
        id: 1,
        type: 'post',
        relationship: {
          comments: {
            data: [
              { id: 1, type: 'comment' },
              { id: 2, type: 'comment' }
            ]
          }
        }
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
    GET /comments?filter[id]=1,2
    ```

    Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
    relationships accessed within the same runloop. If you set `coalesceFindRequests: true`

    ```javascript
    store.findRecord('comment', 1);
    store.findRecord('comment', 2);
    ```

    will also send a request to: `GET /comments?filter[id]=1,2`

    Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
    `groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.

    @property coalesceFindRequests
    @type {boolean}
  */
  coalesceFindRequests: boolean = false;

  findMany(store: Store, type: ShimModelClass, ids: string[], snapshots: Snapshot[]): Promise<unknown> {
    let url = this.buildURL(type.modelName, ids, snapshots, 'findMany');
    return this.ajax(url, 'GET', { data: { filter: { id: ids.join(',') } } });
  }

  pathForType(modelName): string {
    let dasherized = dasherize(modelName);
    return pluralize(dasherized);
  }

  updateRecord(store: Store, type: ShimModelClass, snapshot: Snapshot): Promise<unknown> {
    const data = serializeIntoHash(store, type, snapshot);

    let url = this.buildURL(type.modelName, snapshot.id, snapshot, 'updateRecord');

    return this.ajax(url, 'PATCH', { data: data });
  }
}

export default JSONAPIAdapter;
