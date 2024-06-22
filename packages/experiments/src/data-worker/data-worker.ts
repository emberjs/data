import type Store from '@ember-data/store';
import type { Cache } from '@ember-data/types/cache/cache';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';

import { PersistedCache } from './persisted-cache';

interface CacheEvent {
  op: 'request' | 'put';
  data: RequestEvent | object;
}
interface RequestEvent {
  url: string;
}

const EmberDataCacheVersion = 1;

export class DataWorker {
  declare id: string;
  declare store: Store;
  declare _onmessage: (message: RequestEvent) => void;
  declare db: IDBDatabase;
  declare channel: BroadcastChannel;
  declare _transaction: IDBTransaction;

  constructor(UserStore: typeof Store) {
    class Store extends UserStore {
      createCache(this: Store & { __dataWorker: DataWorker }, capabilities: CacheCapabilitiesManager): Cache {
        const cache = super.createCache(capabilities);
        return new PersistedCache(cache, this.__dataWorker.db);
      }
    }
    this.id = `worker:${crypto.randomUUID()}`;
    const store = (this.store = new Store());
    store.__dataWorker = this;
  }

  static async create(UserStore: typeof Store) {
    const worker = new this(Store);

    await worker._setupBroadcastChannel();
    await worker._setupCache();

    return worker;
  }

  async _setupBroadcastChannel(): Promise<void> {
    const channel = (this.channel = new BroadcastChannel('data-worker'));

    this._onmessage = (message: CacheEvent) => {
      this.pipe(message);
    };

    channel.addEventListener('request', this._onmessage);

    await Promise.resolve();
  }

  async _setupCache(): Promise<void> {
    const request = indexedDB.open('EmberDataCache', EmberDataCacheVersion);

    await new Promise((resolve, reject) => {
      request.onerror = reject;
      request.onsuccess = resolve;

      /*
        We don't attach an onblocked or onversion handler currently
        because we currently only have one version and
        its unlikely we ever need another version. Even if we
        do need multiple versions, if we end up using a SharedWebWorker
        as intended only one db connection would ever be available.
      */

      request.onupgradeneeded = async (event: { oldVersion: number; target: { result: IDBDatabase } }) => {
        // its not clear from the docs if (1) this method can be a promise or (2) how things like oncomplete
        // for createObjectStore are handled.
        await upgradeCache(event.target.result, event.oldVersion);
        // resolve();
      };
    });

    this.db = request.result;
  }

  pipe(event: CacheEvent): void {
    switch (event.op) {
      case 'request':
        this.request(event.data);
        return;
    }
  }

  request(event: RequestEvent): void {
    console.log(this.id, event);
  }
}

async function upgradeCache(db: IDBDatabase, oldVersion: number): Promise<void> {
  const promises: Promise<void>[] = [];

  if (oldVersion < 1) {
    // const documentStore = db.createObjectStore('document', { keyPath: 'lid', autoIncrement: false });
    const resourceStore = db.createObjectStore('resource', { keyPath: 'lid', autoIncrement: false });
    const requestStore = db.createObjectStore('request', { keyPath: 'lid', autoIncrement: false });

    promises.push(
      // new Promise((resolve) => {
      //   documentStore.transaction.oncomplete = resolve;
      // }),
      new Promise((resolve) => {
        resourceStore.transaction.oncomplete = resolve;
      }),
      new Promise((resolve) => {
        requestStore.transaction.oncomplete = resolve;
      })
    );
  }

  await Promise.all(promises);
}
