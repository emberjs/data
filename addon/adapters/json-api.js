/* global heimdall */
/**
  @module ember-data
*/
import { dasherize } from '@ember/string';
import $ from 'jquery';
import RESTAdapter from "./rest";
import { isEnabled } from '../-private';
import { deprecate } from '@ember/debug';
import { instrument } from 'ember-data/-debug';
import { pluralize } from 'ember-inflector';

/**
  The `JSONAPIAdapter` is the default adapter used by Ember Data. It
  is responsible for transforming the store's requests into HTTP
  requests that follow the [JSON API](http://jsonapi.org/format/)
  format.

  ## JSON API Conventions

  The JSONAPIAdapter uses JSON API conventions for building the url
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
  `DS.InvalidError`. This error object will encapsulate the saved
  `errors` value.

  Any other status codes will be treated as an adapter error. The
  request promise will be rejected, similarly to the invalid case,
  but with an instance of `DS.AdapterError` instead.

  ### Endpoint path customization

  Endpoint paths can be prefixed with a `namespace` by setting the
  namespace property on the adapter:

  ```app/adapters/application.js
  import DS from 'ember-data';

  export default DS.JSONAPIAdapter.extend({
    namespace: 'api/1'
  });
  ```
  Requests for the `person` model would now target `/api/1/people/1`.

  ### Host customization

  An adapter can target other hosts by setting the `host` property.

  ```app/adapters/application.js
  import DS from 'ember-data';

  export default DS.JSONAPIAdapter.extend({
    host: 'https://api.example.com'
  });
  ```

  Requests for the `person` model would now target
  `https://api.example.com/people/1`.

  @since 1.13.0
  @class JSONAPIAdapter
  @constructor
  @namespace DS
  @extends DS.RESTAdapter
*/
const JSONAPIAdapter = RESTAdapter.extend({
  defaultSerializer: '-json-api',

  /**
    @method ajaxOptions
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} options
    @return {Object}
  */
  ajaxOptions(url, type, options) {
    let hash = this._super(...arguments);

    if (hash.contentType) {
      hash.contentType = 'application/vnd.api+json';
    }

    instrument(function() {
      hash.converters = {
        'text json': function(payload) {
          let token = heimdall.start('json.parse');
          let json;
          try {
            json = $.parseJSON(payload);
          } catch (e) {
            json = payload;
          }
          heimdall.stop(token);
          return json;
        }
      };
    });

    let beforeSend = hash.beforeSend;
    hash.beforeSend = function(xhr) {
      xhr.setRequestHeader('Accept', 'application/vnd.api+json');
      if (beforeSend) {
        beforeSend(xhr);
      }
    };

    return hash;
  },

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
  coalesceFindRequests: false,

  findMany(store, type, ids, snapshots) {
    if (isEnabled('ds-improved-ajax') && !this._hasCustomizedAjax()) {
      return this._super(...arguments);
    } else {
      let url = this.buildURL(type.modelName, ids, snapshots, 'findMany');
      return this.ajax(url, 'GET', { data: { filter: { id: ids.join(',') } } });
    }
  },

  pathForType(modelName) {
    let dasherized = dasherize(modelName);
    return pluralize(dasherized);
  },

  // TODO: Remove this once we have a better way to override HTTP verbs.
  updateRecord(store, type, snapshot) {
    if (isEnabled('ds-improved-ajax') && !this._hasCustomizedAjax()) {
      return this._super(...arguments);
    } else {
      let data = {};
      let serializer = store.serializerFor(type.modelName);

      serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

      let url = this.buildURL(type.modelName, snapshot.id, snapshot, 'updateRecord');

      return this.ajax(url, 'PATCH', { data: data });
    }
  },

  _hasCustomizedAjax() {
    if (this.ajax !== JSONAPIAdapter.prototype.ajax) {
      deprecate('JSONAPIAdapter#ajax has been deprecated please use. `methodForRequest`, `urlForRequest`, `headersForRequest` or `dataForRequest` instead.', false, {
        id: 'ds.json-api-adapter.ajax',
        until: '3.0.0'
      });
      return true;
    }

    if (this.ajaxOptions !== JSONAPIAdapter.prototype.ajaxOptions) {
      deprecate('JSONAPIAdapterr#ajaxOptions has been deprecated please use. `methodForRequest`, `urlForRequest`, `headersForRequest` or `dataForRequest` instead.', false, {
        id: 'ds.json-api-adapter.ajax-options',
        until: '3.0.0'
      });
      return true;
    }

    return false;
  }
});

if (isEnabled('ds-improved-ajax')) {

  JSONAPIAdapter.reopen({

    methodForRequest(params) {
      if (params.requestType === 'updateRecord') {
        return 'PATCH';
      }

      return this._super(...arguments);
    },

    dataForRequest(params) {
      let { requestType, ids } = params;

      if (requestType === 'findMany') {
        return {
          filter: { id: ids.join(',') }
        };
      }

      if (requestType === 'updateRecord') {
        let { store, type, snapshot } = params;
        let data = {};
        let serializer = store.serializerFor(type.modelName);

        serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

        return data;
      }

      return this._super(...arguments);
    },

    headersForRequest() {
      let headers = this._super(...arguments) || {};

      headers['Accept'] = 'application/vnd.api+json';

      return headers;
    },

    _requestToJQueryAjaxHash() {
      let hash = this._super(...arguments);

      if (hash.contentType) {
        hash.contentType = 'application/vnd.api+json';
      }

      return hash;
    }

  });

}

export default JSONAPIAdapter;
