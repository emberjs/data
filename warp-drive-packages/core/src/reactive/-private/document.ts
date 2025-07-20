import { assert } from '@warp-drive/core/build-config/macros';

import type { DocumentCacheOperation } from '../../store/-private/managers/notification-manager.ts';
import {
  notifyInternalSignal,
  peekInternalSignal,
  withSignalStore,
} from '../../store/-private/new-core-tmp/reactivity/internal.ts';
import { defineGate } from '../../store/-private/new-core-tmp/reactivity/signal.ts';
import type { Store } from '../../store/-private/store-service.ts';
import type { ResourceKey } from '../../types.ts';
import type { RequestKey } from '../../types/identifier.ts';
import type { ImmutableRequestInfo, RequestInfo } from '../../types/request.ts';
import { withBrand } from '../../types/request.ts';
import type { ResourceDocument } from '../../types/spec/document.ts';
import type { Link, Meta, PaginationLinks } from '../../types/spec/json-api-raw.ts';
import type { Mutable } from '../../types/utils.ts';

function urlFromLink(link: Link): string {
  if (typeof link === 'string') return link;
  return link.href;
}

/**
 * A Document is a class that wraps the response content from a request to the API
 * returned by `Cache.put` or `Cache.peek`, converting ResourceKeys into
 * ReactiveResource instances.
 *
 * It is not directly instantiated by the user, and its properties should not
 * be directly modified. Whether individual properties are mutable or not is
 * determined by the record instance itself.
 *
 * @public
 * @hideconstructor
 */
export class ReactiveDocument<T> {
  /**
   * The links object for this document, if any
   *
   * e.g.
   *
   * ```
   * {
   *   self: '/articles?page[number]=3',
   * }
   * ```
   *
   * @public
   */
  declare readonly links?: PaginationLinks;
  /**
   * The primary data for this document, if any.
   *
   * If this document has no primary data (e.g. because it is an error document)
   * this property will be `undefined`.
   *
   * For collections this will be an array of record instances,
   * for single resource requests it will be a single record instance or null.
   *
   * @public
   */
  declare readonly data?: T;

  /**
   * The errors returned by the API for this request, if any
   *
   * @public
   */
  declare readonly errors?: object[];

  /**
   * The meta object for this document, if any
   *
   * @public
   */
  declare readonly meta?: Meta;

  /**
   * The RequestKey associated with this document, if any
   *
   * @public
   */
  declare readonly identifier: RequestKey | null;

  declare protected readonly _store: Store;
  declare protected readonly _localCache: { document: ResourceDocument; request: ImmutableRequestInfo } | null;

  constructor(
    store: Store,
    cacheKey: RequestKey | null,
    localCache: { document: ResourceDocument; request: ImmutableRequestInfo } | null
  ) {
    this._store = store;
    this._localCache = localCache;
    this.identifier = cacheKey;
    const signals = withSignalStore(this);

    // TODO if we ever enable auto-cleanup of the cache, we will need to tear this down
    // in a destroy method
    if (cacheKey) {
      store.notifications.subscribe(cacheKey, (_key: RequestKey, type: DocumentCacheOperation) => {
        switch (type) {
          case 'updated':
            // FIXME in the case of a collection we need to notify it's length
            // and have it recalc
            notifyInternalSignal(peekInternalSignal(signals, 'data'));
            notifyInternalSignal(peekInternalSignal(signals, 'links'));
            notifyInternalSignal(peekInternalSignal(signals, 'meta'));
            notifyInternalSignal(peekInternalSignal(signals, 'errors'));
            break;
          case 'added':
          case 'removed':
          case 'invalidated':
          case 'state':
            break;
        }
      });
    }
  }

  async #request(
    link: keyof PaginationLinks,
    options: RequestInfo<ReactiveDocument<T>, T> = withBrand<ReactiveDocument<T>>({ url: '', method: 'GET' })
  ): Promise<ReactiveDocument<T> | null> {
    const href = this.links?.[link];
    if (!href) {
      return null;
    }

    options.method = options.method || 'GET';
    Object.assign(options, { url: urlFromLink(href) });
    const response = await this._store.request<ReactiveDocument<T>>(options);

    return response.content;
  }

  /**
   * Fetches the related link for this document, returning a promise that resolves
   * with the document when the request completes. If no related link is present,
   * will fallback to the self link if present
   *
   * @public
   * @param {Object} options
   * @return {Promise<Document>}
   */
  fetch(
    options: RequestInfo<ReactiveDocument<T>, T> = withBrand<ReactiveDocument<T>>({ url: '', method: 'GET' })
  ): Promise<ReactiveDocument<T>> {
    assert(`No self or related link`, this.links?.related || this.links?.self);
    options.cacheOptions = options.cacheOptions || {};
    options.cacheOptions.key = this.identifier?.lid;
    return this.#request(this.links.related ? 'related' : 'self', options) as Promise<ReactiveDocument<T>>;
  }

  /**
   * Fetches the next link for this document, returning a promise that resolves
   * with the new document when the request completes, or null  if there is no
   * next link.
   *
   * @public
   * @param {Object} options
   * @return {Promise<Document | null>}
   */
  next(options?: RequestInfo<ReactiveDocument<T>, T>): Promise<ReactiveDocument<T> | null> {
    return this.#request('next', options);
  }

  /**
   * Fetches the prev link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * prev link.
   *
   * @public
   * @param {Object} options
   * @return {Promise<Document | null>}
   */
  prev(options: RequestInfo<ReactiveDocument<T>, T>): Promise<ReactiveDocument<T> | null> {
    return this.#request('prev', options);
  }

  /**
   * Fetches the first link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * first link.
   *
   * @public
   * @param {Object} options
   * @return {Promise<Document | null>}
   */
  first(options: RequestInfo<ReactiveDocument<T>, T>): Promise<ReactiveDocument<T> | null> {
    return this.#request('first', options);
  }

  /**
   * Fetches the last link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * last link.
   *
   * @public
   * @param {Object} options
   * @return {Promise<Document | null>}
   */
  last(options: RequestInfo<ReactiveDocument<T>, T>): Promise<ReactiveDocument<T> | null> {
    return this.#request('last', options);
  }

  /**
   * Implemented for `JSON.stringify` support.
   *
   * Returns the JSON representation of the document wrapper.
   *
   * This is a shallow serialization, it does not deeply serialize
   * the document's contents, leaving that to the individual record
   * instances to determine how to do, if at all.
   *
   * @public
   * @return
   */
  toJSON(): object {
    const data: Mutable<Partial<ReactiveDocument<T>>> = {};
    data.identifier = this.identifier;
    if (this.data !== undefined) {
      data.data = this.data;
    }
    if (this.links !== undefined) {
      data.links = this.links;
    }
    if (this.errors !== undefined) {
      data.errors = this.errors;
    }
    if (this.meta !== undefined) {
      data.meta = this.meta;
    }
    return data;
  }
}

defineGate(ReactiveDocument.prototype, 'errors', {
  get<T>(this: ReactiveDocument<T>): object[] | undefined {
    const { identifier } = this;

    if (!identifier) {
      const { document } = this._localCache!;
      if ('errors' in document) {
        return document.errors;
      }
      return;
    }

    const doc = this._store.cache.peek(identifier);
    assert(`No cache data was found for the document '${identifier.lid}'`, doc);
    return 'errors' in doc ? doc.errors : undefined;
  },
});
defineGate(ReactiveDocument.prototype, 'data', {
  get<T>(this: ReactiveDocument<T>) {
    const { identifier, _localCache } = this;

    const doc = identifier ? this._store.cache.peek(identifier) : _localCache!.document;
    assert(`No cache data was found for the document '${identifier?.lid ?? '<uncached document>'}'`, doc);
    const data = 'data' in doc ? (doc.data as T | undefined) : undefined;

    if (Array.isArray(data)) {
      return identifier
        ? (this._store.recordArrayManager.getCollection({
            source: data.slice() as ResourceKey[],
            requestKey: identifier,
          }) as T)
        : (this._store.recordArrayManager.getCollection({
            source: data.slice() as ResourceKey[],
          }) as T);
    } else if (data) {
      return this._store.peekRecord(data as unknown as ResourceKey) as T;
    } else {
      return data;
    }
  },
});
defineGate(ReactiveDocument.prototype, 'links', {
  get<T>(this: ReactiveDocument<T>) {
    const { identifier } = this;

    if (!identifier) {
      return this._localCache!.document.links;
    }
    const data = this._store.cache.peek(identifier);
    assert(`No cache data was found for the document '${identifier.lid}'`, data);
    return data.links;
  },
});
defineGate(ReactiveDocument.prototype, 'meta', {
  get<T>(this: ReactiveDocument<T>): Meta | undefined {
    const { identifier } = this;

    if (!identifier) {
      return this._localCache!.document.meta;
    }
    const data = this._store.cache.peek(identifier);
    assert(`No cache data was found for the document '${identifier.lid}'`, data);
    return data.meta;
  },
});
