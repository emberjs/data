var get = Ember.get;

/**

  WARNING: This interface is likely to change in order to accomodate https://github.com/emberjs/rfcs/pull/4

  ## Using BuildURLMixin

  To use url building, include the mixin when extending an adapter, and call `buildURL` where needed.
  The default behaviour is designed for RESTAdapter.

  ### Example

  ```javascript
  export default DS.Adapter.extend(BuildURLMixin, {
    find: function(store, type, id, snapshot) {
      var url = this.buildURL(type.typeKey, id, snapshot, 'find');
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
    @param {String} typeKey
    @param {String|Array|Object} id single id or array of ids or query
    @param {DS.Snapshot|Array} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @return {String} url
  */
  buildURL: function(typeKey, id, snapshot, requestType) {
    switch (requestType) {
      case 'find':
        return this.urlForFind(id, typeKey, snapshot);
      case 'findAll':
        return this.urlForFindAll(typeKey);
      case 'findQuery':
        return this.urlForFindQuery(id, typeKey);
      case 'findMany':
        return this.urlForFindMany(id, typeKey, snapshot);
      case 'findHasMany':
        return this.urlForFindHasMany(id, typeKey);
      case 'findBelongsTo':
        return this.urlForFindBelongsTo(id, typeKey);
      case 'createRecord':
        return this.urlForCreateRecord(typeKey, snapshot);
      case 'updateRecord':
        return this.urlForUpdateRecord(id, typeKey, snapshot);
      case 'deleteRecord':
        return this.urlForDeleteRecord(id, typeKey, snapshot);
      default:
        return this._buildURL(typeKey, id);
    }
  },

  /**
    @method _buildURL
    @private
    @param {String} typeKey
    @param {String} id
    @return {String} url
  */
  _buildURL: function(typeKey, id) {
    var url = [];
    var host = get(this, 'host');
    var prefix = this.urlPrefix();
    var path;

    if (typeKey) {
      path = this.pathForType(typeKey);
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
   * @method urlForFind
   * @param {String} id
   * @param {String} typeKey
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForFind: function(id, typeKey, snapshot) {
    return this._buildURL(typeKey, id);
  },

  /**
   * @method urlForFindAll
   * @param {String} typeKey
   * @return {String} url
   */
  urlForFindAll: function(typeKey) {
    return this._buildURL(typeKey);
  },

  /**
   * @method urlForFindQuery
   * @param {Object} query
   * @param {String} typeKey
   * @return {String} url
   */
  urlForFindQuery: function(query, typeKey) {
    return this._buildURL(typeKey);
  },

  /**
   * @method urlForFindMany
   * @param {Array} ids
   * @param {String} type
   * @param {Array} snapshots
   * @return {String} url
   */
  urlForFindMany: function(ids, typeKey, snapshots) {
    return this._buildURL(typeKey);
  },

  /**
   * @method urlForFindHasMany
   * @param {String} id
   * @param {String} typeKey
   * @return {String} url
   */
  urlForFindHasMany: function(id, typeKey) {
    return this._buildURL(typeKey, id);
  },

  /**
   * @method urlForFindBelongTo
   * @param {String} id
   * @param {String} typeKey
   * @return {String} url
   */
  urlForFindBelongsTo: function(id, typeKey) {
    return this._buildURL(typeKey, id);
  },

  /**
   * @method urlForCreateRecord
   * @param {String} typeKey
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForCreateRecord: function(typeKey, snapshot) {
    return this._buildURL(typeKey);
  },

  /**
   * @method urlForUpdateRecord
   * @param {String} id
   * @param {String} typeKey
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForUpdateRecord: function(id, typeKey, snapshot) {
    return this._buildURL(typeKey, id);
  },

  /**
   * @method urlForDeleteRecord
   * @param {String} id
   * @param {String} typeKey
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForDeleteRecord: function(id, typeKey, snapshot) {
    return this._buildURL(typeKey, id);
  },

  /**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentUrl
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

    ```js
    App.ApplicationAdapter = DS.RESTAdapter.extend({
      pathForType: function(typeKey) {
        var decamelized = Ember.String.decamelize(typeKey);
        return Ember.String.pluralize(decamelized);
      }
    });
    ```

    @method pathForType
    @param {String} typeKey
    @return {String} path
  **/
  pathForType: function(typeKey) {
    var camelized = Ember.String.camelize(typeKey);
    return Ember.String.pluralize(camelized);
  }
});
