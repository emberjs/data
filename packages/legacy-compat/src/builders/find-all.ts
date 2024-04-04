import { assert } from '@ember/debug';

import type { StoreRequestInput } from '@ember-data/store';
import type { FindAllOptions } from '@ember-data/store/-types/q/store';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { SkipCache } from '@warp-drive/core-types/request';

import { normalizeModelName } from './utils';

export type FindAllRequestInput = StoreRequestInput & {
  op: 'findAll';
  data: {
    type: string;
    options: FindAllBuilderOptions;
  };
};

export type FindAllBuilderOptions = FindAllOptions;

/**
  This function builds a request config for the given type.
  When passed to `store.request`, this config will result in the same behavior as a `store.findAll` request.
  Additionally, it takes the same options as `store.findAll`.

  @since x.x.x
  @method query
  @public
  @param {String} type the name of the resource
  @param {object} query a query to be used by the adapter
  @param {FindAllBuilderOptions} options optional, may include `adapterOptions` hash which will be passed to adapter.query
  @return {FindAllRequestInput} request config
*/
export function findAllBuilder<T>(type: TypeFromInstance<T>, options?: FindAllBuilderOptions): FindAllRequestInput;
export function findAllBuilder(type: string, options?: FindAllBuilderOptions): FindAllRequestInput;
export function findAllBuilder<T>(
  type: TypeFromInstance<T> | string,
  options: FindAllBuilderOptions = {}
): FindAllRequestInput {
  assert(`You need to pass a model name to the findAll builder`, type);
  assert(
    `Model name passed to the findAll builder must be a dasherized string instead of ${type}`,
    typeof type === 'string'
  );

  return {
    op: 'findAll',
    data: {
      type: normalizeModelName(type),
      options: options || {},
    },
    cacheOptions: { [SkipCache as symbol]: true },
  };
}
