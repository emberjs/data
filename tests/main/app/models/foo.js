import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class Foo extends Model {
  @attr name;
  @belongsTo('foo', { async: false, inverse: 'children' }) parent;
  @hasMany('foo', { async: false, inverse: 'parent' }) children;
}
