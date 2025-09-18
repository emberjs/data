import { attr } from '@ember-data/model';
import { belongsTo } from '@ember-data/model';
import { hasMany } from '@ember-data/model';
import Model from '@ember-data/model';

export default class Article extends Model {
  @attr('string') title;
  @belongsTo('user') author;
  @hasMany('comment') comments;
}