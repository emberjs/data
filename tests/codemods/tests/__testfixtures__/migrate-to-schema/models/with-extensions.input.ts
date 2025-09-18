import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') email;

  get displayName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get initials() {
    return `${this.firstName?.[0] || ''}${this.lastName?.[0] || ''}`;
  }

  async save() {
    return super.save();
  }
}