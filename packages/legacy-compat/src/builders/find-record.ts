/**
 * @module @ember-data/legacy-compat/builders
 */
import { assert } from '@ember/debug';

import type { StoreRequestInput } from '@ember-data/store';
import { constructResource, ensureStringId } from '@ember-data/store/-private';
import type { BaseFinderOptions, FindRecordOptions } from '@ember-data/store/-types/q/store';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core-types/record';
import { SkipCache } from '@warp-drive/core-types/request';
import type { ResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';
import type { RequestSignature } from '@warp-drive/core-types/symbols';

import { isMaybeIdentifier, normalizeModelName } from './utils';

type FindRecordRequestInput<T extends string = string, RT = unknown> = StoreRequestInput & {
  op: 'findRecord';
  data: {
    record: ResourceIdentifierObject<T>;
    options: FindRecordBuilderOptions;
  };
  [RequestSignature]?: RT;
};

type FindRecordBuilderOptions = Omit<FindRecordOptions, 'preload'>;

/**
  This function builds a request config to find the record for a given identifier or type and id combination.
  When passed to `store.request`, this config will result in the same behavior as a `store.findRecord` request.
  Additionally, it takes the same options as `store.findRecord`, with the exception of `preload` (which is unsupported).

  **Example 1**

  ```ts
  import { findRecord } from '@ember-data/legacy-compat/builders';
  const { content: post } = await store.request<Post>(findRecord<Post>('post', '1'));
  ```

  **Example 2**

  `findRecord` can be called with a single identifier argument instead of the combination
  of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
  the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

  ```ts
  import { findRecord } from '@ember-data/legacy-compat/builders';
  const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id }));
  ```

  All `@ember-data/legacy-compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
  This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
  To that end, these builders are deprecated and will be removed in a future version of Ember Data.

  @method findRecord
  @deprecated
  @public
  @static
  @for @ember-data/legacy-compat/builders
  @param {string|object} type - either a string representing the name of the resource or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
  @param {string|number|object} id - optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved
  @param {FindRecordBuilderOptions} [options] - if the first param is a string this will be the optional options for the request. See examples for available options.
  @return {FindRecordRequestInput} request config
*/
export function findRecordBuilder<T extends TypedRecordInstance>(
  resource: TypeFromInstance<T>,
  id: string,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput<TypeFromInstance<T>, T>;
export function findRecordBuilder(
  resource: string,
  id: string,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecordBuilder<T extends TypedRecordInstance>(
  resource: ResourceIdentifierObject<TypeFromInstance<T>>,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput<TypeFromInstance<T>, T>;
export function findRecordBuilder(
  resource: ResourceIdentifierObject,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecordBuilder(
  resource: string | ResourceIdentifierObject,
  idOrOptions?: string | FindRecordBuilderOptions,
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
