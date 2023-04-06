import { assert } from '@ember/debug';
import { tracked } from '@glimmer/tracking';

import { RequestInfo } from '@ember-data/request/-private/types';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import { Link, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';

import type Store from './store-service';

function urlFromLink(link: Link): string {
  if (typeof link === 'string') return link;
  return link.href;
}

export class Document<T> {
  @tracked links?: PaginationLinks;
  @tracked data?: T;
  @tracked errors?: object;
  @tracked meta?: object;

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
