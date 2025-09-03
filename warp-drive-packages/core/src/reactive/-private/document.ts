import { assert } from '@warp-drive/core/build-config/macros';

import { withBrand } from '../../request.ts';
import type { DocumentCacheOperation, UnsubscribeToken } from '../../store/-private/managers/notification-manager.ts';
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
import type { ResourceDocument } from '../../types/spec/document.ts';
import type { Link, Meta, PaginationLinks } from '../../types/spec/json-api-raw.ts';
import type { Mutable } from '../../types/utils.ts';
import { Destroy } from './symbols.ts';

function urlFromLink(link: Link): string {
  if (typeof link === 'string') return link;
  return link.href;
}

export interface ReactiveDocumentBase<T> {
  /**
   * The links object for this document, if any
   *
   * e.g.
   *
   * ```ts
   * {
   *   self: '/articles?page[number]=3',
   * }
   * ```
   *
   * @public
   */
  readonly links?: PaginationLinks;

  /**
   * The meta object for this document, if any
   *
   * @public
   */
  readonly meta?: Meta;

  /**
   * The RequestKey associated with this document, if any
   *
   * @public
   */
  readonly identifier: RequestKey | null;

  /**
   * Fetches the related link for this document, returning a promise that resolves
   * with the document when the request completes. If no related link is present,
   * will fallback to the self link if present
   *
   * @public
   */
  fetch(options?: RequestInfo<ReactiveDocument<T>>): Promise<ReactiveDocument<T>>;

  /**
   * Fetches the next link for this document, returning a promise that resolves
   * with the new document when the request completes, or null  if there is no
   * next link.
   *
   * @public
   */
  next(options?: RequestInfo<ReactiveDocument<T>>): Promise<ReactiveDocument<T> | null>;

  /**
   * Fetches the prev link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * prev link.
   *
   * @public
   */
  prev(options: RequestInfo<ReactiveDocument<T>>): Promise<ReactiveDocument<T> | null>;

  /**
   * Fetches the first link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * first link.
   *
   * @public
   */
  first(options: RequestInfo<ReactiveDocument<T>>): Promise<ReactiveDocument<T> | null>;

  /**
   * Fetches the last link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * last link.
   *
   * @public
   */
  last(options: RequestInfo<ReactiveDocument<T>>): Promise<ReactiveDocument<T> | null>;

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
  toJSON(): object;
}

export interface ReactiveErrorDocument<T> extends ReactiveDocumentBase<T> {
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
  readonly data?: undefined;

  /**
   * The errors returned by the API for this request, if any
   *
   * @public
   */
  readonly errors: object[];
}

export interface ReactiveDataDocument<T> extends ReactiveDocumentBase<T> {
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
  readonly data: T;

  /**
   * The errors returned by the API for this request, if any
   *
   * @public
   */
  readonly errors?: undefined;
}

interface PrivateReactiveDocument {
  /** @internal */
  _store: Store;

  /** @internal */
  _localCache: { document: ResourceDocument; request: ImmutableRequestInfo } | null;

  /** @internal */
  _subscription: UnsubscribeToken;

  _request<T>(
    this: ReactiveDocumentBase<T>,
    link: keyof PaginationLinks,
    options?: RequestInfo<ReactiveDataDocument<T>>
  ): Promise<ReactiveDataDocument<T> | null>;
}
function upgradeThis(doc: unknown): asserts doc is PrivateReactiveDocument {}

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
 */
export type ReactiveDocument<T> = ReactiveDataDocument<T> | ReactiveErrorDocument<T>;

const ReactiveDocumentProto = {
  async _request<T>(
    this: ReactiveDocumentBase<T>,
    link: keyof PaginationLinks,
    options: RequestInfo<ReactiveDocument<T>> = withBrand<ReactiveDocument<T>>({ url: '', method: 'GET' })
  ): Promise<ReactiveDataDocument<T> | null> {
    upgradeThis(this);
    const href = this.links?.[link];
    if (!href) {
      return null;
    }

    options.method = options.method || 'GET';
    Object.assign(options, { url: urlFromLink(href) });
    const response = await this._store.request<ReactiveDataDocument<T>>(options);

    return response.content;
  },

  fetch<T>(
    this: ReactiveDocument<T>,
    options: RequestInfo<ReactiveDocument<T>> = withBrand<ReactiveDataDocument<T>>({ url: '', method: 'GET' })
  ): Promise<ReactiveDataDocument<T>> {
    upgradeThis(this);
    assert(`No self or related link`, this.links?.related || this.links?.self);
    options.cacheOptions = options.cacheOptions || {};
    options.cacheOptions.key = this.identifier?.lid;
    return this._request(
      this.links.related ? 'related' : 'self',
      options as RequestInfo<ReactiveDataDocument<T>>
    ) as Promise<ReactiveDataDocument<T>>;
  },

  next<T>(
    this: ReactiveDocument<T>,
    options?: RequestInfo<ReactiveDataDocument<T>>
  ): Promise<ReactiveDataDocument<T> | null> {
    upgradeThis(this);
    return this._request('next', options);
  },

  prev<T>(
    this: ReactiveDocument<T>,
    options: RequestInfo<ReactiveDataDocument<T>>
  ): Promise<ReactiveDataDocument<T> | null> {
    upgradeThis(this);
    return this._request('prev', options);
  },

  first<T>(
    this: ReactiveDocument<T>,
    options: RequestInfo<ReactiveDataDocument<T>>
  ): Promise<ReactiveDataDocument<T> | null> {
    upgradeThis(this);
    return this._request('first', options);
  },

  last<T>(
    this: ReactiveDocument<T>,
    options: RequestInfo<ReactiveDataDocument<T>>
  ): Promise<ReactiveDataDocument<T> | null> {
    upgradeThis(this);
    return this._request('last', options);
  },

  toJSON<T>(this: ReactiveDocument<T>): object {
    upgradeThis(this);
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
  },

  [Destroy]<T>(this: ReactiveDocument<T>): void {
    upgradeThis(this);
    assert(`Cannot destroy a ReactiveDocument which has already been destroyed`, this._store);
    if (this._subscription) {
      this._store.notifications.unsubscribe(this._subscription);
      // @ts-expect-error
      this._store = null;
      // @ts-expect-error
      this._subscription = null;
    }
  },
};

defineGate(ReactiveDocumentProto, 'errors', {
  get<T>(this: ReactiveDocument<T>): object[] | undefined {
    upgradeThis(this);
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
defineGate(ReactiveDocumentProto, 'data', {
  get<T>(this: ReactiveDocument<T>) {
    upgradeThis(this);
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
defineGate(ReactiveDocumentProto, 'links', {
  get<T>(this: ReactiveDocument<T>) {
    upgradeThis(this);
    const { identifier } = this;

    if (!identifier) {
      return this._localCache!.document.links;
    }
    const data = this._store.cache.peek(identifier);
    assert(`No cache data was found for the document '${identifier.lid}'`, data);
    return data.links;
  },
});
defineGate(ReactiveDocumentProto, 'meta', {
  get<T>(this: ReactiveDocument<T>): Meta | undefined {
    upgradeThis(this);
    const { identifier } = this;

    if (!identifier) {
      return this._localCache!.document.meta;
    }
    const data = this._store.cache.peek(identifier);
    assert(`No cache data was found for the document '${identifier.lid}'`, data);
    return data.meta;
  },
});

export function createReactiveDocument<T>(
  store: Store,
  cacheKey: RequestKey | null,
  localCache: { document: ResourceDocument; request: ImmutableRequestInfo } | null
): ReactiveDocument<T> {
  const doc = Object.create(ReactiveDocumentProto) as ReactiveDocument<T> & PrivateReactiveDocument;
  doc._store = store;
  doc._localCache = localCache;
  // @ts-expect-error we are initializing it here
  doc.identifier = cacheKey;
  const signals = withSignalStore(doc);

  // TODO if we ever enable auto-cleanup of the cache, we will need to tear this down
  // in a destroy method
  if (cacheKey) {
    doc._subscription = store.notifications.subscribe(cacheKey, (_key: RequestKey, type: DocumentCacheOperation) => {
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

  return doc;
}
