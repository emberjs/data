var get = Ember.get;

/**

  WARNING: This interface is likely to change in order to accomodate https://github.com/emberjs/rfcs/pull/4

  ## Using BuildURLMixin

  To use url building, include the mixin when extending an adapter, and call `buildURL` where needed.
  The default behaviour is designed for RESTAdapter.

  ### Example

  ```javascript
  export default DS.Adapter.extend(BuildURLMixin, {
    findRecord: function(store, type, id, snapshot) {
      var url = this.buildURL(type.modelName, id, snapshot, 'findRecord');
      return this.ajax(url, 'GET');
    }
  });
  ```

  ### Attributes

  The `host` and `namespace` attributes will be used if defined, and are optional.

  @class BuildURLMixin
  @namespace DS
*/
export default Ember.Mixin.create({
  /**
    Builds a URL for a given type and optional ID.

    By default, it pluralizes the type's name (for example, 'post'
    becomes 'posts' and 'person' becomes 'people'). To override the
    pluralization see [pathForType](#method_pathForType).

    If an ID is specified, it adds the ID to the path generated
    for the type, separated by a `/`.

    When called by RESTAdapter.findMany() the `id` and `snapshot` parameters
    will be arrays of ids and snapshots.

    @method buildURL
    @param {String} modelName
    @param {(String|Array|Object)} id single id or array of ids or query
    @param {(DS.Snapshot|Array)} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @param {Object} query object of query parameters to send for query requests.
    @return {String} url
  */
  buildURL: function(modelName, id, snapshot, requestType, query) {
    switch (requestType) {
      case 'findRecord':
        return this.urlForFindRecord(id, modelName, snapshot);
      case 'findAll':
        return this.urlForFindAll(modelName);
      case 'query':
        return this.urlForQuery(query, modelName);
      case 'queryRecord':
        return this.urlForQueryRecord(query, modelName);
      case 'findMany':
        return this.urlForFindMany(id, modelName, snapshot);
      case 'findHasMany':
        return this.urlForFindHasMany(id, modelName);
      case 'findBelongsTo':
        return this.urlForFindBelongsTo(id, modelName);
      case 'createRecord':
        return this.urlForCreateRecord(modelName, snapshot);
      case 'updateRecord':
        return this.urlForUpdateRecord(id, modelName, snapshot);
      case 'deleteRecord':
        return this.urlForDeleteRecord(id, modelName, snapshot);
      default:
        return this._buildURL(modelName, id);
    }
  },

  /**
    @method _buildURL
    @private
    @param {String} modelName
    @param {String} id
    @return {String} url
  */
  _buildURL: function(modelName, id) {
    var url = [];
    var host = get(this, 'host');
    var prefix = this.urlPrefix();
    var path;

    if (modelName) {
      path = this.pathForType(modelName);
      if (path) { url.push(path); }
    }

    if (id) { url.push(encodeURIComponent(id)); }
    if (prefix) { url.unshift(prefix); }

    url = url.join('/');
    if (!host && url && url.charAt(0) !== '/') {
      url = '/' + url;
    }

    return url;
  },

  /**
   * @method urlForFindRecord
   * @param {String} id
   * @param {String} modelName
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForFindRecord: function(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
   * @method urlForFindAll
   * @param {String} modelName
   * @return {String} url
   */
  urlForFindAll: function(modelName) {
    return this._buildURL(modelName);
  },

  /**
   * @method urlForQuery
   * @param {Object} query
   * @param {String} modelName
   * @return {String} url
   */
  urlForQuery: function(query, modelName) {
    return this._buildURL(modelName);
  },

  /**
   * @method urlForQueryRecord
   * @param {Object} query
   * @param {String} modelName
   * @return {String} url
   */
  urlForQueryRecord: function(query, modelName) {
    return this._buildURL(modelName);
  },

  /**
   * @method urlForFindMany
   * @param {Array} ids
   * @param {String} modelName
   * @param {Array} snapshots
   * @return {String} url
   */
  urlForFindMany: function(ids, modelName, snapshots) {
    return this._buildURL(modelName);
  },

  /**
   * @method urlForFindHasMany
   * @param {String} id
   * @param {String} modelName
   * @return {String} url
   */
  urlForFindHasMany: function(id, modelName) {
    return this._buildURL(modelName, id);
  },

  /**
   * @method urlForFindBelongTo
   * @param {String} id
   * @param {String} modelName
   * @return {String} url
   */
  urlForFindBelongsTo: function(id, modelName) {
    return this._buildURL(modelName, id);
  },

  /**
   * @method urlForCreateRecord
   * @param {String} modelName
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForCreateRecord: function(modelName, snapshot) {
    return this._buildURL(modelName);
  },

  /**
   * @method urlForUpdateRecord
   * @param {String} id
   * @param {String} modelName
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForUpdateRecord: function(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
   * @method urlForDeleteRecord
   * @param {String} id
   * @param {String} modelName
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForDeleteRecord: function(id, modelName, snapshot) {
    return this._buildURL(modelName, id);
  },

  /**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentURL
    @return {String} urlPrefix
  */
  urlPrefix: function(path, parentURL) {
    var host = get(this, 'host');
    var namespace = get(this, 'namespace');
    var url = [];

    if (path) {
      // Protocol relative url
      //jscs:disable disallowEmptyBlocks
      if (/^\/\//.test(path)) {
        // Do nothing, the full host is already included. This branch
        // avoids the absolute path logic and the relative path logic.

      // Absolute path
      } else if (path.charAt(0) === '/') {
        //jscs:enable disallowEmptyBlocks
        if (host) {
          path = path.slice(1);
          url.push(host);
        }
      // Relative path
      } else if (!/^http(s)?:\/\//.test(path)) {
        url.push(parentURL);
      }
    } else {
      if (host) { url.push(host); }
      if (namespace) { url.push(namespace); }
    }

    if (path) {
      url.push(path);
    }

    return url.join('/');
  },


  /**
    Determines the pathname for a given type.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    ### Pathname customization

    For example if you have an object LineItem with an
    endpoint of "/line_items/".

    ```app/adapters/application.js
    import DS from 'ember-data';

    export default DS.RESTAdapter.extend({
      pathForType: function(modelName) {
        var decamelized = Ember.String.decamelize(modelName);
        return Ember.String.pluralize(decamelized);
      }
    });
    ```

    @method pathForType
    @param {String} modelName
    @return {String} path
  **/
  pathForType: function(modelName) {
    var camelized = Ember.String.camelize(modelName);
    return Ember.String.pluralize(camelized);
  }
});
