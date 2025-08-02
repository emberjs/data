import { assert } from '@warp-drive/build-config/macros';

import type { Awaitable, Future } from '../../../request.ts';
import { getPromiseResult, setPromiseResult } from '../../../request.ts';
import type { RequestManager } from '../../../request/-private/manager.ts';
import type {
  ImmutableRequestInfo,
  RequestInfo,
  ResponseInfo,
  StructuredDataDocument,
  StructuredErrorDocument,
} from '../../../types/request.ts';
import type { Store } from '../store-service.ts';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { PendingPromise, PromiseState, RejectedPromise, ResolvedPromise } from './promise-state.ts';
import { defineNonEnumerableSignal, defineSignal } from './reactivity/signal.ts';

const RequestCache = new WeakMap<Future<unknown>, RequestCacheRequestState>();

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

interface PrivateLoadingState {
  _sizeHint: number;
  _bytesLoaded: number;
  _startTime: number;
  _endTime: number;
  _lastPacketTime: number;
  _isPending: boolean;
  _isStarted: boolean;
  _isComplete: boolean;
  _isCancelled: boolean;
  _isErrored: boolean;
  _error: Error | null;
  _stream: TransformStream | null;
  _future: Future<unknown>;
  _triggered: boolean;
}

function upgradeLoadingState(state: unknown): PrivateLoadingState {
  return state as PrivateLoadingState;
}

async function watchStream(stream: ReadableStream<Uint8Array>, loadingState: RequestLoadingState): Promise<void> {
  const state = upgradeLoadingState(loadingState);
  const reader = stream.getReader();
  let bytesLoaded = 0;
  let shouldForward = state._stream !== null && state._stream.readable.locked;
  let isForwarding = shouldForward;
  let writer = state._stream?.writable.getWriter();
  const buffer = [];

  state._isPending = false;
  state._isStarted = true;
  state._startTime = performance.now();

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    bytesLoaded += value.byteLength;
    state._bytesLoaded = bytesLoaded;
    state._lastPacketTime = performance.now();

    shouldForward = shouldForward || (state._stream !== null && state._stream.readable.locked);

    if (shouldForward) {
      if (!isForwarding) {
        isForwarding = true;
        writer = state._stream!.writable.getWriter();
        for (const item of buffer) {
          await writer.ready;
          await writer.write(item);
        }
        buffer.length = 0;
      }
      await writer!.ready;
      await writer!.write(value);
    } else {
      buffer.push(value);
    }
  }

  // if we are still forwarding, we need to close the writer
  if (isForwarding) {
    await writer!.ready;
    await writer!.close();
  } else if (state._stream) {
    // if we are not forwarding, we need to cancel the stream
    await state._stream.readable.cancel('The Stream Has Already Ended');
    state._stream = null;
  }

  const endTime = performance.now();
  state._endTime = endTime;
  state._isComplete = true;
  state._isStarted = false;
}

/**
 * Lazily consumes the stream of a request, providing a number of
 * reactive properties that can be used to build UIs that respond
 * to the progress of a request.
 *
 * @hideconstructor
 */
export class RequestLoadingState {
  declare private _sizeHint: number;
  declare private _bytesLoaded: number;
  declare private _startTime: number;
  declare private _endTime: number;
  declare private _lastPacketTime: number;
  declare private _isPending: boolean;
  declare private _isStarted: boolean;
  declare private _isComplete: boolean;
  declare private _isCancelled: boolean;
  declare private _isErrored: boolean;
  declare private _error: Error | null;

  private _stream: TransformStream | null = null;
  private _future: Future<unknown>;
  private _triggered = false;
  private _trigger() {
    if (this._triggered) {
      return;
    }
    this._triggered = true;
    const future = this._future;
    const promise: Promise<ReadableStream<Uint8Array> | null> & { sizeHint?: number } = future.getStream();
    if (promise.sizeHint) {
      this._sizeHint = promise.sizeHint;
    }
    this.promise = promise.then(
      (stream) => {
        if (!stream) {
          this._isPending = false;
          this._isComplete = true;
          return;
        }
        return watchStream(stream, this);
      },
      (error: Error) => {
        this._isPending = false;
        this._isStarted = false;
        if (isAbortError(error)) {
          this._isCancelled = true;
          this._isComplete = true;
        }
        this._isErrored = true;
        this._error = error;
      }
    );
  }

  promise: Promise<void> | null = null;

  get isPending(): boolean {
    this._trigger();
    return this._isPending;
  }

  get sizeHint(): number {
    this._trigger();
    return this._sizeHint;
  }

  get stream(): ReadableStream | null {
    this._trigger();
    if (!this._stream) {
      if (this._isComplete || this._isCancelled || this._isErrored) {
        return null;
      }
      this._stream = new TransformStream();
    }
    return this._stream.readable;
  }

  get isStarted(): boolean {
    this._trigger();
    return this._isStarted;
  }

  get bytesLoaded(): number {
    this._trigger();
    return this._bytesLoaded;
  }

  get startTime(): number {
    this._trigger();
    return this._startTime;
  }

  get endTime(): number {
    this._trigger();
    return this._endTime;
  }

  get lastPacketTime(): number {
    this._trigger();
    return this._lastPacketTime;
  }

  get isComplete(): boolean {
    this._trigger();
    return this._isComplete;
  }

  get isCancelled(): boolean {
    this._trigger();
    return this._isCancelled;
  }

  get isErrored(): boolean {
    this._trigger();
    return this._isErrored;
  }

  get error(): Error | null {
    this._trigger();
    return this._error;
  }

  get elapsedTime(): number {
    return (this.endTime || this.lastPacketTime) - this.startTime;
  }

  get completedRatio(): number {
    return this.sizeHint ? this.bytesLoaded / this.sizeHint : 0;
  }

  get remainingRatio(): number {
    return 1 - this.completedRatio;
  }

  get duration(): number {
    return this.endTime - this.startTime;
  }

  get speed(): number {
    // bytes per second
    return this.bytesLoaded / (this.elapsedTime / 1000);
  }

  constructor(future: Future<unknown>) {
    this._future = future;
  }

  abort = (): void => {
    this._future.abort();
  };
}
defineNonEnumerableSignal(RequestLoadingState.prototype, '_isPending', true);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_isStarted', false);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_isComplete', false);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_isCancelled', false);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_isErrored', false);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_error', null);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_sizeHint', 0);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_bytesLoaded', 0);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_startTime', 0);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_endTime', 0);
defineNonEnumerableSignal(RequestLoadingState.prototype, '_lastPacketTime', 0);

/**
 * The state of a request in the "pending"
 * state. This is the default initial state.
 *
 * Extends the {@link PendingPromise} interface.
 *
 */
export interface PendingRequest extends PendingPromise {
  /**
   * Whether the request is cancelled.
   *
   */
  isCancelled: false;

  loadingState: RequestLoadingState;
  request: null;
  response: null;
}
/**
 * The state of a request in the "fulfilled" state.
 * This is the state of a request that has resolved
 * successfully.
 *
 * Extends the {@link ResolvedPromise} interface.
 *
 */
export interface ResolvedRequest<RT> extends ResolvedPromise<RT> {
  /**
   * Retries the request with high (blocking) priority. This is the
   * same as having passed `cacheOptions.reload = true` on the original
   * request.
   *
   * This will not change the existing request's state. To subscribe
   * to the new request's state, use `getRequestState` on the returned
   * {@link Future}.
   *
   * ```ts
   * const future = state.reload();
   * const state = getRequestState(future);
   * ```
   *
   * It is safe to pass this around as an "action" or "event" handler
   * as its context is bound.
   */
  reload(): Future<RT>;
  /**
   * Retries the request with low (non-blocking) priority. This is the
   * same as having passed `cacheOptions.backgroundReload = true` on the original
   * request.
   *
   * This will not change the existing request's state. To subscribe
   * to the new request's state, use `getRequestState` on the returned
   * {@link Future}.
   *
   * ```ts
   * const future = state.reload();
   * const state = getRequestState(future);
   * ```
   *
   * It is safe to pass this around as an "action" or "event" handler
   * as its context is bound.
   */
  refresh(usePolicy?: boolean): Future<RT>;

  /**
   * Whether the request is cancelled.
   *
   */
  isCancelled: false;

  /**
   * A lazily created {@link RequestLoadingState} instance
   * which provides a number of reactive properties that can be used
   * to build UIs that respond to the progress of a request.
   */
  loadingState: RequestLoadingState;
  request: ImmutableRequestInfo<RT> | null;
  response: Response | ResponseInfo | null;
}
/**
 * The state of a request in the "rejected" state.
 * This is the state of a request that has rejected
 * with an error.
 *
 * Extends the {@link RejectedPromise} interface.
 *
 */
export interface RejectedRequest<RT, E extends StructuredErrorDocument = StructuredErrorDocument>
  extends RejectedPromise<E> {
  /**
   * Retries the request with high (blocking) priority. This is the
   * same as having passed `cacheOptions.reload = true` on the original
   * request.
   *
   * This will not change the existing request's state. To subscribe
   * to the new request's state, use `getRequestState` on the returned
   * {@link Future}.
   *
   * ```ts
   * const future = state.reload();
   * const state = getRequestState(future);
   * ```
   *
   * It is safe to pass this around as an "action" or "event" handler
   * as its context is bound.
   */
  reload(): Future<RT>;
  /**
   * Retries the request with low (non-blocking) priority. This is the
   * same as having passed `cacheOptions.backgroundReload = true` on the original
   * request.
   *
   * This will not change the existing request's state. To subscribe
   * to the new request's state, use `getRequestState` on the returned
   * {@link Future}.
   *
   * ```ts
   * const future = state.reload();
   * const state = getRequestState(future);
   * ```
   *
   * It is safe to pass this around as an "action" or "event" handler
   * as its context is bound.
   */
  refresh(usePolicy?: boolean): Future<RT>;

  /**
   * Whether the request is cancelled.
   *
   */
  isCancelled: false;

  loadingState: RequestLoadingState;
  request: ImmutableRequestInfo<RT> | null;
  response: Response | ResponseInfo | null;
}
/**
 * The state of a request in the "cancelled" state.
 * This is the state of a promise that has been
 * cancelled.
 *
 */
export interface CancelledRequest<RT, E extends StructuredErrorDocument = StructuredErrorDocument> {
  /**
   * Retries the request with high (blocking) priority. This is the
   * same as having passed `cacheOptions.reload = true` on the original
   * request.
   *
   * This will not change the existing request's state. To subscribe
   * to the new request's state, use `getRequestState` on the returned
   * {@link Future}.
   *
   * ```ts
   * const future = state.reload();
   * const state = getRequestState(future);
   * ```
   *
   * It is safe to pass this around as an "action" or "event" handler
   * as its context is bound.
   */
  reload(): Future<RT>;
  /**
   * Retries the request with low (non-blocking) priority. This is the
   * same as having passed `cacheOptions.backgroundReload = true` on the original
   * request.
   *
   * This will not change the existing request's state. To subscribe
   * to the new request's state, use `getRequestState` on the returned
   * {@link Future}.
   *
   * ```ts
   * const future = state.reload();
   * const state = getRequestState(future);
   * ```
   *
   * It is safe to pass this around as an "action" or "event" handler
   * as its context is bound.
   */
  refresh(usePolicy?: boolean): Future<RT>;

  /**
   * The status of the request.
   *
   */
  status: 'cancelled';

  /**
   * Whether the request is pending.
   *
   */
  isPending: false;

  /**
   * Whether the request is pending.
   *
   */
  isLoading: false;

  /**
   * Whether the request has resolved
   * successfully.
   *
   */
  isSuccess: false;

  /**
   * Whether the request has rejected
   * with an error.
   *
   */
  isError: true;

  /**
   * Once the request has resolved, this will
   * be the value the request resolved to.
   *
   */
  value: null;
  /**
   * Once the request has resolved, this will
   * be the value the request resolved to.
   *
   * @deprecated use `value` instead
   */
  result: null;

  /**
   * Once the request has rejected, this will
   * be the error the request rejected with.
   *
   *
   * @deprecated use `reason` instead
   */
  error: E;

  /**
   * Once the request has rejected, this will
   * be the error the request rejected with.
   *
   */
  reason: E;

  /**
   * Whether the request is cancelled.
   *
   */
  isCancelled: true;

  loadingState: RequestLoadingState;
  request: ImmutableRequestInfo<RT> | null;
  response: Response | ResponseInfo | null;
}

interface PrivateRequestState {
  _loadingState?: RequestLoadingState;
  _request: Future<unknown>;
}

/**
 * RequestState extends the concept of {@link PromiseState} to provide a reactive
 * wrapper for a request {@link Future} which allows you write declarative code
 * around a Future's control flow.
 *
 * It is useful in both Template and JavaScript contexts, allowing you
 * to quickly derive behaviors and data from pending, error and success
 * states.
 *
 * The key difference between a {@link Promise} and a Future is that Futures provide
 * access to a {@link ReadableStream | stream} of their content, the {@link RequestKey} of the request (if any)
 * as well as the ability to attempt to {@link Future.abort | abort} the request.
 *
 * ```ts
 * interface Future<T> extends Promise<T>> {
 *   getStream(): Promise<ReadableStream>;
 *   abort(): void;
 *   lid: RequestKey | null;
 * }
 * ```
 *
 * These additional APIs allow us to craft even richer state experiences.
 *
 * To get the state of a request, use {@link getRequestState}.
 *
 * See also:
 * - {@link PendingRequest}
 * - {@link ResolvedRequest}
 * - {@link RejectedRequest}
 * - {@link CancelledRequest}
 *
 */
export type RequestCacheRequestState<RT = unknown, E extends StructuredErrorDocument = StructuredErrorDocument> =
  | PendingRequest
  | ResolvedRequest<RT>
  | RejectedRequest<RT, E>
  | CancelledRequest<RT, E>;

const RequestStateProto = {};

function performRefresh<RT = unknown, E extends StructuredErrorDocument = StructuredErrorDocument>(
  requester: RequestManager | Store,
  doc: StructuredDataDocument<RT> | E,
  isReload: boolean | null
): Future<RT> {
  const { request } = doc;
  const req = Object.assign({}, request) as RequestInfo<RT>;
  const cacheOptions = Object.assign({}, req.cacheOptions);
  if (isReload) {
    // force direct to network
    cacheOptions.reload = true;
  } else if (isReload === false) {
    // delete reload to ensure we use backgroundReload / policy
    delete cacheOptions.reload;
    cacheOptions.backgroundReload = true;
  } else {
    // delete props to ensure we use the policy
    delete cacheOptions.backgroundReload;
    delete cacheOptions.reload;
  }
  req.cacheOptions = cacheOptions;
  return requester.request(req);
}

// TODO introduce a new mechanism for defining multiple properties
// that share a common signal
defineSignal(RequestStateProto, 'reason', null);
defineSignal(RequestStateProto, 'value', null);
defineSignal(RequestStateProto, 'result', null);
defineSignal(RequestStateProto, 'error', null);
defineSignal(RequestStateProto, 'status', 'pending');
defineSignal(RequestStateProto, 'isPending', true);
defineSignal(RequestStateProto, 'isLoading', true);
defineSignal(RequestStateProto, 'isSuccess', false);
defineSignal(RequestStateProto, 'isError', false);
defineSignal(RequestStateProto, 'request', null);
defineSignal(RequestStateProto, 'response', null);

Object.defineProperty(RequestStateProto, 'isCancelled', {
  get(this: RequestCacheRequestState): boolean {
    return this.isError && isAbortError(this.reason);
  },
});
Object.defineProperty(RequestStateProto, 'loadingState', {
  get(this: RequestCacheRequestState & PrivateRequestState): RequestLoadingState {
    if (!this._loadingState) {
      this._loadingState = new RequestLoadingState(this._request);
    }

    return this._loadingState;
  },
});

export function createRequestState<RT, E>(
  future: Future<RT>
): Readonly<RequestCacheRequestState<RT, StructuredErrorDocument<E>>> {
  const state = getPromiseResult(
    future as unknown as Awaitable<StructuredDataDocument<RT>, StructuredErrorDocument<E>>
  );
  const promiseState = Object.create(RequestStateProto) as RequestCacheRequestState<RT, StructuredErrorDocument<E>> &
    PrivateRequestState;
  promiseState._request = future;
  // @ts-expect-error - we still attach it for PendingState
  promiseState.reload = (): Future<RT> => {
    assert(
      `Cannot reload a request that is still pending. Await or abort the original request first.`,
      !promiseState.isPending
    );

    return performRefresh<RT, StructuredErrorDocument<E>>(
      future.requester,
      promiseState.isSuccess ? (promiseState.value as StructuredDataDocument<RT>) : promiseState.reason,
      true
    );
  };

  // @ts-expect-error - we still attach it for PendingState
  promiseState.refresh = (usePolicy: boolean = false): Future<RT> => {
    assert(
      `Cannot refresh a request that is still pending. Await or abort the original request first.`,
      !promiseState.isPending
    );

    return performRefresh<RT, StructuredErrorDocument<E>>(
      future.requester,
      promiseState.isSuccess ? (promiseState.value as StructuredDataDocument<RT>) : promiseState.reason,
      usePolicy === true ? null : false
    );
  };

  if (state) {
    if (state.isError) {
      promiseState.error = state.result;
      promiseState.reason = state.result;
      promiseState.status = 'rejected';
      promiseState.isError = true;
      promiseState.isPending = false;
      promiseState.isLoading = false;
      promiseState.request = state.result.request as ImmutableRequestInfo<RT>;
      promiseState.response = state.result.response;
    } else {
      promiseState.result = state.result.content;
      promiseState.value = state.result.content;
      promiseState.status = 'fulfilled';
      promiseState.isSuccess = true;
      promiseState.isPending = false;
      promiseState.isLoading = false;
      promiseState.request = state.result.request as ImmutableRequestInfo<RT>;
      promiseState.response = state.result.response;
    }
  } else {
    void future.then(
      (result) => {
        setPromiseResult(future, { isError: false, result });
        promiseState.result = result.content;
        promiseState.value = result.content;
        promiseState.status = 'fulfilled';
        promiseState.isSuccess = true;
        promiseState.isPending = false;
        promiseState.isLoading = false;
        promiseState.request = result.request as ImmutableRequestInfo<RT>;
        promiseState.response = result.response;
      },
      (error: StructuredErrorDocument<E>) => {
        setPromiseResult(future, { isError: true, result: error });
        promiseState.error = error;
        promiseState.reason = error;
        promiseState.status = 'rejected';
        promiseState.isError = true;
        promiseState.isPending = false;
        promiseState.isLoading = false;
        promiseState.request = error.request as ImmutableRequestInfo<RT>;
        promiseState.response = error.response;
      }
    );
  }

  return promiseState;
}

/**
 * `getRequestState` can be used in both JavaScript and Template contexts.
 *
 * ```ts
 * import { getRequestState } from '@warp-drive/ember';
 *
 * const state = getRequestState(future);
 * ```
 *
 * For instance, we could write a getter on a component that updates whenever
 * the request state advances or the future changes, by combining the function
 * with the use of `@cached`
 *
 * ```ts
 * class Component {
 *   @cached
 *   get title() {
 *     const state = getRequestState(this.args.request);
 *     if (state.isPending) {
 *       return 'loading...';
 *     }
 *     if (state.isError) { return null; }
 *     return state.result.title;
 *   }
 * }
 * ```
 *
 * Or in a template as a helper:
 *
 * ```gjs
 * import { getRequestState } from '@warp-drive/ember';
 *
 * <template>
 *   {{#let (getRequestState @request) as |state|}}
 *     {{#if state.isPending}}
 *       <Spinner />
 *     {{else if state.isError}}
 *       <ErrorForm @error={{state.error}} />
 *     {{else}}
 *       <h1>{{state.result.title}}</h1>
 *     {{/if}}
 *   {{/let}}
 * </template>
 * ```
 *
 * If looking to use in a template, consider also the `<Request />` component
 * which offers a numbe of additional capabilities for requests *beyond* what
 * `RequestState` provides.
 *
 */
export function getRequestState<RT, E>(
  future: Future<RT>
): Readonly<RequestCacheRequestState<RT, StructuredErrorDocument<E>>> {
  let state = RequestCache.get(future);

  if (!state) {
    state = createRequestState<RT, E>(future);
    RequestCache.set(future, state);
  }

  return state as Readonly<RequestCacheRequestState<RT, StructuredErrorDocument<E>>>;
}
