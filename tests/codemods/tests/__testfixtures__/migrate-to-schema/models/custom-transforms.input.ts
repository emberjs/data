import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class Order extends Model {
  @attr('string') orderNumber;
  @attr('date') createdAt;
  @attr('currency') total;
  @attr('json') metadata;
  @attr('array') tags;
  @belongsTo('customer', { async: true }) customer;
  @hasMany('order-item', { async: false, inverse: 'order' }) items;

  get formattedTotal() {
    return `$${this.total?.toFixed(2) || '0.00'}`;
  }

  get itemCount() {
    return this.items?.length || 0;
  }
}