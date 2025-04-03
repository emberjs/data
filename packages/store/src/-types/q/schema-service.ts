/**
  @module @ember-data/store
*/

import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { RecordIdentifier } from '@warp-drive/core-types/identifier';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core-types/schema/concepts';
import type {
  ArrayField,
  DerivedField,
  FieldSchema,
  GenericField,
  HashField,
  LegacyAttributeField,
  LegacyRelationshipField,
  ObjectField,
  Schema,
} from '@warp-drive/core-types/schema/fields';

export type AttributesSchema = Record<string, LegacyAttributeField>;
export type RelationshipsSchema = Record<string, LegacyRelationshipField>;

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
 * To register a custom schema implementation, implement the store's `createSchemaService`
 * hook to return an instance of your service.
 *
 * ```ts
 * import Store from '@ember-data/store';
 * import CustomSchemas from './custom-schemas';
 *
 * export default class extends Store {
 *   createSchemaService() {
 *     return new CustomSchemas();
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
 *  get fields() {
 *    return this.store
 *      .schema
 *      .fields(this.args.dataType);
 *  }
 * }
 * ```
 *
 * @class <Interface> SchemaService
 * @public
 */
export interface SchemaService {
  /**
   * DEPRECATED - use `hasResource` instead
   *
   * Queries whether the SchemaService recognizes `type` as a resource type
   *
   * @method doesTypeExist
   * @public
   * @deprecated
   * @param {string} type
   * @return {boolean}
   */
  doesTypeExist?(type: string): boolean;

  /**
   * Queries whether the SchemaService recognizes `type` as a resource type
   *
   * @method hasResource
   * @public
   * @param {StableRecordIdentifier|{ type: string }} resource
   * @return {boolean}
   */
  hasResource(resource: { type: string } | StableRecordIdentifier): boolean;

  /**
   * Queries whether the SchemaService recognizes `type` as a resource trait
   *
   * @method hasTrait
   * @public
   * @param {string} type
   * @return {boolean}
   */
  hasTrait(type: string): boolean;

  /**
   * Queries whether the given resource has the given trait
   *
   * @method resourceHasTrait
   * @public
   * @param {StableRecordIdentifier|{ type: string }} resource
   * @param {string} trait
   * @return {boolean}
   */
  resourceHasTrait(resource: { type: string } | StableRecordIdentifier, trait: string): boolean;

  /**
   * Queries for the fields of a given resource type or resource identity.
   *
   * Should error if the resource type is not recognized.
   *
   * @method fields
   * @public
   * @param {StableRecordIdentifier|{ type: string }} resource
   * @return {Map<string, FieldSchema>}
   */
  fields(resource: { type: string } | StableRecordIdentifier): Map<string, FieldSchema>;

  /**
   * Returns the transformation registered with the name provided
   * by `field.type`. Validates that the field is a valid transformable.
   *
   * @method transformation
   * @public
   * @param {TransformableField|{ type: string }} field
   * @return {Transformation}
   */
  transformation(field: GenericField | ObjectField | ArrayField | { type: string }): Transformation;

  /**
   * Returns the hash function registered with the name provided
   * by `field.type`. Validates that the field is a valid HashField.
   *
   * @method hashFn
   * @public
   * @param {HashField|{ type: string }} field
   * @return {HashFn}
   */
  hashFn(field: HashField | { type: string }): HashFn;

  /**
   * Returns the derivation registered with the name provided
   * by `field.type`. Validates that the field is a valid DerivedField.
   *
   * @method derivation
   * @public
   * @param {DerivedField|{ type: string }} field
   * @return {Derivation}
   */
  derivation(field: DerivedField | { type: string }): Derivation;

  /**
   * Returns the schema for the provided resource type.
   *
   * @method resource
   * @public
   * @param {StableRecordIdentifier|{ type: string }} resource
   * @return {ResourceSchema}
   */
  resource(resource: { type: string } | StableRecordIdentifier): Schema;

  /**
   * Enables registration of multiple ResourceSchemas at once.
   *
   * This can be useful for either pre-loading schema information
   * or for registering schema information delivered by API calls
   * or other sources just-in-time.
   *
   * @method registerResources
   * @public
   * @param schemas
   */
  registerResources(schemas: Schema[]): void;

  /**
   * Enables registration of a single ResourceSchema.
   *
   * This can be useful for either pre-loading schema information
   * or for registering schema information delivered by API calls
   * or other sources just-in-time.
   *
   * @method registerResource
   * @public
   * @param {ResourceSchema} schema
   */
  registerResource(schema: Schema): void;

  /**
   * Enables registration of a transformation.
   *
   * The transformation can later be retrieved by the name
   * attached to it's `[Type]` property.
   *
   * @method registerTransformations
   * @public
   * @param {Transformation} transform
   */
  registerTransformation(transform: Transformation): void;

  /**
   * Enables registration of a derivation.
   *
   * The derivation can later be retrieved by the name
   * attached to it's `[Type]` property.
   *
   * @method registerDerivations
   * @public
   * @param {Derivation} derivation
   */
  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void;

  /**
   * Enables registration of a hashing function
   *
   * The hashing function can later be retrieved by the name
   * attached to it's `[Type]` property.
   *
   * @method registerHashFn
   * @public
   * @param {HashFn} hashfn
   */
  registerHashFn(hashFn: HashFn): void;

  /**
   * DEPRECATED - use `fields` instead
   *
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
   * @deprecated
   * @param {RecordIdentifier|{ type: string }} identifier
   * @return {AttributesSchema}
   */
  attributesDefinitionFor?(identifier: RecordIdentifier | { type: string }): AttributesSchema;

  /**
   * DEPRECATED - use `fields` instead
   *
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
   * @deprecated
   * @param {RecordIdentifier|{ type: string }} identifier
   * @return {RelationshipsSchema}
   */
  relationshipsDefinitionFor?(identifier: RecordIdentifier | { type: string }): RelationshipsSchema;

  /**
   * Returns all known resource types
   */
  resourceTypes(): Readonly<string[]>;
}
