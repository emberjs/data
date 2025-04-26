/**
 * @module @ember-data/store
 */
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type { ImmutableRequestInfo, RequestInfo } from '@warp-drive/core-types/request';
import type { CollectionResourceDataDocument, ResourceDocument } from '@warp-drive/core-types/spec/document';
import type { Link, Meta, PaginationLinks } from '@warp-drive/core-types/spec/json-api-raw';
import type { Mutable } from '@warp-drive/core-types/utils';

import type { DocumentCacheOperation } from './managers/notification-manager';
import { expectInternalSignal, notifyInternalSignal, withSignalStore } from './new-core-tmp/reactivity/internal';
import { defineGate } from './new-core-tmp/reactivity/signal';
import type { Store } from './store-service';

function urlFromLink(link: Link): string {
  if (typeof link === 'string') return link;
  return link.href;
}

/**
 * A Document is a class that wraps the response content from a request to the API
 * returned by `Cache.put` or `Cache.peek`, converting resource-identifiers into
 * record instances.
 *
 * It is not directly instantiated by the user, and its properties should not
 * be directly modified. Whether individual properties are mutable or not is
 * determined by the record instance itself.
 *
 * @public
 * @class ReactiveDocument
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
   * @property links
   * @type {object|undefined} - a links object
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
   * @property data
   * @public
   * @type {object|Array<object>|null|undefined} - a data object
   */
  declare readonly data?: T;

  /**
   * The errors returned by the API for this request, if any
   *
   * @property errors
   * @public
   * @type {object|undefined} - an errors object
   */
  declare readonly errors?: object[];

  /**
   * The meta object for this document, if any
   *
   * @property meta
   * @public
   * @type {object|undefined} - a meta object
   */
  declare readonly meta?: Meta;

  /**
   * The identifier associated with this document, if any
   *
   * @property identifier
   * @public
   * @type {StableDocumentIdentifier|null}
   */
  declare readonly identifier: StableDocumentIdentifier | null;

  declare protected readonly _store: Store;
  declare protected readonly _localCache: { document: ResourceDocument; request: ImmutableRequestInfo } | null;

  constructor(
    store: Store,
    identifier: StableDocumentIdentifier | null,
    localCache: { document: ResourceDocument; request: ImmutableRequestInfo } | null
  ) {
    this._store = store;
    this._localCache = localCache;
    this.identifier = identifier;
    const signals = withSignalStore(this);

    // TODO if we ever enable auto-cleanup of the cache, we will need to tear this down
    // in a destroy method
    if (identifier) {
      store.notifications.subscribe(
        identifier,
        (_identifier: StableDocumentIdentifier, type: DocumentCacheOperation) => {
          switch (type) {
            case 'updated':
              // FIXME in the case of a collection we need to notify it's length
              // and have it recalc
              notifyInternalSignal(expectInternalSignal(signals, 'data'));
              notifyInternalSignal(expectInternalSignal(signals, 'links'));
              notifyInternalSignal(expectInternalSignal(signals, 'meta'));
              notifyInternalSignal(expectInternalSignal(signals, 'errors'));
              break;
            case 'added':
            case 'removed':
            case 'invalidated':
            case 'state':
              break;
          }
        }
      );
    }
  }

  async #request(
    link: keyof PaginationLinks,
    options: Partial<RequestInfo<T, ReactiveDocument<T>>>
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
   * @method fetch
   * @public
   * @param {object} options
   * @return Promise<Document>
   */
  fetch(options: Partial<RequestInfo<T, ReactiveDocument<T>>> = {}): Promise<ReactiveDocument<T>> {
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
   * @method next
   * @public
   * @param {object} options
   * @return Promise<Document | null>
   */
  next(options: Partial<RequestInfo<T, ReactiveDocument<T>>> = {}): Promise<ReactiveDocument<T> | null> {
    return this.#request('next', options);
  }

  /**
   * Fetches the prev link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * prev link.
   *
   * @method prev
   * @public
   * @param {object} options
   * @return Promise<Document | null>
   */
  prev(options: Partial<RequestInfo<T, ReactiveDocument<T>>> = {}): Promise<ReactiveDocument<T> | null> {
    return this.#request('prev', options);
  }

  /**
   * Fetches the first link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * first link.
   *
   * @method first
   * @public
   * @param {object} options
   * @return Promise<Document | null>
   */
  first(options: Partial<RequestInfo<T, ReactiveDocument<T>>> = {}): Promise<ReactiveDocument<T> | null> {
    return this.#request('first', options);
  }

  /**
   * Fetches the last link for this document, returning a promise that resolves
   * with the new document when the request completes, or null if there is no
   * last link.
   *
   * @method last
   * @public
   * @param {object} options
   * @return Promise<Document | null>
   */
  last(options: Partial<RequestInfo<T, ReactiveDocument<T>>> = {}): Promise<ReactiveDocument<T> | null> {
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
   * @method toJSON
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
      return this._store.recordArrayManager.getCollection({
        type: identifier ? identifier.lid : _localCache!.request.url,
        identifiers: data.slice(),
        doc: identifier ? undefined : (doc as CollectionResourceDataDocument),
        identifier: identifier ?? null,
      }) as T;
    } else if (data) {
      return this._store.peekRecord(data as unknown as StableRecordIdentifier) as T;
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
