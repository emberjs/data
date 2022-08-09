import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class Person extends Model {
  @attr()
  name;

  @hasMany('person', { async: true, inverse: 'parent' })
  children;

  @belongsTo('person', { async: true, inverse: 'children' })
  parent;

  get parentId() {
    return this.belongsTo('parent').id();
  }

  toNode() {
    const { id, name, parentId } = this;
    return { id, name, parentId };
  }
}
