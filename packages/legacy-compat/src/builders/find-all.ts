/**
 * @module @ember-data/legacy-compat/builders
 */
import { assert } from '@ember/debug';

import { SkipCache } from '@ember-data/request';
import type { ImmutableRequestInfo } from '@ember-data/request/-private/types';

import { normalizeModelName } from './utils';

// Keeping unused generics for consistency with 5x types
type FindAllRequestInput<T extends string = string> = ImmutableRequestInfo & {
  op: 'findAll';
  data: {
    type: T;
    options: FindAllBuilderOptions;
  };
};

type FindAllBuilderOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string | string[];
  adapterOptions?: Record<string, unknown>;
};

/**
  This function builds a request config to perform a `findAll` request for the given type.
  When passed to `store.request`, this config will result in the same behavior as a `store.findAll` request.
  Additionally, it takes the same options as `store.findAll`.

  All `@ember-data/legacy-compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
  This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
  To that end, these builders are deprecated and will be removed in a future version of Ember Data.

  @method findAll
  @deprecated
  @public
  @static
  @for @ember-data/legacy-compat/builders
  @param {string} type the name of the resource
  @param {object} query a query to be used by the adapter
  @param {FindAllBuilderOptions} [options] optional, may include `adapterOptions` hash which will be passed to adapter.findAll
  @return {FindAllRequestInput} request config
*/
export function findAllBuilder(type: string, options?: FindAllBuilderOptions): FindAllRequestInput<string>;
export function findAllBuilder(type: string, options?: FindAllBuilderOptions): FindAllRequestInput;
export function findAllBuilder(type: string, options: FindAllBuilderOptions = {}): FindAllRequestInput {
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
