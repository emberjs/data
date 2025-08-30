import mod from '../helpers/mod';
import eq from '../helpers/eq';
import PageLink from './page-link';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import type { Store } from '@warp-drive/core';
import type { ReactiveDocument } from '@warp-drive/core/reactive';
import { filterEmpty } from '@warp-drive/utilities';
import { query } from '@warp-drive/utilities/json-api';

import type { Book } from '../schemas/book';
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

export default class BookList extends Component<BookListSignature> {
  @service declare store: Store;
  @tracked currentUrl: string | null = null;
  links: PaginationLinks = new PaginationLinks();
  dataWrapper: AsyncContent<ReactiveDocument<Book[]>> = new AsyncContent<ReactiveDocument<Book[]>>();

  // we use this to detect inbound data changes
  _firstPageOptions: { url: string } | null = null;

  @cached
  get firstPageOptions(): { url: string } {
    const { sort, filter, genre, author, page, limit } = this.args;

    const options = query<Book>('book', filterEmpty({ sort, filter, genre, author, page, limit }));
    this._firstPageOptions = options;
    return options;
  }

  @cached
  get currentPage(): AsyncContent<ReactiveDocument<Book[]>> {
    const _firstPageOptions = this._firstPageOptions;
    const firstPageOptions = this.firstPageOptions;
    const currentUrl = this.currentUrl;

    // if the first page options changed, we need to fetch a new first page
    if (_firstPageOptions?.url !== firstPageOptions.url) {
      return this.fetchPage(firstPageOptions);
    }

    return this.fetchPage(currentUrl ? { url: currentUrl } : firstPageOptions);
  }

  get books(): ReactiveDocument<Book[]> | null {
    return this.currentPage.content || null;
  }

  fetchPage(options: { url: string }): AsyncContent<ReactiveDocument<Book[]>> {
    const dataWrapper = this.dataWrapper;
    const future = this.store.request<ReactiveDocument<Book[]>>(options);

    void future.then((books) => {
      dataWrapper.content = books.content;
      this.links.addPage(books.content as unknown as ApiPage);
    });

    return dataWrapper;
  }

  updatePage = (url: string): void => {
    this.currentUrl = url;
  };

  <template>
    <div>
      {{#if this.books.data}}
        <ul>
          {{#each this.books.data as |book|}}
            <li>
              <strong>{{book.title}}</strong>
              ({{book.genre}}) -
              {{book.publicationDate}}
              <br />
              by
              <em>{{book.author}}</em>
              ISBN:
              {{book.isbn}}
            </li>
          {{/each}}
        </ul>
        <div>
          {{#each this.links.filteredPages as |page|}}
            <PageLink
              class={{if (eq page.link this.books.links.self) "active"}}
              @title="page {{page.index}}"
              @link={{page.link}}
              @text="{{page.index}}"
              @action={{this.updatePage}}
            />
            {{#if (mod page.index 11)}}
              <br />
            {{/if}}
          {{/each}}
        </div>
      {{else}}
        <p>No books found</p>
      {{/if}}
    </div>
  </template>
}
