import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import { query } from '@ember-data/json-api/request';
import { filterEmpty } from '@ember-data/request-utils';
import type Store from '@ember-data/store';
import type { Document } from '@ember-data/store/-private/document';

import type Book from '../models/book';
import type { ApiPage } from '../utils/pagination-links';
import { PaginationLinks } from '../utils/pagination-links';

export interface BookListSignature {
  Element: HTMLDivElement;
  Args: {
    sort: string | null;
    filter: string | null;
    genre: string | null;
    author: string | null;
    page: number | null;
    limit: number | null;
  };
}

class AsyncContent<T> {
  @tracked content: T | undefined;
}

export default class BookListComponent extends Component<BookListSignature> {
  @service declare store: Store;
  @tracked currentUrl: string | null = null;
  links = new PaginationLinks();
  dataWrapper = new AsyncContent<Document<Book[]>>();

  // we use this to detect inbound data changes
  _firstPageOptions: { url: string } | null = null;

  @cached
  get firstPageOptions(): { url: string } {
    const { sort, filter, genre, author, page, limit } = this.args;

    const options = query('book', filterEmpty({ sort, filter, genre, author, page, limit }));
    this._firstPageOptions = options;
    return options;
  }

  @cached
  get currentPage() {
    const _firstPageOptions = this._firstPageOptions;
    const firstPageOptions = this.firstPageOptions;
    const currentUrl = this.currentUrl;

    // if the first page options changed, we need to fetch a new first page
    if (_firstPageOptions?.url !== firstPageOptions.url) {
      return this.fetchPage(firstPageOptions);
    }

    return this.fetchPage(currentUrl ? { url: currentUrl } : firstPageOptions);
  }

  get books(): Document<Book[]> | null {
    return this.currentPage.content || null;
  }

  fetchPage(options: { url: string }) {
    const dataWrapper = this.dataWrapper;
    const future = this.store.request<Document<Book[]>>(options);

    void future.then((books) => {
      dataWrapper.content = books.content;
      this.links.addPage(books.content as unknown as ApiPage);
    });

    return dataWrapper;
  }

  updatePage = (url: string) => {
    this.currentUrl = url;
  };
}
