/**
 * @module @warp-drive/ember
 */
import { ReactiveDocument } from '../../../reactive/-private/document.ts';
import { type Future } from '../../../request.ts';
import type { StructuredErrorDocument } from '../../../types/request.ts';
import { Link } from '../../../types/spec/json-api-raw.ts';
import { defineSignal, memoized } from './reactivity/signal';
import { getRequestState, RequestCacheRequestState } from './request-state.ts';

const RequestCache = new WeakMap<Future<unknown>, PaginationState>();

function getHref(link?: Link | null): string | null {
  if (!link) {
    return null;
  }
  if (typeof link === 'string') {
    return link;
  }
  return link.href;
}

export class PaginationState<RT = unknown, T = unknown, E = unknown> {
  declare pages: Readonly<RequestCacheRequestState<RT, T, StructuredErrorDocument<E>>>[];
  declare data: RT[];
  declare initialRequest: Future<RT> | null;
  declare initialState: RequestCacheRequestState<RT, T, StructuredErrorDocument<E>>;
  declare prevRequest: Future<RT> | null;
  declare nextRequest: Future<RT> | null;

  constructor(request: Future<RT>) {
    const state = getRequestState<RT, T, E>(request);
    this.initialRequest = request;
    this.initialState = state;
    this.pages = [state];
    this.data = [];
    request.then((result) => {
      const content = result.content as ReactiveDocument<RT[]>;
      if (content.data) {
        this.addData(content.data, 'append');
      }
      return result;
    });
  }

  @memoized
  get isLoading(): boolean {
    return this.initialState.isLoading;
  }

  @memoized
  get isSuccess(): boolean {
    return this.initialState.isSuccess;
  }

  @memoized
  get isError(): boolean {
    return this.initialState.isError;
  }

  @memoized
  get prev(): string | null {
    const page = this.pages.at(0);
    const content = page?.value as ReactiveDocument<T[]>;
    return getHref(content?.links?.prev);
  }

  @memoized
  get next(): string | null {
    const page = this.pages.at(-1);
    const content = page?.value as ReactiveDocument<T[]>;
    return getHref(content?.links?.next);
  }

  loadPrev = (request: Future<unknown>): void => {
    this.prevRequest = request
      .then((result) => {
        const content = result.content as ReactiveDocument<RT[]>;
        if (content.data) {
          this.addData(content.data, 'prepend');
        }
        return result;
      })
      .finally(() => {
        this.prevRequest = null;
      }) as Future<RT>;
    this.pages = [getRequestState<RT, T, E>(request as Future<RT>), ...this.pages];
  };

  loadNext = (request: Future<unknown>): void => {
    this.nextRequest = request
      .then((result) => {
        const content = result.content as ReactiveDocument<RT[]>;
        if (content.data) {
          this.addData(content.data, 'append');
        }
        return result;
      })
      .finally(() => {
        this.nextRequest = null;
      }) as Future<RT>;
    this.pages = [...this.pages, getRequestState<RT, T, E>(request as Future<RT>)];
  };

  addData = (data: unknown[], behavior: 'prepend' | 'append'): void => {
    if (behavior === 'prepend') {
      this.data = [...(data as RT[]), ...this.data];
    } else {
      this.data = [...this.data, ...(data as RT[])];
    }
  };
}

defineSignal(PaginationState.prototype, 'pages', undefined);
defineSignal(PaginationState.prototype, 'data', undefined);
defineSignal(PaginationState.prototype, 'initialRequest', undefined);
defineSignal(PaginationState.prototype, 'prevRequest', undefined);
defineSignal(PaginationState.prototype, 'nextRequest', undefined);

/**
 * Get the pagination state for a given request, this will return the same
 * PaginationState instance for the same request, even if the future is
 * a different instance based on the cache identity of the request.
 *
 * ```ts
 * import { getPaginationState } from '@warp-drive/ember';
 *
 * const future = store.request(query('user', { page: { size: 10 } }));
 * const state = getPaginationState(future);
 * ```
 *
 * @public
 * @static
 * @for @warp-drive/ember
 * @param future
 * @return {PaginationState}
 */
export function getPaginationState<RT, T, E>(
  future: Future<RT>
): Readonly<PaginationState<RT, T, StructuredErrorDocument<E>>> {
  let state = RequestCache.get(future);

  if (!state) {
    state = new PaginationState<RT, T, E>(future);
    RequestCache.set(future, state);
  }

  return state as Readonly<PaginationState<RT, T, StructuredErrorDocument<E>>>;
}
