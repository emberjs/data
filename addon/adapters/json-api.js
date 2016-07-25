/**
  @module ember-data
*/

import Ember from 'ember';
import RESTAdapter from "ember-data/adapters/rest";
import isEnabled from 'ember-data/-private/features';
import { deprecate } from 'ember-data/-private/debug';

/**
  @since 1.13.0
  @class JSONAPIAdapter
  @constructor
  @namespace DS
  @extends DS.RESTAdapter
*/
var JSONAPIAdapter = RESTAdapter.extend({
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

  /**
    @method findMany
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Array} ids
    @param {Array} snapshots
    @return {Promise} promise
  */
  findMany(store, type, ids, snapshots) {
    if (isEnabled('ds-improved-ajax') && !this._hasCustomizedAjax()) {
      return this._super(...arguments);
    } else {
      var url = this.buildURL(type.modelName, ids, snapshots, 'findMany');
      return this.ajax(url, 'GET', { data: { filter: { id: ids.join(',') } } });
    }
  },

  /**
    @method pathForType
    @param {String} modelName
    @return {String} path
  **/
  pathForType(modelName) {
    var dasherized = Ember.String.dasherize(modelName);
    return Ember.String.pluralize(dasherized);
  },

  // TODO: Remove this once we have a better way to override HTTP verbs.
  /**
    @method updateRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord(store, type, snapshot) {
    if (isEnabled('ds-improved-ajax') && !this._hasCustomizedAjax()) {
      return this._super(...arguments);
    } else {
      var data = {};
      var serializer = store.serializerFor(type.modelName);

      serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

      var id = snapshot.id;
      var url = this.buildURL(type.modelName, id, snapshot, 'updateRecord');

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
      const { requestType, ids } = params;

      if (requestType === 'findMany') {
        return {
          filter: { id: ids.join(',') }
        };
      }

      if (requestType === 'updateRecord') {
        const { store, type, snapshot } = params;
        const data = {};
        const serializer = store.serializerFor(type.modelName);

        serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

        return data;
      }

      return this._super(...arguments);
    },

    headersForRequest() {
      const headers = this._super(...arguments) || {};

      headers['Accept'] = 'application/vnd.api+json';

      return headers;
    },

    _requestToJQueryAjaxHash() {
      const hash = this._super(...arguments);

      if (hash.contentType) {
        hash.contentType = 'application/vnd.api+json';
      }

      return hash;
    }

  });

}

export default JSONAPIAdapter;
