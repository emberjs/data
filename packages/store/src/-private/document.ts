/**
 * @module @ember-data/store
 */
import { assert } from '@ember/debug';

import { defineSignal } from '@ember-data/tracking/-private';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type { RequestInfo } from '@warp-drive/core-types/request';
import type { Link, Meta, PaginationLinks } from '@warp-drive/core-types/spec/raw';

import type Store from './store-service';

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
 * @class Document
 */
export class Document<T> {
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
  declare links?: PaginationLinks;
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
  declare data?: T;

  /**
   * The errors returned by the API for this request, if any
   *
   * @property errors
   * @public
   * @type {object|undefined} - an errors object
   */
  declare errors?: object[];

  /**
   * The meta object for this document, if any
   *
   * @property meta
   * @public
   * @type {object|undefined} - a meta object
   */
  declare meta?: Meta;

  /**
   * The identifier associated with this document, if any
   *
   * @property identifier
   * @public
   * @type {StableDocumentIdentifier|null}
   */
  declare identifier: StableDocumentIdentifier | null;

  #store: Store;
  constructor(store: Store, identifier: StableDocumentIdentifier | null) {
    this.#store = store;
    this.identifier = identifier;
  }

  async #request(link: keyof PaginationLinks, options: Partial<RequestInfo>): Promise<Document<T> | null> {
    const href = this.links?.[link];
    if (!href) {
      return null;
    }

    options.method = options.method || 'GET';
    const response = await this.#store.request<Document<T>>(Object.assign(options, { url: urlFromLink(href) }));

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
  fetch(options: Partial<RequestInfo> = {}): Promise<Document<T>> {
    assert(`No self or related link`, this.links?.related || this.links?.self);
    options.cacheOptions = options.cacheOptions || {};
    options.cacheOptions.key = this.identifier?.lid;
    return this.#request(this.links.related ? 'related' : 'self', options) as Promise<Document<T>>;
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
  next(options: Partial<RequestInfo> = {}): Promise<Document<T> | null> {
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
  prev(options: Partial<RequestInfo> = {}): Promise<Document<T> | null> {
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
  first(options: Partial<RequestInfo> = {}): Promise<Document<T> | null> {
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
  last(options: Partial<RequestInfo> = {}): Promise<Document<T> | null> {
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
    const data: Partial<Document<T>> = {};
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

defineSignal(Document.prototype, 'data');
defineSignal(Document.prototype, 'links');
defineSignal(Document.prototype, 'errors');
defineSignal(Document.prototype, 'meta');
