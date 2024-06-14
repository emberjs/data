import type { ImmutableRequestInfo, RequestContext } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LifetimesService {
  isHardExpired(identifier: StableDocumentIdentifier): boolean;
  isSoftExpired(identifier: StableDocumentIdentifier): boolean;
}

export type StoreRequestInfo = ImmutableRequestInfo;
export type LooseStoreRequestInfo = Omit<StoreRequestInfo, 'records'> & { records: ResourceIdentifierObject[] };
export type StoreRequestInput = StoreRequestInfo | LooseStoreRequestInfo;

export interface StoreRequestContext extends RequestContext {
  request: StoreRequestInfo & { store: Store };
}

export function calcShouldFetch(
  store: Store,
  request: StoreRequestInfo,
  hasCachedValue: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;

  return (
    cacheOptions?.reload ||
    !hasCachedValue ||
    (store.lifetimes && identifier ? store.lifetimes.isHardExpired(identifier) : false)
  );
}

export function calcShouldBackgroundFetch(
  store: Store,
  request: StoreRequestInfo,
  willFetch: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;
  return (
    !willFetch &&
    (cacheOptions?.backgroundReload ||
      (store.lifetimes && identifier ? store.lifetimes.isSoftExpired(identifier) : false))
  );
}
