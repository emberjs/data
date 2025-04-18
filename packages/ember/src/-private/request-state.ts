/**
 * @module @warp-drive/ember
 */
import { tracked } from '@glimmer/tracking';

import type {
  Future,
  ImmutableRequestInfo,
  ResponseInfo,
  StructuredDocument,
  StructuredErrorDocument,
} from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';

const RequestCache = new WeakMap<Future<unknown>, RequestState>();

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
 * @class RequestLoadingState
 * @public
 */
export class RequestLoadingState {
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
  @tracked _sizeHint = 0;
  @tracked _bytesLoaded = 0;

  @tracked _startTime = 0;
  @tracked _endTime = 0;
  @tracked _lastPacketTime = 0;

  @tracked _isPending = true;
  @tracked _isStarted = false;
  @tracked _isComplete = false;
  @tracked _isCancelled = false;
  @tracked _isErrored = false;
  @tracked _error: Error | null = null;

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
 *   lid: RequestCacheKey | null;
 * }
 * ```
 *
 * These additional APIs allow us to craft even richer state experiences.
 *
 * To get the state of a request, use `getRequestState`.
 *
 * @class RequestState
 * @public
 */
export class RequestState<T = unknown, RT = unknown> {
  #request: Future<RT>;
  #loadingState: RequestLoadingState | null = null;

  @tracked result: RT | null = null;
  @tracked error: StructuredErrorDocument | null = null;
  @tracked isLoading = true;
  @tracked isSuccess = false;
  @tracked isError = false;
  @tracked request: ImmutableRequestInfo<T, RT> | null = null;
  @tracked response: Response | ResponseInfo | null = null;

  get isCancelled(): boolean {
    return this.isError && isAbortError(this.error);
  }

  get loadingState() {
    if (!this.#loadingState) {
      this.#loadingState = new RequestLoadingState(this.#request);
    }

    return this.#loadingState;
  }

  constructor(future: Future<RT>) {
    this.#request = future;
    const state = getPromiseResult<StructuredDocument<RT>, StructuredErrorDocument>(future);

    if (state) {
      this.request = state.result.request as ImmutableRequestInfo<T, RT>;
      this.response = state.result.response;
      this.isLoading = false;

      if (state.isError) {
        this.error = state.result;
        this.isError = true;
      } else {
        this.result = state.result.content!;
        this.isSuccess = true;
      }
    } else {
      void future.then(
        (result) => {
          setPromiseResult(future, { isError: false, result });
          this.result = result.content;
          this.isSuccess = true;
          this.isLoading = false;
          this.request = result.request as ImmutableRequestInfo<T, RT>;
          this.response = result.response;
        },
        (error: StructuredErrorDocument) => {
          setPromiseResult(future, { isError: true, result: error });
          this.error = error;
          this.isError = true;
          this.isLoading = false;
          this.request = error.request as ImmutableRequestInfo<T, RT>;
          this.response = error.response;
        }
      );
    }
  }
}

/**
 *
 *
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
 * @method getRequestState
 * @for @warp-drive/ember
 * @static
 * @public
 * @param future
 * @return {RequestState}
 */
export function getRequestState<RT, T>(future: Future<RT>): RequestState<T, RT> {
  let state = RequestCache.get(future) as RequestState<T, RT> | undefined;

  if (!state) {
    state = new RequestState(future);
    RequestCache.set(future, state);
  }

  return state;
}
