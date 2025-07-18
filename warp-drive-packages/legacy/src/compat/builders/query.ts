import type { StoreRequestInput } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type { LegacyResourceQuery, QueryOptions } from '@warp-drive/core/types';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import { SkipCache } from '@warp-drive/core/types/request';
import type { RequestSignature } from '@warp-drive/core/types/symbols';

import { normalizeModelName } from './utils.ts';

type QueryRequestInput<T extends string = string, RT = unknown[]> = StoreRequestInput & {
  op: 'query';
  data: {
    type: T;
    query: LegacyResourceQuery;
    options: QueryBuilderOptions;
  };
  [RequestSignature]?: RT;
};

type QueryBuilderOptions = QueryOptions;

/**
  This function builds a request config for a given type and query object.
  When passed to `store.request`, this config will result in the same behavior as a `store.query` request.
  Additionally, it takes the same options as `store.query`.

  All `@ember-data/legacy-compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
  This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
  To that end, these builders are deprecated and will be removed in a future version of Ember Data.

  @deprecated
  @public
  @param {String} type the name of the resource
  @param {Object} query a query to be used by the adapter
  @param {QueryBuilderOptions} [options] optional, may include `adapterOptions` hash which will be passed to adapter.query
  @return {QueryRequestInput} request config
*/
export function queryBuilder<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  query: LegacyResourceQuery,
  options?: QueryBuilderOptions
): QueryRequestInput<TypeFromInstance<T>, T[]>;
export function queryBuilder(
  type: string,
  query: LegacyResourceQuery,
  options?: QueryBuilderOptions
): QueryRequestInput;
export function queryBuilder(
  type: string,
  query: LegacyResourceQuery,
  options: QueryBuilderOptions = {}
): QueryRequestInput {
  assert(`You need to pass a model name to the query builder`, type);
  assert(`You need to pass a query hash to the query builder`, query);
  assert(
    `Model name passed to the query builder must be a dasherized string instead of ${type}`,
    typeof type === 'string'
  );

  return {
    op: 'query' as const,
    data: {
      type: normalizeModelName(type),
      query,
      options: options,
    },
    cacheOptions: { [SkipCache]: true },
  };
}

type QueryRecordRequestInput<T extends string = string, RT = unknown> = StoreRequestInput & {
  op: 'queryRecord';
  data: {
    type: T;
    query: LegacyResourceQuery;
    options: QueryBuilderOptions;
  };
  [RequestSignature]?: RT;
};

/**
  This function builds a request config for a given type and query object.
  When passed to `store.request`, this config will result in the same behavior as a `store.queryRecord` request.
  Additionally, it takes the same options as `store.queryRecord`.

  All `@ember-data/legacy-compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
  This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
  To that end, these builders are deprecated and will be removed in a future version of Ember Data.

  @deprecated
  @public
  @param {String} type the name of the resource
  @param {Object} query a query to be used by the adapter
  @param {QueryBuilderOptions} [options] optional, may include `adapterOptions` hash which will be passed to adapter.query
  @return {QueryRecordRequestInput} request config
*/
export function queryRecordBuilder<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  query: LegacyResourceQuery,
  options?: QueryBuilderOptions
): QueryRecordRequestInput<TypeFromInstance<T>, T | null>;
export function queryRecordBuilder(
  type: string,
  query: LegacyResourceQuery,
  options?: QueryBuilderOptions
): QueryRecordRequestInput;
export function queryRecordBuilder(
  type: string,
  query: LegacyResourceQuery,
  options?: QueryBuilderOptions
): QueryRecordRequestInput {
  assert(`You need to pass a model name to the queryRecord builder`, type);
  assert(`You need to pass a query hash to the queryRecord builder`, query);
  assert(
    `Model name passed to the queryRecord builder must be a dasherized string instead of ${type}`,
    typeof type === 'string'
  );

  return {
    op: 'queryRecord',
    data: {
      type: normalizeModelName(type),
      query,
      options: options || {},
    },
    cacheOptions: { [SkipCache]: true },
  };
}
