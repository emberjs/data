/**
  @module @ember-data/store
*/

import type { RecordIdentifier } from './identifier';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';

/**
 * A SchemaDefinitionService implementation provides the ability
 * to query for various information about a resource in an abstract manner.
 *
 * How an implementation determines this information is left up to the implementation,
 * this means that schema information could be lazily populated, derived-on-demand,
 * or progressively enhanced during the course of an application's runtime.
 *
 * The implementation provided to work with `@ember-data/model` makes use of the
 * static schema properties on those classes to respond to these queries; however,
 * that is not a necessary approach. For instance, Schema information could be sideloaded
 * or pre-flighted for API calls, resulting in no need to bundle and ship potentially
 * large and expensive JSON or JS schemas to pull information from.
 *
 * To register a custom schema implementation, extend the store service or
 * lookup and register the schema service first thing on app-boot. Example below
 * shows extending the service.
 *
 * ```ts
 * import Store from '@ember-data/store';
 * import CustomSchemas from './custom-schemas';
 *
 * export default class extends Store {
 *   constructor(...args) {
 *     super(...args);
 *     this.registerSchemaDefinitionService(new CustomSchemas());
 *   }
 * }
 * ```
 *
 * At runtime, both the `Store` and the `StoreWrapper` provide
 * access to this service via the `getSchemaDefinitionService()` method.
 *
 * ```ts
 * export default class extends Component {
 *  @service store;
 *
 *  get attributes() {
 *    return this.store
 *      .getSchemaDefinitionService()
 *      .attributesDefinitionFor(this.args.dataType);
 *  }
 * }
 * ```
 *
 * This is not a class and cannot be instantiated.
 *
 * @class SchemaDefinitionService
 * @public
 */
export interface SchemaDefinitionService {
  /**
   * Queries whether the schema-definition-service recognizes `type` as a resource type
   *
   * @method doesTypeExist
   * @public
   * @param {string} type
   * @returns {boolean}
   */
  doesTypeExist(type: string): boolean;

  /**
   * Returns definitions for all properties of the specified resource
   * that are considered "attributes". Generally these are properties
   * that are not related to book-keeping state on the client and do
   * not represent a linkage to another resource.
   *
   * The return value should be a dictionary of key:value pairs
   * where the `key` is the attribute or property's name and `value`
   * is an object with at least the property `name` which should also
   * match `key`.
   *
   * Optionally, this object may also specify `type`, which should
   * be a string reference to a `transform`, and `options` which
   * should be dictionary in which any key:value pairs are permissable.
   *
   * For instance, when using `@ember-data/model`, the following attribute
   * definition:
   *
   * ```ts
   * class extends Model {
   *   @attr('string', { defaultValue: 'hello' }) greeting;
   *   @attr('date') birthday;
   *   @attr firstName;
   * }
   * ```
   *
   * Would be returned as:
   *
   * ```js
   * {
   *   greeting: { name: 'greeting', type: 'string', options: { defaultValue: 'hello' } },
   *   birthday: { name: 'birthday', type: 'date' },
   *   firstName: { name: 'firstName' }
   * }
   * ```
   *
   * @method attributesDefinitionFor
   * @public
   * @param {RecordIdentifier|{ type: string }} identifier
   * @returns {AttributesSchema}
   */
  attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema;

  /**
   * Returns definitions for all properties of the specified resource
   * that are considered "relationships". Generally these are properties
   * that represent a linkage to another resource.
   *
   * The return value should be a dictionary of key:value pairs
   * where the `key` is the relationship or property's name and `value`
   * is an object with at least the following properties:
   *
   * - `name` which should also match the `key` used in the dictionary.
   * - `kind` which should be either `belongsTo` or `hasMany`
   * - `type` which should be the related resource's string "type"
   * - `options` which should be a dictionary allowing any key but with
   *    at least the below keys present.
   *
   * - `options.async` a boolean representing whether data for this relationship is
   *      typically loaded on-demand.
   * - `options.inverse` a string or null representing the field name / key of the
   *       corresponding relationship on the inverse resource.
   *
   * Additionally the following options properties are optional. See [Polymorphic Relationships](https://rfcs.emberjs.com/id/0793-polymporphic-relations-without-inheritance)
   *
   * - `options.polymorphic` a boolean representing whether multiple resource types
   *       can be used to satisfy this relationship.
   * - `options.as` a string representing the abstract type that the concrete side of
   *       a relationship must specify when fulfilling a polymorphic inverse.
   *
   * For example, the following Model using @ember-data/model would generate this relationships
   * definition by default:
   *
   * ```js
   * class User extends Model {
   *   @belongsTo('user', { async: false, inverse: null }) bestFriend;
   *   @hasMany('user', { async: true, inverse: 'friends' }) friends;
   *   @hasMany('pet', { async: false, polymorphic: true, inverse: 'owner' }) pets;
   * }
   * ```
   *
   * Which would be returned as
   *
   * ```js
   * {
   *   bestFriend: {
   *     name: 'bestFriend',
   *     kind: 'belongsTo',
   *     type: 'user',
   *     options: {
   *       async: false,
   *       inverse: null
   *     }
   *   },
   *   friends: {
   *     name: 'friends',
   *     kind: 'hasMany',
   *     type: 'user',
   *     options: {
   *       async: true,
   *       inverse: 'friends'
   *     }
   *   },
   *   pets: {
   *     name: 'pets',
   *     kind: 'hasMany',
   *     type: 'pet',
   *     options: {
   *       async: false,
   *       polymorphic: true,
   *       inverse: 'owner'
   *     }
   *   },
   * }
   * ```
   *
   * @method relationshipsDefinitionFor
   * @public
   * @param {RecordIdentifier|{ type: string }} identifier
   * @returns {RelationshipsSchema}
   */
  relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema;
}
