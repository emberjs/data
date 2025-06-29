import type { Store } from '@warp-drive/core';
import type { StableDocumentIdentifier } from '@warp-drive/core/types/identifier';
import type {
  ImmutableCreateRequestOptions,
  ImmutableDeleteRequestOptions,
  ImmutableRequestInfo,
  ImmutableUpdateRequestOptions,
  StructuredDataDocument,
} from '@warp-drive/core/types/request';
import type { ApiError } from '@warp-drive/core/types/spec/error';

export const MUTATION_OPS: Set<string> = new Set(['createRecord', 'updateRecord', 'deleteRecord']);

/**
 * In a Worker, any time we are asked to make a request, data needs to be returned.
 * background requests are ergo no different than foreground requests.
 * @internal
 */
export function calcShouldFetch(
  store: Store,
  request: ImmutableRequestInfo,
  hasCachedValue: boolean,
  identifier: StableDocumentIdentifier | null
): boolean {
  const { cacheOptions } = request;
  return (
    (request.op && MUTATION_OPS.has(request.op)) ||
    cacheOptions?.reload ||
    cacheOptions?.backgroundReload ||
    !hasCachedValue ||
    (store.lifetimes && identifier
      ? store.lifetimes.isHardExpired(identifier, store) || store.lifetimes.isSoftExpired(identifier, store)
      : false)
  );
}

export function isMutation(
  request: Partial<ImmutableRequestInfo>
): request is ImmutableUpdateRequestOptions | ImmutableCreateRequestOptions | ImmutableDeleteRequestOptions {
  return Boolean(request.op && MUTATION_OPS.has(request.op));
}

export function isCacheAffecting<T>(document: StructuredDataDocument<T>): boolean {
  if (!isMutation(document.request)) {
    return true;
  }
  // a mutation combined with a 204 has no cache impact when no known records were involved
  // a createRecord with a 201 with an empty response and no known records should similarly
  // have no cache impact

  if (document.request.op === 'createRecord' && document.response?.status === 201) {
    return document.content ? Object.keys(document.content).length > 0 : false;
  }

  return document.response?.status !== 204;
}

function isAggregateError(error: Error & { errors?: ApiError[] }): error is AggregateError & { errors: ApiError[] } {
  return error instanceof AggregateError || (error.name === 'AggregateError' && Array.isArray(error.errors));
}

type RobustError = Error & { error: string | object; errors?: ApiError[]; content?: unknown };

// TODO @runspired, consider if we should deep freeze errors (potentially only in debug) vs cloning them
export function cloneError(error: RobustError): RobustError {
  const isAggregate = isAggregateError(error);

  const cloned = (
    isAggregate ? new AggregateError(structuredClone(error.errors), error.message) : new Error(error.message)
  ) as RobustError;
  cloned.stack = error.stack!;
  cloned.error = error.error;

  // copy over enumerable properties
  Object.assign(cloned, error);

  return cloned;
}
