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
    Regarding to the JSON API (and HTTP) spec, changes should be sent to the
    server using the `PATCH` method. Since IE11 is still not supporting `PATCH`
    it is necessary to use `PUT` to make an app work with the IE.

    This property enables the user to change this incorrect behavior if an
    IE compatibility is not necessary.
  */
  patchMethod: 'PUT',

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

    return this.ajax(url, this.get('patchMethod'), { data: data });
  }
});
