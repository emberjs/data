import type { RequestInfo } from '@ember-data/request';
import { createDeferred } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Deferred, Future, NextFn } from '@ember-data/request/-private/types';
import { TESTING } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import type { ApiError } from '@warp-drive/core-types/spec/error';

import type { AbortEventData, MainThreadEvent, RequestEventData } from './types';

const isServerEnv = typeof FastBoot !== 'undefined';

function isAggregateError(error: Error & { errors?: ApiError[] }): error is AggregateError & { errors: ApiError[] } {
  return error instanceof AggregateError || (error.name === 'AggregateError' && Array.isArray(error.errors));
}

type RobustError = Error & { error: string | object; errors?: ApiError[]; content?: unknown };

function stitchTrace(stack: string, origin: string) {
  if (origin.startsWith('Error\n')) {
    return origin.slice(6) + '\n' + stack;
  }
  return origin + '\n' + stack;
}

function cloneError(error: RobustError, stack: string) {
  const isAggregate = isAggregateError(error);

  const cloned = (
    isAggregate ? new AggregateError(structuredClone(error.errors), error.message) : new Error(error.message)
  ) as RobustError;
  cloned.stack = stitchTrace(error.stack || '', stack);
  cloned.error = error.error;

  // copy over enumerable properties
  Object.assign(cloned, error);

  return cloned;
}

export class WorkerFetch {
  declare worker: Worker | SharedWorker;
  declare threadId: string;
  declare pending: Map<
    number,
    { context: Context; signal: AbortSignal | null; abortFn: () => void; deferred: Deferred<unknown>; stack: string }
  >;
  declare channel: MessageChannel;

  constructor(worker: Worker | SharedWorker | null) {
    this.threadId = isServerEnv ? '' : crypto.randomUUID();
    this.pending = new Map();

    const isTesting = TESTING ? true : false;
    assert(`Expected a SharedWorker instance`, isTesting || isServerEnv || worker instanceof SharedWorker);
    this.worker = worker as SharedWorker;

    if (!isServerEnv) {
      const fn = (event: MainThreadEvent<unknown>) => {
        const { type, id, data } = event.data;
        const info = this.cleanupRequest(id);

        // typically this means the request was aborted
        if (!info) {
          return;
        }

        if (type === 'success-response') {
          const { deferred } = info;

          const { response, content } = data;

          if (response) {
            (response as { headers: Headers }).headers = new Headers(response.headers);
            info.context.setResponse(new Response(null, response));
          }

          deferred.resolve(content);
          return;
        }

        if (type === 'error-response') {
          const { deferred, stack } = info;

          deferred.reject(cloneError(data, stack));
          return;
        }
      };

      if (worker instanceof SharedWorker) {
        worker.port.postMessage({ type: 'connect', thread: this.threadId });
        worker.port.onmessage = fn;
      } else if (worker) {
        this.channel = new MessageChannel();
        worker.postMessage({ type: 'connect', thread: this.threadId }, [this.channel.port2]);

        this.channel.port1.onmessage = fn;
      }
    }
  }

  cleanupRequest(id: number) {
    const info = this.pending.get(id);
    this.pending.delete(id);

    if (info?.signal) {
      info.signal.removeEventListener('abort', info.abortFn);
    }

    return info;
  }

  send(event: RequestEventData | AbortEventData) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.worker instanceof SharedWorker ? this.worker.port.postMessage(event) : this.channel.port1.postMessage(event);
  }

  request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
    if (isServerEnv) {
      return next(context.request);
    }

    const deferred = createDeferred<T>();
    const { signal, request } = prepareRequest(context.request);
    const abortFn = signal
      ? () => {
          deferred.reject(enhanceReason(signal.reason as string));
          this.send({ type: 'abort', thread: this.threadId, id: context.id, data: signal.reason as string });
          this.cleanupRequest(context.id);
        }
      : () => {
          return;
        };

    signal?.addEventListener('abort', abortFn);

    try {
      throw new Error();
    } catch (e: unknown) {
      this.pending.set(context.id, {
        context,
        deferred,
        signal,
        abortFn,
        stack: (e as Error).stack!,
      });
    }

    this.send({
      type: 'request',
      thread: this.threadId,
      id: context.id,
      data: request,
    });

    return deferred.promise;
  }
}

export function enhanceReason(reason?: string) {
  return new DOMException(reason || 'The user aborted a request.', 'AbortError');
}

function prepareRequest(request: Context['request']): { signal: AbortSignal | null; request: RequestInfo } {
  const { signal, headers } = request;
  const requestCopy = Object.assign({}, request) as RequestInfo;

  delete requestCopy.store;

  if (signal instanceof AbortSignal) {
    delete requestCopy.signal;
  }

  if (headers instanceof Headers) {
    requestCopy.headers = Array.from(headers as unknown as Iterable<[string, string][]>) as unknown as Headers;
  }

  return { signal: signal || null, request: requestCopy };
}
