import Mixin from '@ember/object/mixin';
import { camelize } from '@ember/string';

import { pluralize } from 'ember-inflector';

import type Snapshot from '@ember-data/store/-private/system/snapshot';
import type SnapshotRecordArray from '@ember-data/store/-private/system/snapshot-record-array';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';

/**
  @module @ember-data/adapter
*/

/*
 The structure of this file is such because typing Mixins is hard. Here we've structured it in
 such a way as to maximize the type information that a consumer can utilize. There are simpler
 ways to type a mixin but we would not be able to provide the nice overload signature for buildURL
*/
// the interface must fully declare the function signatures that the individual functions
// will also declare. If instead we try to keep them in sync by doing something like
// `interface BuildURLMixin { buildURL: typeof buildURL }`
// then an extending class overwriting one of the methods will break because typescript
// thinks it is a switch from an instance prop (that is a method) to an instance method.
interface BuildURLMixin {
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string,
    snapshot: Snapshot,
    requestType: 'findRecord'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: null,
    snapshot: SnapshotRecordArray,
    requestType: 'findAll'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: null,
    snapshot: null,
    requestType: 'query',
    query: Dict<unknown>
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: null,
    snapshot: null,
    requestType: 'queryRecord',
    query: Dict<unknown>
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string[],
    snapshot: Snapshot[],
    requestType: 'findMany'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string,
    snapshot: Snapshot,
    requestType: 'findHasMany'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string,
    snapshot: Snapshot,
    requestType: 'findBelongsTo'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string | null,
    snapshot: Snapshot,
    requestType: 'createRecord'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string,
    snapshot: Snapshot,
    requestType: 'updateRecord'
  ): string;
  buildURL(
    this: MixtBuildURLMixin,
    modelName: string,
    id: string,
    snapshot: Snapshot,
    requestType: 'deleteRecord'
  ): string;
  buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot): string;
  _buildURL(this: MixtBuildURLMixin, modelName: string | null | undefined, id?: string | null): string;
  urlForFindRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForFindAll(this: MixtBuildURLMixin, modelName: string, snapshots: SnapshotRecordArray): string;
  urlForQueryRecord(this: MixtBuildURLMixin, query: Dict<unknown>, modelName: string): string;
  urlForQuery(this: MixtBuildURLMixin, query: Dict<unknown>, modelName: string): string;
  urlForFindMany(this: MixtBuildURLMixin, ids: string[], modelName: string, snapshots: Snapshot[]): string;
  urlForFindHasMany(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForFindBelongsTo(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForCreateRecord(this: MixtBuildURLMixin, modelName: string, snapshot: Snapshot): string;
  urlForUpdateRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlForDeleteRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string;
  urlPrefix(this: MixtBuildURLMixin, path?: string | null, parentURL?: string): string;
  pathForType(this: MixtBuildURLMixin, modelName: string): string;
}

// prevents the final constructed object from needing to add
// host and namespace which are provided by the final consuming
// class to the prototype which can result in overwrite errors
interface MixtBuildURLMixin extends BuildURLMixin {
  host: string | null;
  namespace: string | null;
}

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
  @public
*/
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
    @public
    @param {String} modelName
    @param {(String|Array|Object)} id single id or array of ids or query
    @param {(Snapshot|SnapshotRecordArray)} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @param {Object} query object of query parameters to send for query requests.
    @return {String} url
  */
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string,
  snapshot: Snapshot,
  requestType: 'findRecord'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: null,
  snapshot: SnapshotRecordArray,
  requestType: 'findAll'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: null,
  snapshot: null,
  requestType: 'query',
  query: Dict<unknown>
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: null,
  snapshot: null,
  requestType: 'queryRecord',
  query: Dict<unknown>
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string[],
  snapshot: Snapshot[],
  requestType: 'findMany'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string,
  snapshot: Snapshot,
  requestType: 'findHasMany'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string,
  snapshot: Snapshot,
  requestType: 'findBelongsTo'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string | null,
  snapshot: Snapshot,
  requestType: 'createRecord'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string,
  snapshot: Snapshot,
  requestType: 'updateRecord'
): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string,
  snapshot: Snapshot,
  requestType: 'deleteRecord'
): string;
function buildURL(this: MixtBuildURLMixin, modelName: string, id: string, snapshot: Snapshot): string;
function buildURL(
  this: MixtBuildURLMixin,
  modelName: string,
  id: string | string[] | Dict<unknown> | null,
  snapshot: Snapshot | Snapshot[] | SnapshotRecordArray | null,
  requestType?:
    | 'findRecord'
    | 'findAll'
    | 'query'
    | 'queryRecord'
    | 'findMany'
    | 'findHasMany'
    | 'findBelongsTo'
    | 'createRecord'
    | 'updateRecord'
    | 'deleteRecord',
  query?: Dict<unknown>
): string {
  /*
      Switch statements in typescript don't currently narrow even when the function is implemented
      with overloads.

      We still extract this to stand alone so that we can provide nice overloads for calling signatures,
      but we will still require all of this casting (or a ridiculous number of assertsthat narrow it down
      for us).
  */
  switch (requestType) {
    case 'findRecord':
      return this.urlForFindRecord(id as string, modelName, snapshot as Snapshot);
    case 'findAll':
      return this.urlForFindAll(modelName, snapshot as SnapshotRecordArray);
    case 'query':
      return this.urlForQuery(query || {}, modelName);
    case 'queryRecord':
      return this.urlForQueryRecord(query || {}, modelName);
    case 'findMany':
      return this.urlForFindMany(id as string[], modelName, snapshot as Snapshot[]);
    case 'findHasMany':
      return this.urlForFindHasMany(id as string, modelName, snapshot as Snapshot);
    case 'findBelongsTo':
      return this.urlForFindBelongsTo(id as string, modelName, snapshot as Snapshot);
    case 'createRecord':
      return this.urlForCreateRecord(modelName, snapshot as Snapshot);
    case 'updateRecord':
      return this.urlForUpdateRecord(id as string, modelName, snapshot as Snapshot);
    case 'deleteRecord':
      return this.urlForDeleteRecord(id as string, modelName, snapshot as Snapshot);
    default:
      // this is the 'never' case but someone may call `buildURL` manually so
      // we try to do something for them.
      return this._buildURL(modelName, id as string | null);
  }
}

/**
    @method _buildURL
    @private
    @param {String} modelName
    @param {String} id
    @return {String} url
  */
function _buildURL(this: MixtBuildURLMixin, modelName: string | null | undefined, id?: string | null): string {
  let path;
  let url: string[] = [];
  let { host } = this;
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
}

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
   @public
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url

   */
function urlForFindRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string {
  return this._buildURL(modelName, id);
}

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
    @public
   @param {String} modelName
   @param {SnapshotRecordArray} snapshot
   @return {String} url
   */
function urlForFindAll(this: MixtBuildURLMixin, modelName: string, snapshots: SnapshotRecordArray): string {
  return this._buildURL(modelName);
}

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
    @public
   @param {Object} query
   @param {String} modelName
   @return {String} url
   */
function urlForQuery(this: MixtBuildURLMixin, query: Dict<unknown>, modelName: string): string {
  return this._buildURL(modelName);
}

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
    @public
   @param {Object} query
   @param {String} modelName
   @return {String} url
   */
function urlForQueryRecord(this: MixtBuildURLMixin, query: Dict<unknown>, modelName: string): string {
  return this._buildURL(modelName);
}

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
    @public
   @param {Array} ids
   @param {String} modelName
   @param {Array} snapshots
   @return {String} url
   */
function urlForFindMany(this: MixtBuildURLMixin, ids: string[], modelName: string, snapshots: Snapshot[]): string {
  return this._buildURL(modelName);
}

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
    @public
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForFindHasMany(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string {
  return this._buildURL(modelName, id);
}

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
    @public
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForFindBelongsTo(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string {
  return this._buildURL(modelName, id);
}

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
    @public
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForCreateRecord(this: MixtBuildURLMixin, modelName: string, snapshot: Snapshot): string {
  return this._buildURL(modelName);
}

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
    @public
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForUpdateRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string {
  return this._buildURL(modelName, id);
}

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
    @public
   @param {String} id
   @param {String} modelName
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForDeleteRecord(this: MixtBuildURLMixin, id: string, modelName: string, snapshot: Snapshot): string {
  return this._buildURL(modelName, id);
}

/**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentURL
    @return {String} urlPrefix
  */
function urlPrefix(this: MixtBuildURLMixin, path?: string | null, parentURL?: string): string {
  let { host, namespace } = this;

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
}

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
    @public
    @param {String} modelName
    @return {String} path
  **/
function pathForType(this: MixtBuildURLMixin, modelName: string): string {
  let camelized = camelize(modelName);
  return pluralize(camelized);
}

// we build it this way vs casting to BuildURLMixin so that any
// changes to the interface surface as errors here.
const mixinProps: BuildURLMixin = {
  buildURL,
  _buildURL,
  urlForFindRecord,
  urlForFindAll,
  urlForQueryRecord,
  urlForQuery,
  urlForFindMany,
  urlForFindHasMany,
  urlForFindBelongsTo,
  urlForCreateRecord,
  urlForDeleteRecord,
  urlForUpdateRecord,
  urlPrefix,
  pathForType,
};

export default Mixin.create(mixinProps);
