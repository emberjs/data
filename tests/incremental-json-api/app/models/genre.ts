import Model, { attr } from '@ember-data/model';

export default class Genre extends Model {
  @attr declare name: string;
}
