import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { query } from '@ember-data/json-api/request';
import { setBuildURLConfig } from '@ember-data/request-utils';
import Store from '@ember-data/store';
import type { Document } from '@ember-data/store/-private/document';

import type Author from '../models/author';
import Book from '../models/book';
import type Genre from '../models/genre';

setBuildURLConfig({
  host: '/',
  namespace: 'api',
});

export default class ApplicationRoute extends Route {
  @service declare store: Store;

  async model() {
    const genres = this.store.request<Document<Genre[]>>({ url: '/api/books/genres' });
    const authors = this.store.request<Document<Author[]>>({ url: '/api/books/authors' });
    const books = this.store.request<Document<Book[]>>(query('book'));

    const data = await Promise.all([genres, authors, books]);
    return {
      genres: data[0].content.data!,
      authors: data[1].content.data!,
      allBooks: data[2].content,
    };
  }
}
