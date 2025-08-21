import type { Type } from '@warp-drive/core/types/symbols';
import type { AsyncBelongsTo, AsyncHasMany } from '@warp-drive/legacy/model';
import Model, { attr, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class Person extends Model {
  @attr()
  declare name: string;

  @hasMany('person', { async: false, inverse: 'parent' })
  declare children: AsyncHasMany<Person>;

  @belongsTo('person', { async: false, inverse: 'children' })
  declare parent: AsyncBelongsTo<Person>;

  get parentId(): string | null {
    return this.belongsTo<Person, 'parent'>('parent').id();
  }

  toNode() {
    const { id, name, parentId } = this;
    return { id, name, parentId };
  }

  declare [Type]: 'person';
}
