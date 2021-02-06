import { get } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { camelize } from '@ember/string';

import { pluralize } from 'ember-inflector';

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;
type Snapshot = import('@ember-data/store/-private/system/snapshot').default;
type SnapshotRecordArray = import('@ember-data/store/-private/system/snapshot-record-array').default;

/**
  @module @ember-data/adapter
*/

/**
  ## Using BuildURLMixin

  To use URL building, include the mixin when extending an adapter, and call `buildURL` where needed.
  The default behaviour is designed for RESTAdapter.

  ### Example

  ```javascript
  import Adapter, { BuildURLMixin } from '@ember-data/adapter';

  export default class ApplicationAdapter extends Adapter.extend(BuildURLMixin) {
    findRecord(store, type, id, snapshot) {
      var url = this.buildURL(type.modelName, id, snapshot, 'findRecord');
      return this.ajax(url, 'GET');
    }
  }
  ```

  ### Attributes

  The `host` and `namespace` attributes will be used if defined, and are optional.

  @class BuildURLMixin
*/
export default Mixin.create({
  /**
    Builds a URL for a given type and optional ID.

    By default, it pluralizes the type's name (for example, 'post'
    becomes 'posts' and 'person' becomes 'people'). To override the
    pluralization see [pathForType](BuildUrlMixin/methods/pathForType?anchor=pathForType).

    If an ID is specified, it adds the ID to the path generated
    for the type, separated by a `/`.

    When called by `RESTAdapter.findMany()` the `id` and `snapshot` parameters
    will be arrays of ids and snapshots.

    @method buildURL
    @param {String} modelName
    @param {(String|Array|Object)} id single id or array of ids or query
    @param {(Snapshot|SnapshotRecordArray)} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @param {Object} query object of query parameters to send for query requests.
    @return {String} url
  */
  buildURL(
    modelName: string,
    id: string | string[] | Dict<unknown> | null,
    snapshot: Snapshot | Snapshot[] | SnapshotRecordArray | null,
    requestType: string = '',
    query = {}
  ): string {
    switch (requestType) {
      case 'findRecord':
        return this.urlForFindRecord(id, modelName, snapshot);
      case 'findAll':
        return this.urlForFindAll(modelName, snapshot);
      case 'query':
        return this.urlForQuery(query, modelName);
      case 'queryRecord':
        return this.urlForQueryRecord(query, modelName);
      case 'findMany':
        return this.urlForFindMany(id, modelName, snapshot);
      case 'findHasMany':
        return this.urlForFindHasMany(id, modelName, snapshot);
      case 'findBelongsTo':
        return this.urlForFindBelongsTo(id, modelName, snapshot);
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
  _buildURL(modelName: string | null | undefined, id: string | null | undefined): string {
    let path;
    let url: string[] = [];
    let host = get(this, 'host');
    let prefix = this.urlPrefix();

    if (modelName) {
      path = this.pathForType(modelName);
      if (path) {
        url.push(path);
      }
    }

    if (id) {
      url.push(encodeURIComponent(id));
    }
    if (prefix) {
      url.unshift(prefix);
    }

    let urlString = url.join('/');
    if (!host && urlString && urlString.charAt(0) !== '/') {
      urlString = '/' + urlString;
    }

    return urlString;
  },

  /**
   Builds a URL for a `store.findRecord(type, id)` call.

   Example:

   ```app/adapters/user.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindRecord(id, modelName, snapshot) {
       let baseUrl = this.buildURL(modelName, id, snapshot);
       return `${baseUrl}/users/${snapshot.adapterOptions.user_id}/playlists/${id}`;
     }
   }
   ```

   @method urlForFindRecord
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url

   */
  urlForFindRecord(id: string, modelName: string, snapshot: Snapshot): string {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for a `store.findAll(type)` call.

   Example:

   ```app/adapters/comment.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindAll(modelName, snapshot) {
       let baseUrl = this.buildURL(modelName);
       return `${baseUrl}/data/comments.json`;
     }
   }
   ```

   @method urlForFindAll
   @param {String} modelName
   @param {SnapshotRecordArray} snapshot
   @return {String} url
   */
  urlForFindAll(modelName: string, snapshot: Snapshot): string {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for a `store.query(type, query)` call.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     host = 'https://api.github.com';
     urlForQuery (query, modelName) {
       switch(modelName) {
         case 'repo':
           return `https://api.github.com/orgs/${query.orgId}/repos`;
         default:
           return super.urlForQuery(...arguments);
       }
     }
   }
   ```

   @method urlForQuery
   @param {Object} query
   @param {String} modelName
   @return {String} url
   */
  urlForQuery(query: Dict<unknown>, modelName: string): string {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for a `store.queryRecord(type, query)` call.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForQueryRecord({ slug }, modelName) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/${encodeURIComponent(slug)}`;
     }
   }
   ```

   @method urlForQueryRecord
   @param {Object} query
   @param {String} modelName
   @return {String} url
   */
  urlForQueryRecord(query: Dict<unknown>, modelName: string): string {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for coalescing multiple `store.findRecord(type, id)`
   records into 1 request when the adapter's `coalesceFindRequests`
   property is `true`.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForFindMany(ids, modelName) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/coalesce`;
     }
   }
   ```

   @method urlForFindMany
   @param {Array} ids
   @param {String} modelName
   @param {Array} snapshots
   @return {String} url
   */
  urlForFindMany(ids: string[], modelName: string, snapshots: Snapshot[]) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for fetching an async `hasMany` relationship when a URL
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindHasMany(id, modelName, snapshot) {
       let baseUrl = this.buildURL(modelName, id);
       return `${baseUrl}/relationships`;
     }
   }
   ```

   @method urlForFindHasMany
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
  urlForFindHasMany(id: string, modelName: string, snapshot: Snapshot): string {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for fetching an async `belongsTo` relationship when a url
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindBelongsTo(id, modelName, snapshot) {
       let baseUrl = this.buildURL(modelName, id);
       return `${baseUrl}/relationships`;
     }
   }
   ```

   @method urlForFindBelongsTo
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
  urlForFindBelongsTo(id: string, modelName: string, snapshot: Snapshot): string {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for a `record.save()` call when the record was created
   locally using `store.createRecord()`.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForCreateRecord(modelName, snapshot) {
       return super.urlForCreateRecord(...arguments) + '/new';
     }
   }
   ```

   @method urlForCreateRecord
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
  urlForCreateRecord(modelName: string, snapshot: Snapshot) {
    return this._buildURL(modelName);
  },

  /**
   Builds a URL for a `record.save()` call when the record has been updated locally.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForUpdateRecord(id, modelName, snapshot) {
       return `/${id}/feed?access_token=${snapshot.adapterOptions.token}`;
     }
   }
   ```

   @method urlForUpdateRecord
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
  urlForUpdateRecord(id: string, modelName: string, snapshot: Snapshot): string {
    return this._buildURL(modelName, id);
  },

  /**
   Builds a URL for a `record.save()` call when the record has been deleted locally.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForDeleteRecord(id, modelName, snapshot) {
       return super.urlForDeleteRecord(...arguments) + '/destroy';
     }
   }
   ```

   @method urlForDeleteRecord
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
  urlForDeleteRecord(id: string, modelName: string, snapshot: Snapshot): string {
    return this._buildURL(modelName, id);
  },

  /**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentURL
    @return {String} urlPrefix
  */
  urlPrefix(path: string | null | undefined, parentURL: string): string {
    let host = get(this, 'host');
    let namespace = get(this, 'namespace');

    if (!host || host === '/') {
      host = '';
    }

    if (path) {
      // Protocol relative url
      if (/^\/\//.test(path) || /http(s)?:\/\//.test(path)) {
        // Do nothing, the full host is already included.
        return path;

        // Absolute path
      } else if (path.charAt(0) === '/') {
        return `${host}${path}`;
        // Relative path
      } else {
        return `${parentURL}/${path}`;
      }
    }

    // No path provided
    let url: string[] = [];
    if (host) {
      url.push(host);
    }
    if (namespace) {
      url.push(namespace);
    }
    return url.join('/');
  },

  /**
    Determines the pathname for a given type.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    ### Pathname customization

    For example, if you have an object `LineItem` with an
    endpoint of `/line_items/`.

    ```app/adapters/application.js
    import RESTAdapter from '@ember-data/adapter/rest';
    import { decamelize } from '@ember/string';
    import { pluralize } from 'ember-inflector';

    export default class ApplicationAdapter extends RESTAdapter {
      pathForType(modelName) {
        var decamelized = decamelize(modelName);
        return pluralize(decamelized);
      }
    }
    ```

    @method pathForType
    @param {String} modelName
    @return {String} path
  **/
  pathForType(modelName: string): string {
    let camelized = camelize(modelName);
    return pluralize(camelized);
  },
});
