import type {
  Awaitable,
  Future,
  ImmutableRequestInfo,
  ResponseInfo,
  StructuredDataDocument,
  StructuredErrorDocument,
} from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';

import type { PendingPromise, RejectedPromise, ResolvedPromise } from './promise-state';
import { defineNonEnumerableSignal, defineSignal } from './reactivity/signal';

const RequestCache = new WeakMap<Future<unknown>, RequestCacheRequestState>();

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function watchStream(stream: ReadableStream<Uint8Array>, state: RequestLoadingState): Promise<void> {
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
 * @typedoc
 */
export class RequestLoadingState {
  declare _sizeHint: number;
  declare _bytesLoaded: number;
  declare _startTime: number;
  declare _endTime: number;
  declare _lastPacketTime: number;
  declare _isPending: boolean;
  declare _isStarted: boolean;
  declare _isComplete: boolean;
  declare _isCancelled: boolean;
  declare _isErrored: boolean;
  declare _error: Error | null;

  _stream: TransformStream | null = null;
  _future: Future<unknown>;
  _triggered = false;
  _trigger() {
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
 * @typedoc
 */
export interface PendingRequest extends PendingPromise {
  /**
   * Whether the request is cancelled.
   *
   * @typedoc
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
 * @typedoc
 */
export interface ResolvedRequest<T, RT> extends ResolvedPromise<RT> {
  /**
   * Whether the request is cancelled.
   *
   * @typedoc
   */
  isCancelled: false;

  loadingState: RequestLoadingState;
  request: ImmutableRequestInfo<T, RT> | null;
  response: Response | ResponseInfo | null;
}
/**
 * The state of a request in the "rejected" state.
 * This is the state of a request that has rejected
 * with an error.
 *
 * Extends the {@link RejectedPromise} interface.
 *
 * @typedoc
 */
export interface RejectedRequest<T, RT, E extends StructuredErrorDocument = StructuredErrorDocument>
  extends RejectedPromise<E> {
  /**
   * Whether the request is cancelled.
   *
   * @typedoc
   */
  isCancelled: false;

  loadingState: RequestLoadingState;
  request: ImmutableRequestInfo<T, RT> | null;
  response: Response | ResponseInfo | null;
}
/**
 * The state of a request in the "cancelled" state.
 * This is the state of a promise that has been
 * cancelled.
 *
 * @typedoc
 */
export interface CancelledRequest<T, RT, E extends StructuredErrorDocument = StructuredErrorDocument> {
  /**
   * The status of the request.
   *
   * @typedoc
   */
  status: 'cancelled';

  /**
   * Whether the request is pending.
   *
   * @typedoc
   */
  isPending: false;

  /**
   * Whether the request is pending.
   *
   * @typedoc
   */
  isLoading: false;

  /**
   * Whether the request has resolved
   * successfully.
   *
   * @typedoc
   */
  isSuccess: false;

  /**
   * Whether the request has rejected
   * with an error.
   *
   * @typedoc
   */
  isError: true;

  /**
   * Once the request has resolved, this will
   * be the value the request resolved to.
   *
   * @typedoc
   */
  value: null;
  /**
   * Once the request has resolved, this will
   * be the value the request resolved to.
   *
   * @deprecated use `value` instead
   * @typedoc
   */
  result: null;

  /**
   * Once the request has rejected, this will
   * be the error the request rejected with.
   *
   *
   * @deprecated use `reason` instead
   * @typedoc
   */
  error: E;

  /**
   * Once the request has rejected, this will
   * be the error the request rejected with.
   *
   * @typedoc
   */
  reason: E;

  /**
   * Whether the request is cancelled.
   *
   * @typedoc
   */
  isCancelled: true;

  loadingState: RequestLoadingState;
  request: ImmutableRequestInfo<T, RT> | null;
  response: Response | ResponseInfo | null;
}

interface PrivateRequestState {
  _loadingState?: RequestLoadingState;
  _request: Future<unknown>;
}

/**
 * RequestState extends the concept of PromiseState to provide a reactive
 * wrapper for a request `Future` which allows you write declarative code
 * around a Future's control flow.
 *
 * It is useful in both Template and JavaScript contexts, allowing you
 * to quickly derive behaviors and data from pending, error and success
 * states.
 *
 * The key difference between a Promise and a Future is that Futures provide
 * access to a stream of their content, the identity of the request (if any)
 * as well as the ability to attempt to abort the request.
 *
 * ```ts
 * interface Future<T> extends Promise<T>> {
 *   getStream(): Promise<ReadableStream>;
 *   abort(): void;
 *   lid: StableDocumentIdentifier | null;
 * }
 * ```
 *
 * These additional APIs allow us to craft even richer state experiences.
 *
 * To get the state of a request, use `getRequestState`.
 *
 * See also:
 * - {@link PendingRequest}
 * - {@link ResolvedRequest}
 * - {@link RejectedRequest}
 * - {@link CancelledRequest}
 *
 * @typedoc
 */
export type RequestCacheRequestState<
  T = unknown,
  RT = unknown,
  E extends StructuredErrorDocument = StructuredErrorDocument,
> = PendingRequest | ResolvedRequest<T, RT> | RejectedRequest<T, RT, E> | CancelledRequest<T, RT, E>;

const RequestStateProto = {};

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

export function createRequestState<T, RT, E>(
  future: Future<RT>
): Readonly<RequestCacheRequestState<T, RT, StructuredErrorDocument<E>>> {
  const state = getPromiseResult(
    future as unknown as Awaitable<StructuredDataDocument<RT>, StructuredErrorDocument<E>>
  );
  const promiseState = Object.create(RequestStateProto) as RequestCacheRequestState<T, RT, StructuredErrorDocument<E>> &
    PrivateRequestState;
  promiseState._request = future;

  if (state) {
    if (state.isError) {
      promiseState.error = state.result;
      promiseState.reason = state.result;
      promiseState.status = 'rejected';
      promiseState.isError = true;
      promiseState.isPending = false;
      promiseState.isLoading = false;
      promiseState.request = state.result.request as ImmutableRequestInfo<T, RT>;
      promiseState.response = state.result.response;
    } else {
      promiseState.result = state.result.content;
      promiseState.value = state.result.content;
      promiseState.status = 'fulfilled';
      promiseState.isSuccess = true;
      promiseState.isPending = false;
      promiseState.isLoading = false;
      promiseState.request = state.result.request as ImmutableRequestInfo<T, RT>;
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
        promiseState.request = result.request as ImmutableRequestInfo<T, RT>;
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
        promiseState.request = error.request as ImmutableRequestInfo<T, RT>;
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
 * @typedoc
 */
export function getRequestState<RT, T, E>(
  future: Future<RT>
): Readonly<RequestCacheRequestState<T, RT, StructuredErrorDocument<E>>> {
  let state = RequestCache.get(future);

  if (!state) {
    state = createRequestState<T, RT, E>(future);
    RequestCache.set(future, state);
  }

  return state as Readonly<RequestCacheRequestState<T, RT, StructuredErrorDocument<E>>>;
}
