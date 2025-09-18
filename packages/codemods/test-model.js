import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
  @attr('string') email;
}