/**
  @module ember-data
*/

import RESTAdapter from "ember-data/adapters/rest-adapter";

/**
  @class JSONAPIAdapter
  @constructor
  @namespace DS
  @extends DS.RESTAdapter
*/
export default RESTAdapter.extend({
  defaultSerializer: '-json-api',

  /**
    @method ajaxOptions
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} options
    @return {Object}
  */
  ajaxOptions: function(url, type, options) {
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
    @method findMany
    @param {DS.Store} store
    @param {DS.Model} type
    @param {Array} ids
    @param {Array} snapshots
    @return {Promise} promise
  */
  findMany: function(store, type, ids, snapshots) {
    var url = this.buildURL(type.modelName, ids, snapshots, 'findMany');
    return this.ajax(url, 'GET', { data: { filter: { id: ids.join(',') } } });
  },

  /**
    @method pathForType
    @param {String} modelName
    @return {String} path
  **/
  pathForType: function(modelName) {
    var dasherized = Ember.String.dasherize(modelName);
    return Ember.String.pluralize(dasherized);
  },

  /**
    By default the JSONAPIAdapter will send each find request coming from a `store.find`
    or from accessing a relationship separately to the server. If your server supports passing
    ids as a query string, you can set coalesceFindRequests to true to coalesce all find requests
    within a single runloop.
<<<<<<< HEAD

    For example, if you have an initial payload of:

=======
    
    For example, if you have an initial payload of:
    
>>>>>>> origin/master
    ```javascript
    {
      post: {
        id: 1,
        comments: [1, 2]
      }
    }
    ```
<<<<<<< HEAD

    By default calling `post.get('comments')` will trigger the following requests(assuming the
    comments haven't been loaded before):

=======
    
    By default calling `post.get('comments')` will trigger the following requests(assuming the
    comments haven't been loaded before):
    
>>>>>>> origin/master
    ```
    GET /comments/1
    GET /comments/2
    ```
<<<<<<< HEAD

    If you set coalesceFindRequests to `true` it will instead trigger the following request:

    ```
    GET /comments?filter[id]=1,2
    ```

    Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
    relationships accessed within the same runloop. If you set `coalesceFindRequests: true`

=======
    
    If you set coalesceFindRequests to `true` it will instead trigger the following request:
    
    ```
    GET /comments?filter[id]=1,2
    ```
    
    Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
    relationships accessed within the same runloop. If you set `coalesceFindRequests: true`
    
>>>>>>> origin/master
    ```javascript
    store.findRecord('comment', 1);
    store.findRecord('comment', 2);
    ```
<<<<<<< HEAD

    will also send a request to: `GET /comments?filter[id]=1,2`

    Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
    `groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.

=======
    
    will also send a request to: `GET /comments?filter[id]=1,2`
    
    Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
    `groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.
    
>>>>>>> origin/master
    @property coalesceFindRequests
    @type {boolean}
  */
  coalesceFindRequests: false,

  // TODO: Remove this once we have a better way to override HTTP verbs.
  /**
    @method updateRecord
    @param {DS.Store} store
    @param {DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord: function(store, type, snapshot) {
    var data = {};
    var serializer = store.serializerFor(type.modelName);

    serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

    var id = snapshot.id;
    var url = this.buildURL(type.modelName, id, snapshot, 'updateRecord');

    return this.ajax(url, 'PATCH', { data: data });
  }
});
