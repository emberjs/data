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

export function queryBuilder<T>(
  type: TypeFromInstance<T>,
  query: Record<string, unknown>,
  options?: QueryOptions
): QueryRequestInput;
export function queryBuilder(type: string, query: Record<string, unknown>, options?: QueryOptions): QueryRequestInput;
export function queryBuilder(
  type: string,
  query: Record<string, unknown>,
  options: QueryOptions = {}
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
