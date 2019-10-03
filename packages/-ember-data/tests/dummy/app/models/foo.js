import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class extends Model {
  @attr name;
  @belongsTo('foo', { async: false }) parent;
  @hasMany('foo', { async: false }) children;
}
