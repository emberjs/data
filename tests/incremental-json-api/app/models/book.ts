import Model, { attr } from '@ember-data/model';

export default class Book extends Model {
  @attr declare title: string;
  @attr declare isbn: string;
  @attr declare publicationDate: string;
  @attr declare author: string;
  @attr declare genre: string;
}
