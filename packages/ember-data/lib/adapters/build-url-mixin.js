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
    @param {String} type
    @param {String|Array|Object} id single id or array of ids or query
    @param {DS.Snapshot|Array} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @return {String} url
  */
  buildURL: function(type, id, snapshot, requestType) {
    switch (requestType) {
      case 'find':
        return this.urlForFind(id, type, snapshot);
      case 'findAll':
        return this.urlForFindAll(type);
      case 'findQuery':
        return this.urlForFindQuery(id, type);
      case 'findMany':
        return this.urlForFindMany(id, type, snapshot);
      case 'findHasMany':
        return this.urlForFindHasMany(id, type);
      case 'findBelongsTo':
        return this.urlForFindBelongsTo(id, type);
      case 'createRecord':
        return this.urlForCreateRecord(type, snapshot);
      case 'deleteRecord':
        return this.urlForDeleteRecord(id, type, snapshot);
      default:
        return this._buildURL(type, id);
    }
  },

  /**
    @method _buildURL
    @private
    @param {String} type
    @param {String} id
    @return {String} url
  */
  _buildURL: function(type, id) {
    var url = [];
    var host = get(this, 'host');
    var prefix = this.urlPrefix();
    var path;

    if (type) {
      path = this.pathForType(type);
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
   * @param {String} type
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForFind: function(id, type, snapshot) {
    return this._buildURL(type, id);
  },

  /**
   * @method urlForFindAll
   * @param {String} type
   * @return {String} url
   */
  urlForFindAll: function(type) {
    return this._buildURL(type);
  },

  /**
   * @method urlForFindQuery
   * @param {Object} query
   * @param {String} type
   * @return {String} url
   */
  urlForFindQuery: function(query, type) {
    return this._buildURL(type);
  },

  /**
   * @method urlForFindMany
   * @param {Array} ids
   * @param {String} type
   * @param {Array} snapshots
   * @return {String} url
   */
  urlForFindMany: function(ids, type, snapshots) {
    return this._buildURL(type);
  },

  /**
   * @method urlForFindHasMany
   * @param {String} id
   * @param {String} type
   * @return {String} url
   */
  urlForFindHasMany: function(id, type) {
    return this._buildURL(type, id);
  },

  /**
   * @method urlForFindBelongTo
   * @param {String} id
   * @param {String} type
   * @return {String} url
   */
  urlForFindBelongsTo: function(id, type) {
    return this._buildURL(type, id);
  },

  /**
   * @method urlForCreateRecord
   * @param {String} type
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForCreateRecord: function(type, snapshot) {
    return this._buildURL(type);
  },

  /**
   * @method urlForDeleteRecord
   * @param {String} id
   * @param {String} type
   * @param {DS.Snapshot} snapshot
   * @return {String} url
   */
  urlForDeleteRecord: function(id, type, snapshot) {
    return this._buildURL(type, id);
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
      pathForType: function(type) {
        var decamelized = Ember.String.decamelize(type);
        return Ember.String.pluralize(decamelized);
      }
    });
    ```

    @method pathForType
    @param {String} type
    @return {String} path
  **/
  pathForType: function(type) {
    var camelized = Ember.String.camelize(type);
    return Ember.String.pluralize(camelized);
  }
});
