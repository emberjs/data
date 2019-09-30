import Model, { attr, hasMany, belongsTo } from '@ember-data/model';

export default class Person extends Model {
  @attr()
  name;

  @hasMany('person', { async: true, inverse: 'parent' })
  children;

  @belongsTo('person', { async: true, inverse: 'children' })
  parent;

  get parentId() {
    return this.parent.get('id');
  }

  toNode() {
    const { id, name, parentId } = this;
    return { id, name, parentId };
  }
}
