import Route from '@ember/routing/route';
import { service } from '@ember/service';

import type { Document, Store } from '@warp-drive/core';
import type { CollectionResourceDataDocument } from '@warp-drive/core/types/spec/document';
import { query } from '@warp-drive/utilities/json-api';

import type { Author } from '../schemas/author';
import type { Book } from '../schemas/book';
import type { Genre } from '../schemas/genre';

export default class ApplicationRoute extends Route {
  @service declare store: Store;

  override async model(): Promise<{
    genres: Genre[];
    authors: Author[];
    books: CollectionResourceDataDocument<Book>;
  }> {
    const genres = this.store.request<Document<Genre[]>>({ url: '/api/books/genres' });
    const authors = this.store.request<Document<Author[]>>({ url: '/api/books/authors' });

    // Example of new usage (refactored, paginated)
    const books = this.store.request(query<Book>('book'));

    const data = await Promise.all([genres, authors, books]);

    return {
      genres: data[0].content.data!,
      authors: data[1].content.data!,
      books: data[2].content,
    };
  }
}
