import type { RequestEventData, ThreadInitEventData, WorkerThreadEvent } from './types';

const WorkerScope = (globalThis as unknown as { SharedWorkerGlobalScope: FunctionConstructor }).SharedWorkerGlobalScope;

async function loadImage(url: string): Promise<string> {
  const response = await fetch(url);
  const fileBlob = await response.blob();
  return URL.createObjectURL(fileBlob);
}

export class ImageWorker {
  declare threads: Map<string, MessagePort>;
  declare pendingImages: Map<string, Promise<string>>;
  declare options: { persisted: boolean };
  declare isSharedWorker: boolean;
  declare cache: Map<string, string>;

  constructor(options?: { persisted: boolean }) {
    // disable if running on main thread
    if (typeof window !== 'undefined') {
      return;
    }
    this.threads = new Map();
    this.pendingImages = new Map();
    this.cache = new Map();
    this.options = options || { persisted: false };
    this.isSharedWorker = WorkerScope && globalThis instanceof WorkerScope;
    this.initialize();
  }

  fetch(url: string): Promise<string> {
    const objectUrl = this.cache.get(url);

    if (objectUrl) {
      return Promise.resolve(objectUrl);
    }

    const pending = this.pendingImages.get(url);
    if (pending) {
      return pending;
    }

    const promise = loadImage(url);
    this.pendingImages.set(url, promise);
    return promise.finally(() => {
      this.pendingImages.delete(url);
    });
  }

  initialize() {
    if (this.isSharedWorker) {
      (globalThis as unknown as { onconnect: typeof globalThis.onmessage }).onconnect = (e) => {
        const port = e.ports[0];
        port.onmessage = (event: MessageEvent<ThreadInitEventData>) => {
          const { type } = event.data;

          switch (type) {
            case 'connect':
              this.setupThread(event.data.thread, port);
              break;
          }
        };
        port.start();
      };
    } else {
      globalThis.onmessage = (event: MessageEvent<ThreadInitEventData>) => {
        const { type } = event.data;

        switch (type) {
          case 'connect':
            this.setupThread(event.data.thread, event.ports[0]);
            break;
        }
      };
    }
  }

  setupThread(thread: string, port: MessagePort) {
    this.threads.set(thread, port);
    port.onmessage = (event: WorkerThreadEvent) => {
      if (event.type === 'close') {
        this.threads.delete(thread);
        return;
      }

      const { type } = event.data;
      switch (type) {
        case 'load':
          void this.request(event.data);
          break;
      }
    };
  }

  async request(event: RequestEventData) {
    const { thread, url } = event;

    const objectUrl = await this.fetch(url);
    const port = this.threads.get(thread)!;
    port.postMessage({ type: 'success-response', thread, url, objectUrl });
  }
}