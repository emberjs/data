import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
  @belongsTo('company', { async: false, inverse: null }) company;
  @hasMany('project', { async: true, inverse: 'owner' }) projects;
}