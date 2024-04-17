import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { query } from '@ember-data/json-api/request';
import type Store from '@ember-data/store';
import type { Document } from '@ember-data/store/-private/document';

import type Author from '../models/author';
import type Book from '../models/book';
import type Genre from '../models/genre';

export default class ApplicationRoute extends Route {
  @service declare store: Store;

  override async model() {
    const genres = this.store.request<Document<Genre[]>>({ url: '/api/books/genres' });
    const authors = this.store.request<Document<Author[]>>({ url: '/api/books/authors' });

    // Example of legacy usage to be refactored, unpaginated
    const oldBooks = this.store.findAll('book');

    // Example of legacy usage, paginated
    const oldBooksPaginated = this.store.query('book', { page: 1, pageSize: 20 });

    // Example of new usage (refactored, paginated)
    const books = this.store.request(query<Book>('book'));

    const data = await Promise.all([genres, authors, books, oldBooks, oldBooksPaginated]);

    return {
      genres: data[0].content.data!,
      authors: data[1].content.data!,
      allBooks: data[2].content,
      oldBooks: data[3],
      oldBooksPaginated: data[4],
    };
  }
}
