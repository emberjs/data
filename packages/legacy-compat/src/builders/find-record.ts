/**
 * @module @ember-data/legacy-compat/builders
 */
import { assert } from '@ember/debug';

import type { StoreRequestInput } from '@ember-data/store';
import { constructResource, ensureStringId } from '@ember-data/store/-private';
import type { BaseFinderOptions, FindRecordOptions } from '@ember-data/store/-types/q/store';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { SkipCache } from '@warp-drive/core-types/request';
import type { ResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';

import { isMaybeIdentifier, normalizeModelName } from './utils';

export type FindRecordRequestInput = StoreRequestInput & {
  op: 'findRecord';
  data: {
    record: ResourceIdentifierObject;
    options: FindRecordBuilderOptions;
  };
};

export type FindRecordBuilderOptions = Omit<FindRecordOptions, 'preload'>;

/**
  This function builds a request config to find the record for a given identifier or type and id combination.
  When passed to `store.request`, this config will result in the same behavior as a `store.findRecord` request.
  Additionally, it takes the same options as `store.findRecord`, with the exception of `preload` (which is unsupported).

  **Example 1**

  ```app/routes/post.js
  import Route from '@ember/routing/route';
  import { findRecord } from '@ember-data/legacy-compat/builders';

  export default class PostRoute extends Route {
    model({ post_id }) {
      return this.store.request(findRecord('post', post_id));
    }
  }
  ```

  **Example 2**

  `findRecord` can be called with a single identifier argument instead of the combination
  of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
  the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

  ```app/routes/post.js
  import Route from '@ember/routing/route';
  import { findRecord } from '@ember-data/legacy-compat/builders';

  export default class PostRoute extends Route {
    model({ post_id: id }) {
      return this.store.request(findRecord({ type: 'post', id }).content;
    }
  }
  ```

  @method findRecord
  @public
  @static
  @for @ember-data/legacy-compat/builders
  @param {string|object} type - either a string representing the name of the resource or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
  @param {string|number|object} id - optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved
  @param {FindRecordBuilderOptions} [options] - if the first param is a string this will be the optional options for the request. See examples for available options.
  @return {FindRecordRequestInput} request config
*/
export function findRecordBuilder<T>(
  resource: TypeFromInstance<T>,
  id: string,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecordBuilder(
  resource: string,
  id: string,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecordBuilder<T>(
  resource: ResourceIdentifierObject<TypeFromInstance<T>>,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecordBuilder(
  resource: ResourceIdentifierObject,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecordBuilder(
  resource: string | ResourceIdentifierObject,
  idOrOptions?: string | BaseFinderOptions,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput {
  assert(
    `You need to pass a modelName or resource identifier as the first argument to the findRecord builder`,
    resource
  );
  if (isMaybeIdentifier(resource)) {
    options = idOrOptions as BaseFinderOptions | undefined;
  } else {
    assert(
      `You need to pass a modelName or resource identifier as the first argument to the findRecord builder (passed ${resource})`,
      typeof resource === 'string'
    );
    const type = normalizeModelName(resource);
    const normalizedId = ensureStringId(idOrOptions as string | number);
    resource = constructResource(type, normalizedId);
  }

  options = options || {};

  assert('findRecord builder does not support options.preload', !(options as FindRecordOptions).preload);

  return {
    op: 'findRecord' as const,
    data: {
      record: resource,
      options,
    },
    cacheOptions: { [SkipCache as symbol]: true },
  };
}
