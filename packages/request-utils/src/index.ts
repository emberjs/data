import { camelize } from '@ember/string';

import { pluralize } from 'ember-inflector';

/**
  @module @ember-data/request-utils
*/


// prevents the final constructed object from needing to add
// host and namespace which are provided by the final consuming
// class to the prototype which can result in overwrite errors
interface BuildURLOptions {
  host: string | null;
  namespace: string | null;
  urlPrefix: () => string;
  pathForType: (type: string) => string;
}

/**
  ## Using BuildURLMixin

  To use URL building, include the mixin when extending an adapter, and call `buildURL` where needed.
  The default behaviour is designed for RESTAdapter.

  ### Example

  ```javascript
  import Adapter, { BuildURLMixin } from '@ember-data/adapter';

  export default class ApplicationAdapter extends Adapter.extend(BuildURLMixin) {
    findRecord(store, type, id) {
      var url = this.buildURL(type.modelName, id, 'findRecord');
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

    When called by `RESTAdapter.findMany()` the `id` parameters
    will be arrays of ids.

    @method buildURL
    @public
    @param {String} modelName
    @param {(String|Array|Object)} id single id or array of ids or query
    @param {String} requestType
    @param {Object} query object of query parameters to send for query requests.
    @return {String} url
  */
function buildURL(
  options: BuildURLOptions,
  modelName: string,
  id: string | string[] | Record<string, unknown> | null,
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
  query?: Record<string, unknown>
): string {
  /*
      Switch statements in typescript don't currently narrow even when the function is implemented
      with overloads.

      We still extract this to stand alone so that we can provide nice overloads for calling signatures,
      but we will still require all of this casting (or a ridiculous number of assertsthat narrow it down
      for us).
  */

  // TODO: Maybe implement something like this???
  // const options = getOptionsFromSomewhere();

  switch (requestType) {
    case 'findRecord':
      return urlForFindRecord(options, id as string, modelName);
    case 'findAll':
      return urlForFindAll(options, modelName);
    case 'query':
      return urlForQuery(options, query || {}, modelName);
    case 'queryRecord':
      return urlForQueryRecord(options, query || {}, modelName);
    case 'findMany':
      return urlForFindMany(options, id as string[], modelName);
    case 'findHasMany':
      return urlForFindHasMany(options, id as string, modelName);
    case 'findBelongsTo':
      return urlForFindBelongsTo(options, id as string, modelName);
    case 'createRecord':
      return urlForCreateRecord(options, modelName);
    case 'updateRecord':
      return urlForUpdateRecord(options, id as string, modelName);
    case 'deleteRecord':
      return urlForDeleteRecord(options, id as string, modelName);
    default:
      // this is the 'never' case but someone may call `buildURL` manually so
      // we try to do something for them.
      return _buildURL(options, modelName, id as string | null);
  }
}

/**
    @method _buildURL
    @private
    @param {String} modelName
    @param {String} id
    @return {String} url
  */
function _buildURL(options: BuildURLOptions, modelName: string | null | undefined, id?: string | null): string {
  let path: string;
  const url: string[] = [];
  const { host } = options;
  const prefix = options.urlPrefix();

  if (modelName) {
    path = options.pathForType(modelName);
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

// TODO: Figure out wtf this does in example
/**
   Builds a URL for a `store.findRecord(type, id)` call.

   Example:

   ```app/adapters/user.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindRecord(id = 1, modelName = 'user') {
       let baseUrl = this.buildURL(modelName, id); // https://api.example.com/users/1
       return `${baseUrl}`;
     }
   }
   ```

   @method urlForFindRecord
   @public
   @param {String} id
   @param {String} modelName
   @return {String} url

   */
function urlForFindRecord(options: BuildURLOptions, id: string, modelName: string): string {
  return _buildURL(options, modelName, id);
}

/**
   Builds a URL for a `store.findAll(type)` call.

   Example:

   ```app/adapters/comment.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindAll(modelName) {
       let baseUrl = this.buildURL(modelName);
       return `${baseUrl}/data/comments.json`;
     }
   }
   ```

   @method urlForFindAll
    @public
   @param {String} modelName
   @return {String} url
   */
function urlForFindAll(options: BuildURLOptions, modelName: string): string {
  return _buildURL(options, modelName);
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
function urlForQuery(options: BuildURLOptions, query: Record<string, unknown>, modelName: string): string {
  return _buildURL(options, modelName);
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
function urlForQueryRecord(options: BuildURLOptions, query: Record<string, unknown>, modelName: string): string {
  return _buildURL(options, modelName);
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
   @return {String} url
   */
function urlForFindMany(options: BuildURLOptions, ids: string[], modelName: string): string {
  return _buildURL(options, modelName);
}

/**
   Builds a URL for fetching an async `hasMany` relationship when a URL
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindHasMany(id, modelName) {
       let baseUrl = this.buildURL(modelName, id);
       return `${baseUrl}/relationships`;
     }
   }
   ```

   @method urlForFindHasMany
    @public
   @param {String} id
   @param {String} modelName
   @return {String} url
   */
function urlForFindHasMany(options: BuildURLOptions, id: string, modelName: string): string {
  return _buildURL(options, modelName, id);
}

/**
   Builds a URL for fetching an async `belongsTo` relationship when a url
   is not provided by the server.

   Example:

   ```app/adapters/application.js
   import JSONAPIAdapter from '@ember-data/adapter/json-api';

   export default class ApplicationAdapter extends JSONAPIAdapter {
     urlForFindBelongsTo(id, modelName) {
       let baseUrl = this.buildURL(modelName, id);
       return `${baseUrl}/relationships`;
     }
   }
   ```

   @method urlForFindBelongsTo
    @public
   @param {String} id
   @param {String} modelName
   @return {String} url
   */
function urlForFindBelongsTo(options: BuildURLOptions, id: string, modelName: string): string {
  return _buildURL(options, modelName, id);
}

/**
   Builds a URL for a `record.save()` call when the record was created
   locally using `store.createRecord()`.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForCreateRecord(modelName) {
       return super.urlForCreateRecord(...arguments) + '/new';
     }
   }
   ```

   @method urlForCreateRecord
    @public
   @param {String} modelName
   @return {String} url
   */
function urlForCreateRecord(options: BuildURLOptions, modelName: string): string {
  return _buildURL(options, modelName);
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
   @return {String} url
   */
function urlForUpdateRecord(options: BuildURLOptions, id: string, modelName: string): string {
  return _buildURL(options, modelName, id);
}

/**
   Builds a URL for a `record.save()` call when the record has been deleted locally.

   Example:

   ```app/adapters/application.js
   import RESTAdapter from '@ember-data/adapter/rest';

   export default class ApplicationAdapter extends RESTAdapter {
     urlForDeleteRecord(id, modelName) {
       return super.urlForDeleteRecord(...arguments) + '/destroy';
     }
   }
   ```

   @method urlForDeleteRecord
    @public
   @param {String} id
   @param {String} modelName
   @return {String} url
   */
function urlForDeleteRecord(options: BuildURLOptions, id: string, modelName: string): string {
  return _buildURL(options, modelName, id);
}

/**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentURL
    @return {String} urlPrefix
  */
function urlPrefix(options: BuildURLOptions, path?: string | null, parentURL?: string): string {
  let { host, namespace } = options;

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
    import { decamelize, pluralize } from '<app-name>/utils/string-utils';

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
function pathForType(options: BuildURLOptions, modelName: string): string {
  let camelized = camelize(modelName);
  return pluralize(camelized);
}

export {
  buildURL,
}
