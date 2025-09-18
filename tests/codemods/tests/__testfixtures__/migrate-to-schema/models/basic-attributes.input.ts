import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) isActive;
  @attr('number') age;
}