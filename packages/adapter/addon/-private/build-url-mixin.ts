import Mixin from '@ember/object/mixin';
import { camelize } from '@ember/string';

import { pluralize } from 'ember-inflector';

import type Snapshot from '@ember-data/store/-private/system/snapshot';
import type SnapshotRecordArray from '@ember-data/store/-private/system/snapshot-record-array';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';
import { DefaultRegistry, ResolvedRegistry } from '@ember-data/types';
import { RecordType } from '@ember-data/types/utils';

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
interface BuildURLMixin<R extends ResolvedRegistry = DefaultRegistry> {
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string,
    snapshot: Snapshot<R, T>,
    requestType: 'findRecord'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: null,
    snapshot: SnapshotRecordArray<R, T>,
    requestType: 'findAll'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: null,
    snapshot: null,
    requestType: 'query',
    query: Dict<unknown>
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: null,
    snapshot: null,
    requestType: 'queryRecord',
    query: Dict<unknown>
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string[],
    snapshot: Snapshot<R, T>[],
    requestType: 'findMany'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string,
    snapshot: Snapshot<R, T>,
    requestType: 'findHasMany'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string,
    snapshot: Snapshot<R, T>,
    requestType: 'findBelongsTo'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string | null,
    snapshot: Snapshot<R, T>,
    requestType: 'createRecord'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string,
    snapshot: Snapshot<R, T>,
    requestType: 'updateRecord'
  ): string;
  buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    id: string,
    snapshot: Snapshot<R, T>,
    requestType: 'deleteRecord'
  ): string;
  buildURL<T extends RecordType<R>>(this: MixtBuildURLMixin<R>, type: T, id: string, snapshot: Snapshot<R, T>): string;
  _buildURL<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T | null | undefined,
    id?: string | null
  ): string;
  urlForFindRecord<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    id: string,
    type: T,
    snapshot: Snapshot<R, T>
  ): string;
  urlForFindAll<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    type: T,
    snapshots: SnapshotRecordArray<R, T>
  ): string;
  urlForQueryRecord<T extends RecordType<R>>(this: MixtBuildURLMixin<R>, query: Dict<unknown>, type: T): string;
  urlForQuery<T extends RecordType<R>>(this: MixtBuildURLMixin<R>, query: Dict<unknown>, type: T): string;
  urlForFindMany<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    ids: string[],
    type: T,
    snapshots: Snapshot<R, T>[]
  ): string;
  urlForFindHasMany<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    id: string,
    type: T,
    snapshot: Snapshot<R, T>
  ): string;
  urlForFindBelongsTo<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    id: string,
    type: T,
    snapshot: Snapshot<R, T>
  ): string;
  urlForCreateRecord<T extends RecordType<R>>(this: MixtBuildURLMixin<R>, type: T, snapshot: Snapshot<R, T>): string;
  urlForUpdateRecord<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    id: string,
    type: T,
    snapshot: Snapshot<R, T>
  ): string;
  urlForDeleteRecord<T extends RecordType<R>>(
    this: MixtBuildURLMixin<R>,
    id: string,
    type: T,
    snapshot: Snapshot<R, T>
  ): string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  urlPrefix<T extends RecordType<R>>(this: MixtBuildURLMixin<R>, path?: string | null, parentURL?: string): string;
  pathForType<T extends RecordType<R>>(this: MixtBuildURLMixin<R>, type: T): string;
}

// prevents the final constructed object from needing to add
// host and namespace which are provided by the final consuming
// class to the prototype which can result in overwrite errors
interface MixtBuildURLMixin<R extends ResolvedRegistry> extends BuildURLMixin<R> {
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
      var url = this.buildURL(schema.modelName, id, snapshot, 'findRecord');
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
    pluralization see [pathForType](./pathForType?anchor=pathForType).

    If an ID is specified, it adds the ID to the path generated
    for the type, separated by a `/`.

    When called by `RESTAdapter.findMany()` the `id` and `snapshot` parameters
    will be arrays of ids and snapshots.

    @method buildURL
    @public
    @param {String} type
    @param {(String|Array|Object)} id single id or array of ids or query
    @param {(Snapshot|SnapshotRecordArray)} snapshot single snapshot or array of snapshots
    @param {String} requestType
    @param {Object} query object of query parameters to send for query requests.
    @return {String} url
  */
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string,
  snapshot: Snapshot<R, T>,
  requestType: 'findRecord'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: null,
  snapshot: SnapshotRecordArray<R, T>,
  requestType: 'findAll'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: null,
  snapshot: null,
  requestType: 'query',
  query: Dict<unknown>
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: null,
  snapshot: null,
  requestType: 'queryRecord',
  query: Dict<unknown>
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string[],
  snapshot: Snapshot<R, T>[],
  requestType: 'findMany'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string,
  snapshot: Snapshot<R, T>,
  requestType: 'findHasMany'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string,
  snapshot: Snapshot<R, T>,
  requestType: 'findBelongsTo'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string | null,
  snapshot: Snapshot<R, T>,
  requestType: 'createRecord'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string,
  snapshot: Snapshot<R, T>,
  requestType: 'updateRecord'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string,
  snapshot: Snapshot<R, T>,
  requestType: 'deleteRecord'
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string,
  snapshot: Snapshot<R, T>
): string;
function buildURL<T extends RecordType<R>, R extends ResolvedRegistry>(
  this: MixtBuildURLMixin<R>,
  type: T,
  id: string | string[] | Dict<unknown> | null,
  snapshot: Snapshot<R, T> | Snapshot<R, T>[] | SnapshotRecordArray<R, T> | null,
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
      return this.urlForFindRecord(id as string, type, snapshot as Snapshot<R, T>);
    case 'findAll':
      return this.urlForFindAll(type, snapshot as SnapshotRecordArray<R, T>);
    case 'query':
      return this.urlForQuery(query || {}, type);
    case 'queryRecord':
      return this.urlForQueryRecord(query || {}, type);
    case 'findMany':
      return this.urlForFindMany(id as string[], type, snapshot as Snapshot<R, T>[]);
    case 'findHasMany':
      return this.urlForFindHasMany(id as string, type, snapshot as Snapshot<R, T>);
    case 'findBelongsTo':
      return this.urlForFindBelongsTo(id as string, type, snapshot as Snapshot<R, T>);
    case 'createRecord':
      return this.urlForCreateRecord(type, snapshot as Snapshot<R, T>);
    case 'updateRecord':
      return this.urlForUpdateRecord(id as string, type, snapshot as Snapshot<R, T>);
    case 'deleteRecord':
      return this.urlForDeleteRecord(id as string, type, snapshot as Snapshot<R, T>);
    default:
      // this is the 'never' case but someone may call `buildURL` manually so
      // we try to do something for them.
      return this._buildURL(type, id as string | null);
  }
}

/**
    @method _buildURL
    @private
    @param {String} type
    @param {String} id
    @return {String} url
  */
function _buildURL<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  type: T | null | undefined,
  id?: string | null
): string {
  let path;
  let url: string[] = [];
  let { host } = this;
  let prefix = this.urlPrefix();

  if (type) {
    path = this.pathForType(type);
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
     urlForFindRecord(id, type, snapshot) {
       let baseUrl = this.buildURL(type, id, snapshot);
       return `${baseUrl}/users/${snapshot.adapterOptions.user_id}/playlists/${id}`;
     }
   }
   ```

   @method urlForFindRecord
   @public
   @param {String} id
   @param {String} type
   @param {Snapshot} snapshot
   @return {String} url

   */
function urlForFindRecord<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  id: string,
  type: T,
  snapshot: Snapshot<R, T>
): string {
  return this._buildURL(type, id);
}

/**
   Builds a URL for a `store.findAll(type)` call.

   Example:

   ```app/adapters/comment.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindAll(type, snapshot) {
       let baseUrl = this.buildURL(type);
       return `${baseUrl}/data/comments.json`;
     }
   }
   ```

   @method urlForFindAll
    @public
   @param {String} type
   @param {SnapshotRecordArray} snapshot
   @return {String} url
   */
function urlForFindAll<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  type: T,
  snapshots: SnapshotRecordArray<R, T>
): string {
  return this._buildURL(type);
}

/**
   Builds a URL for a `store.query(type, query)` call.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     host = 'https://api.github.com';
     urlForQuery (query, type) {
       switch(type) {
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
   @param {String} type
   @return {String} url
   */
function urlForQuery<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  query: Dict<unknown>,
  type: T
): string {
  return this._buildURL(type);
}

/**
   Builds a URL for a `store.queryRecord(type, query)` call.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForQueryRecord({ slug }, type) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/${encodeURIComponent(slug)}`;
     }
   }
   ```

   @method urlForQueryRecord
    @public
   @param {Object} query
   @param {String} type
   @return {String} url
   */
function urlForQueryRecord<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  query: Dict<unknown>,
  type: T
): string {
  return this._buildURL(type);
}

/**
   Builds a URL for coalescing multiple `store.findRecord(type, id)`
   records into 1 request when the adapter's `coalesceFindRequests`
   property is `true`.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForFindMany(ids, type) {
       let baseUrl = this.buildURL();
       return `${baseUrl}/coalesce`;
     }
   }
   ```

   @method urlForFindMany
    @public
   @param {Array} ids
   @param {String} type
   @param {Array} snapshots
   @return {String} url
   */
function urlForFindMany<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  ids: string[],
  type: T,
  snapshots: Snapshot<R, T>[]
): string {
  return this._buildURL(type);
}

/**
   Builds a URL for fetching an async `hasMany` relationship when a URL
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindHasMany(id, type, snapshot) {
       let baseUrl = this.buildURL(type, id);
       return `${baseUrl}/relationships`;
     }
   }
   ```

   @method urlForFindHasMany
    @public
   @param {String} id
   @param {String} type
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForFindHasMany<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  id: string,
  type: T,
  snapshot: Snapshot<R, T>
): string {
  return this._buildURL(type, id);
}

/**
   Builds a URL for fetching an async `belongsTo` relationship when a url
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindBelongsTo(id, type, snapshot) {
       let baseUrl = this.buildURL(type, id);
       return `${baseUrl}/relationships`;
     }
   }
   ```

   @method urlForFindBelongsTo
    @public
   @param {String} id
   @param {String} type
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForFindBelongsTo<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  id: string,
  type: T,
  snapshot: Snapshot<R, T>
): string {
  return this._buildURL(type, id);
}

/**
   Builds a URL for a `record.save()` call when the record was created
   locally using `store.createRecord()`.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForCreateRecord(type, snapshot) {
       return super.urlForCreateRecord(...arguments) + '/new';
     }
   }
   ```

   @method urlForCreateRecord
    @public
   @param {String} type
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForCreateRecord<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  type: T,
  snapshot: Snapshot<R, T>
): string {
  return this._buildURL(type);
}

/**
   Builds a URL for a `record.save()` call when the record has been updated locally.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForUpdateRecord(id, type, snapshot) {
       return `/${id}/feed?access_token=${snapshot.adapterOptions.token}`;
     }
   }
   ```

   @method urlForUpdateRecord
    @public
   @param {String} id
   @param {String} type
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForUpdateRecord<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  id: string,
  type: T,
  snapshot: Snapshot<R, T>
): string {
  return this._buildURL(type, id);
}

/**
   Builds a URL for a `record.save()` call when the record has been deleted locally.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForDeleteRecord(id, type, snapshot) {
       return super.urlForDeleteRecord(...arguments) + '/destroy';
     }
   }
   ```

   @method urlForDeleteRecord
    @public
   @param {String} id
   @param {String} type
   @param {Snapshot} snapshot
   @return {String} url
   */
function urlForDeleteRecord<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  id: string,
  type: T,
  snapshot: Snapshot<R, T>
): string {
  return this._buildURL(type, id);
}

/**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentURL
    @return {String} urlPrefix
  */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function urlPrefix<R extends ResolvedRegistry, T extends RecordType<R>>(
  this: MixtBuildURLMixin<R>,
  path?: string | null,
  parentURL?: string
): string {
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
      pathForType(type) {
        var decamelized = decamelize(type);
        return pluralize(decamelized);
      }
    }
    ```

    @method pathForType
    @public
    @param {String} type
    @return {String} path
  **/
function pathForType<R extends ResolvedRegistry, T extends RecordType<R>>(this: MixtBuildURLMixin<R>, type: T): string {
  let camelized = camelize(type);
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
