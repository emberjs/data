import type { AsyncBelongsTo, AsyncHasMany } from '@ember-data/model';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type { ResourceType } from '@warp-drive/core-types/symbols';

export default class Person extends Model {
  @attr()
  declare name: string;

  @hasMany('person', { async: true, inverse: 'parent' })
  declare children: AsyncHasMany<Person>;

  @belongsTo('person', { async: true, inverse: 'children' })
  declare parent: AsyncBelongsTo<Person>;

  get parentId(): string | null {
    return this.belongsTo<Person, 'parent'>('parent').id();
  }

  toNode() {
    const { id, name, parentId } = this;
    return { id, name, parentId };
  }

  declare [ResourceType]: 'person';
}
