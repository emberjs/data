import { assert } from '@ember/debug';

import { defineSignal } from '@ember-data/tracking/-private';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';
import type { RequestInfo } from '@warp-drive/core-types/request';
import type { Link, PaginationLinks } from '@warp-drive/core-types/spec/raw';

import type Store from './store-service';

function urlFromLink(link: Link): string {
  if (typeof link === 'string') return link;
  return link.href;
}

export class Document<T> {
  declare links?: PaginationLinks;
  declare data?: T;
  declare errors?: object;
  declare meta?: object;

  declare identifier: StableDocumentIdentifier | null;

  #store: Store;
  constructor(store: Store, identifier: StableDocumentIdentifier | null) {
    this.#store = store;
    this.identifier = identifier;
  }

  async #request(link: keyof PaginationLinks, options: object = {}): Promise<Document<T> | null> {
    const href = this.links?.[link];
    if (!href) {
      return null;
    }

    const response = await this.#store.request<Document<T>>(Object.assign(options, { url: urlFromLink(href) }));

    return response.content;
  }

  fetch(options: Partial<RequestInfo> = {}): Promise<Document<T>> {
    assert(`No self link`, this.links?.self);
    options.cacheOptions = options.cacheOptions || {};
    options.cacheOptions.key = this.identifier?.lid;
    return this.#request('self', options) as Promise<Document<T>>;
  }

  next(options?: object): Promise<Document<T> | null> {
    return this.#request('next', options);
  }

  prev(options?: object): Promise<Document<T> | null> {
    return this.#request('prev', options);
  }

  first(options?: object): Promise<Document<T> | null> {
    return this.#request('first', options);
  }

  last(options?: object): Promise<Document<T> | null> {
    return this.#request('last', options);
  }

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
