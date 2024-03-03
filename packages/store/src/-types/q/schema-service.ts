/**
  @module @ember-data/store
*/

import type { RecordIdentifier } from '@warp-drive/core-types/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@warp-drive/core-types/schema';

export interface FieldSchema {
  type: string | null;
  name: string;
  kind:
    | 'attribute'
    | 'hasMany'
    | 'belongsTo'
    | 'field'
    | 'resource'
    | 'collection'
    | 'derived'
    | 'object'
    | 'array'
    | '@id'
    | '@local';
  options?: Record<string, unknown>;
}

/**
 * The SchemaService provides the ability to query for information about the structure
 * of any resource type.
 *
 * Applications can provide any implementation of the SchemaService they please so long
 * as it conforms to this interface.
 *
 * The design of the service means that schema information could be lazily populated,
 * derived-on-demand, or progressively enhanced during the course of an application's runtime.
 * The primary requirement is merely that any information the service needs to correctly
 * respond to an inquest is available by the time it is asked.
 *
 * The `@ember-data/model` package provides an implementation of this service which
 * makes use of your model classes as the source of information to respond to queries
 * about resource schema. While this is useful, this may not be ideal for your application.
 * For instance, Schema information could be sideloaded or pre-flighted for API calls,
 * resulting in no need to bundle and ship potentially large and expensive JSON
 * or large Javascript based Models to pull information from.
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
 *     this.registerSchema(new CustomSchemas());
 *   }
 * }
 * ```
 *
 * At runtime, both the `Store` and the `CacheCapabilitiesManager` provide
 * access to this service via the `schema` property.
 *
 * ```ts
 * export default class extends Component {
 *  @service store;
 *
 *  get attributes() {
 *    return this.store
 *      .schema
 *      .attributesDefinitionFor(this.args.dataType);
 *  }
 * }
 * ```
 *
 * Note: there can only be one schema service registered at a time.
 * If you register a new schema service, the old one will be replaced.
 *
 * If you would like to inherit from another schema service, you can do so by
 * using typical class inheritance patterns OR by accessing the existing
 * schema service at runtime before replacing it with your own, and then
 * having your own delegate to it when needed.
 *
 * @class <Interface> SchemaService
 * @public
 */
export interface SchemaService {
  /**
   * Queries whether the schema-definition-service recognizes `type` as a resource type
   *
   * @method doesTypeExist
   * @public
   * @param {string} type
   * @return {boolean}
   */
  doesTypeExist(type: string): boolean;

  fields({ type }: { type: string }): Map<string, FieldSchema>;

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
   * @return {AttributesSchema}
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
   *    can be used to satisfy this relationship.
   * - `options.as` a string representing the abstract type that the concrete side of
   *    a relationship must specify when fulfilling a polymorphic inverse.
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
   * @return {RelationshipsSchema}
   */
  relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema;
}
