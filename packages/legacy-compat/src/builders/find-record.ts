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

export function findRecord<T>(
  resource: TypeFromInstance<T>,
  id: string,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecord(resource: string, id: string, options?: FindRecordBuilderOptions): FindRecordRequestInput;
export function findRecord<T>(
  resource: ResourceIdentifierObject<TypeFromInstance<T>>,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecord(
  resource: ResourceIdentifierObject,
  options?: FindRecordBuilderOptions
): FindRecordRequestInput;
export function findRecord(
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
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${resource}`,
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
