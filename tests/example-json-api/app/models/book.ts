import Model, { attr } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbols';

export default interface Book {
  [Type]: 'book';
}

export default class Book extends Model {
  @attr declare title: string;
  @attr declare isbn: string;
  @attr declare publicationDate: string;
  @attr declare author: string;
  @attr declare genre: string;
}
