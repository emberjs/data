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
    // @ts-expect-error apparently TS can't infer that `this` is a Person :/
    return this.belongsTo('parent').id();
  }

  toNode() {
    const { id, name, parentId } = this;
    return { id, name, parentId };
  }

  declare [ResourceType]: 'person';
}
