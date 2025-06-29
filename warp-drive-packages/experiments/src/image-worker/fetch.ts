import { TESTING } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';
import type { Deferred } from '@warp-drive/core/request';
import { createDeferred } from '@warp-drive/core/request';

import type { MainThreadEvent, RequestEventData } from './types';

export interface FastBoot {
  require(moduleName: string): unknown;
  isFastBoot: boolean;
  request: Request;
}

// @ts-expect-error untyped global
const isServerEnv = typeof FastBoot !== 'undefined';

export class ImageFetch {
  declare worker: Worker | SharedWorker;
  declare threadId: string;
  declare pending: Map<string, Deferred<string>>;
  declare channel: MessageChannel;
  declare cache: Map<string, string>;

  constructor(worker: Worker | SharedWorker | null) {
    this.threadId = isServerEnv ? '' : crypto.randomUUID();
    this.pending = new Map();
    this.cache = new Map();

    const isTesting = TESTING ? true : false;
    assert(`Expected a SharedWorker instance`, isTesting || isServerEnv || worker instanceof SharedWorker);
    this.worker = worker as SharedWorker;

    if (!isServerEnv) {
      const fn = (event: MainThreadEvent) => {
        const { type, url } = event.data;
        const deferred = this.cleanupRequest(url);
        if (!deferred) {
          return;
        }

        if (type === 'success-response') {
          deferred.resolve(url);
          return;
        }

        if (type === 'error-response') {
          deferred.reject(null);
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

  cleanupRequest(url: string): Deferred<string> | undefined {
    const deferred = this.pending.get(url);
    this.pending.delete(url);

    return deferred;
  }

  _send(event: RequestEventData): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.worker instanceof SharedWorker ? this.worker.port.postMessage(event) : this.channel.port1.postMessage(event);
  }

  load(url: string): Promise<string> {
    if (isServerEnv) {
      return Promise.resolve(url);
    }

    const objectUrl = this.cache.get(url);
    if (objectUrl) {
      return Promise.resolve(objectUrl);
    }

    const deferred = createDeferred<string>();
    this.pending.set(url, deferred);
    this._send({ type: 'load', thread: this.threadId, url });
    return deferred.promise;
  }
}
