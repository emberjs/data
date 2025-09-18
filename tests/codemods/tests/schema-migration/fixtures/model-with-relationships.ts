import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class TestModel extends Model {
  @attr('string') declare name: string | null;
  @belongsTo('user', { async: false, inverse: null })
  declare owner: unknown;
  @hasMany('tag', { async: true, inverse: null })
  declare tags: unknown;
}
