import type { Future, ResponseInfo, StructuredDataDocument } from '@ember-data/request';
import type Store from '@ember-data/store';

import type { AbortEventData, RequestEventData, ThreadInitEventData, WorkerThreadEvent } from './types';

export class DataWorker {
  declare store: Store;
  declare threads: Map<string, MessagePort>;
  declare pending: Map<string, Map<number, Future<unknown>>>;

  constructor(UserStore: typeof Store) {
    this.store = new UserStore();
    this.threads = new Map();
    this.pending = new Map();
    this.initialize();
  }

  initialize() {
    globalThis.onmessage = (event: MessageEvent<ThreadInitEventData>) => {
      const { type } = event.data;

      switch (type) {
        case 'connect':
          this.setupThread(event.data.thread, event.ports[0]);
          break;
      }
    };
  }

  setupThread(thread: string, port: MessagePort) {
    this.threads.set(thread, port);
    this.pending.set(thread, new Map());
    port.onmessage = (event: WorkerThreadEvent) => {
      if (event.type === 'close') {
        this.threads.delete(thread);
        return;
      }

      const { type } = event.data;
      switch (type) {
        case 'abort':
          this.abortRequest(event.data);
          break;
        case 'request':
          void this.request(event.data);
          break;
      }
    };
  }

  abortRequest(event: AbortEventData) {
    const { thread, id } = event;
    const future = this.pending.get(thread)!.get(id);

    if (future) {
      future.abort();
      this.pending.get(thread)!.delete(id);
    }
  }

  async request(event: RequestEventData) {
    const { thread, id, data } = event;

    try {
      const future = this.store.request(data);
      this.pending.get(thread)!.set(id, future);

      const result = await future;

      this.threads.get(thread)?.postMessage({ type: 'success-response', id, thread, data: prepareResponse(result) });
    } catch (error) {
      if (isAbortError(error)) return;

      this.threads.get(thread)?.postMessage({ type: 'error-response', id, thread, data: error });
    } finally {
      this.pending.get(thread)!.delete(id);
    }
  }
}

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

function softCloneResponse(response: Response | ResponseInfo | null) {
  if (!response) return null;

  const clone: Partial<Mutable<Omit<Response, 'headers'>>> & { headers?: Record<string, string | number> } = {};

  if (response.headers) {
    clone.headers = {};
    for (const [key, value] of response.headers.entries()) {
      clone.headers[key] = value;
    }
  }

  clone.ok = response.ok;
  clone.redirected = response.redirected;
  clone.status = response.status;
  clone.statusText = response.statusText;
  clone.type = response.type;
  clone.url = response.url;

  return clone;
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

function prepareResponse<T>(result: StructuredDataDocument<T>) {
  const newResponse = {
    response: softCloneResponse(result.response),
    content: result.content,
  };

  return newResponse;
}
