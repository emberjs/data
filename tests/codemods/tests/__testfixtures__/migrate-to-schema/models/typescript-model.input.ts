import Model, { attr, belongsTo } from '@ember-data/model';

export default class User extends Model {
  @attr('string') declare name: string | null;
  @attr('string') declare email: string | null;
  @attr('boolean', { defaultValue: false }) declare isActive: boolean;
  @belongsTo('company', { async: false, inverse: null })
  declare company: Company | null;

  get displayName(): string {
    return this.name || this.email || 'Unknown User';
  }
}