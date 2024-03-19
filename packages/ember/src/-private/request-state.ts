import { tracked } from '@glimmer/tracking';

import type { Future, StructuredDocument, StructuredErrorDocument } from '@ember-data/request';
import { getPromiseResult, setPromiseResult } from '@ember-data/request';

const RequestCache = new WeakMap<Future<unknown>, RequestState>();

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function pipeThrough(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  state: RequestLoadingState
): Promise<void> {
  let bytesLoaded = 0;
  state._startTime = performance.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await reader.read();

    if (result.done) {
      await writer.close();
      break;
    }

    bytesLoaded += result.value.byteLength;
    state._bytesLoaded = bytesLoaded;
    state._lastPacketTime = performance.now();

    await writer.write(result.value);
  }
}

function watchStream(
  stream: ReadableStream<Uint8Array>,
  state: RequestLoadingState
): { stream: ReadableStream<Uint8Array>; done: Promise<void> } {
  const newStream = new TransformStream<Uint8Array, Uint8Array>();
  const reader = stream.getReader();
  const writer = newStream.writable.getWriter();

  const done = pipeThrough(reader, writer, state);

  const endTime = performance.now();
  state._endTime = endTime;

  return { stream: newStream.readable, done };
}

export class RequestLoadingState {
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
    void promise.then(
      (stream) => {
        this._isPending = false;
        if (!stream) {
          this._isComplete = true;
          return;
        }
        this._isStarted = true;
        const watched = watchStream(stream, this);
        this._stream = watched.stream;
        return watched.done;
      },
      (error: Error) => {
        this._isPending = false;
        if (isAbortError(error)) {
          this._isCancelled = true;
          this._isComplete = true;
        }
        this._isErrored = true;
        this._error = error;
      }
    );
  }

  @tracked _stream: ReadableStream | null = null;
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
    return this._stream;
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

  get completeRatio(): number {
    return this.sizeHint ? this.bytesLoaded / this.sizeHint : 0;
  }

  get remainingRatio(): number {
    return 1 - this.completeRatio;
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

  abort(): void {
    this._future.abort();
  }
}

export class RequestState<T = unknown> {
  #request: Future<T>;
  #loadingState: RequestLoadingState | null = null;

  @tracked result: StructuredDocument<T> | null = null;
  @tracked error: StructuredErrorDocument | null = null;
  @tracked isLoading = true;
  @tracked isSuccess = false;
  @tracked isError = false;

  get isCancelled(): boolean {
    return this.isError && isAbortError(this.error);
  }

  get loadingState() {
    if (!this.#loadingState) {
      this.#loadingState = new RequestLoadingState(this.#request);
    }

    return this.#loadingState;
  }

  constructor(future: Future<T>) {
    this.#request = future;
    const state = getPromiseResult<StructuredDocument<T>, StructuredErrorDocument>(future);

    if (state) {
      if (state.isError) {
        this.error = state.result;
        this.isError = true;
        this.isLoading = false;
      } else {
        this.result = state.result;
        this.isSuccess = true;
        this.isLoading = false;
      }
    } else {
      void future.then(
        (result) => {
          setPromiseResult(future, { isError: false, result });
          this.result = result;
          this.isSuccess = true;
          this.isLoading = false;
        },
        (error: StructuredErrorDocument) => {
          setPromiseResult(future, { isError: true, result: error });
          this.error = error;
          this.isError = true;
          this.isLoading = false;
        }
      );
    }
  }
}

export function getRequestState<T>(future: Future<T>): RequestState<T> {
  let state = RequestCache.get(future) as RequestState<T> | undefined;

  if (!state) {
    state = new RequestState(future);
    RequestCache.set(future, state);
  }

  return state;
}
