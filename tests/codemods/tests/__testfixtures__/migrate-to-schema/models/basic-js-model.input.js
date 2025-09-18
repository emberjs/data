import Model, { attr, belongsTo } from '@ember-data/model';

export default class Product extends Model {
  @attr('string') name;
  @attr('string') description;
  @attr('number') price;
  @belongsTo('category', { async: false }) category;
}