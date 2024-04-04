import { assert } from '@ember/debug';

import type { StoreRequestInput } from '@ember-data/store';
import type { QueryOptions } from '@ember-data/store/-types/q/store';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { SkipCache } from '@warp-drive/core-types/request';

import { normalizeModelName } from './utils';

export type QueryRequestInput = StoreRequestInput & {
  op: 'query';
  data: {
    type: string;
    query: Record<string, unknown>;
    options: QueryBuilderOptions;
  };
};

export type QueryBuilderOptions = QueryOptions;

/**
  This function builds a request config for a given type and query object.
  When passed to `store.request`, this config will result in the same behavior as a `store.query` request.
  Additionally, it takes the same options as `store.query`.

  @since x.x.x
  @method query
  @public
  @param {String} type the name of the resource
  @param {object} query a query to be used by the adapter
  @param {QueryBuilderOptions} options optional, may include `adapterOptions` hash which will be passed to adapter.query
  @return {QueryRequestInput} request config
*/
export function queryBuilder<T>(
  type: TypeFromInstance<T>,
  query: Record<string, unknown>,
  options?: QueryBuilderOptions
): QueryRequestInput;
export function queryBuilder(
  type: string,
  query: Record<string, unknown>,
  options?: QueryBuilderOptions
): QueryRequestInput;
export function queryBuilder(
  type: string,
  query: Record<string, unknown>,
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
    cacheOptions: { [SkipCache as symbol]: true },
  };
}

export type QueryRecordRequestInput = StoreRequestInput & {
  op: 'queryRecord';
  data: {
    type: string;
    query: Record<string, unknown>;
    options: QueryBuilderOptions;
  };
};

/**
  This function builds a request config for a given type and query object.
  When passed to `store.request`, this config will result in the same behavior as a `store.queryRecord` request.
  Additionally, it takes the same options as `store.queryRecord`.

  @since x.x.x
  @method query
  @public
  @param {String} type the name of the resource
  @param {object} query a query to be used by the adapter
  @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter.query
  @return {QueryRecordRequestInput} request config
*/
export function queryRecordBuilder(
  modelName: string,
  query: Record<string, unknown>,
  options?: QueryBuilderOptions
): QueryRecordRequestInput {
  assert(`You need to pass a model name to the queryRecord builder`, modelName);
  assert(`You need to pass a query hash to the queryRecord builder`, query);
  assert(
    `Model name passed to the queryRecord builder must be a dasherized string instead of ${modelName}`,
    typeof modelName === 'string'
  );

  return {
    op: 'queryRecord',
    data: {
      type: normalizeModelName(modelName),
      query,
      options: options || {},
    },
    cacheOptions: { [SkipCache as symbol]: true },
  };
}
