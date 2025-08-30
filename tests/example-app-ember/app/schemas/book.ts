import { withDefaults } from '@warp-drive/core/reactive';
import type { Type } from '@warp-drive/core/types/symbols';

export interface Book {
  [Type]: 'book';
  title: string;
  isbn: string;
  publicationDate: string;
  author: string;
  genre: string;
}

export const BookSchema = withDefaults({
  type: 'book',
  fields: [
    { name: 'title', kind: 'field' },
    { name: 'isbn', kind: 'field' },
    { name: 'publicationDate', kind: 'field' },
    { name: 'author', kind: 'field' },
    { name: 'genre', kind: 'field' },
    { name: 'price', kind: 'field' },
  ],
});
