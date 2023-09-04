import Model, { attr } from '@ember-data/model';

export default class Author extends Model {
  @attr declare name: string;
}
