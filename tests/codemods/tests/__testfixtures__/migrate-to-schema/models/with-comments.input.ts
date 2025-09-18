import Model, { attr, belongsTo } from '@ember-data/model';

/**
 * User model representing a system user
 * @class User
 */
export default class User extends Model {
  // Basic user information
  @attr('string') name; // User's full name
  @attr('string') email; // Primary email address

  /**
   * Whether the user account is active
   * @default false
   */
  @attr('boolean', { defaultValue: false }) isActive;

  // Relationship to company
  @belongsTo('company', { async: false, inverse: null }) company;

  /**
   * Get the user's display name
   * @returns {string} Display name for the user
   */
  get displayName() {
    return this.name || this.email;
  }
}