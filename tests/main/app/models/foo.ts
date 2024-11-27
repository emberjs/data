import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbols';

export default class Foo extends Model {
  @attr declare name: string | null;
  @belongsTo('foo', { async: false, inverse: 'children' }) declare parent: Foo;
  @hasMany('foo', { async: false, inverse: 'parent' }) declare children: Foo[];

  declare [Type]: 'foo';
}
