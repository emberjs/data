import type { CAUTION_MEGA_DANGER_ZONE_Extension, ProcessedExtension } from '../../reactive.ts';
import type { ExtensibleField } from '../../reactive/-private/schema.ts';
import type { ResourceKey } from '../identifier.ts';
import type { ObjectValue } from '../json/raw.ts';
import type { Derivation, HashFn, Transformation } from './concepts.ts';
import type {
  ArrayField,
  CacheableFieldSchema,
  DerivedField,
  FieldSchema,
  GenericField,
  HashField,
  IdentityField,
  LegacyAttributeField,
  LegacyRelationshipField,
  ObjectField,
  Schema,
  Trait,
} from './fields.ts';

export type AttributesSchema = Record<string, LegacyAttributeField>;
export type RelationshipsSchema = Record<string, LegacyRelationshipField>;

interface ObjectWithStringTypeProperty {
  type: string;
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
 * @public
 */
export interface SchemaService {
  /**
   * DEPRECATED - use `hasResource` instead
   *
   * Queries whether the SchemaService recognizes `type` as a resource type
   *
   * @public
   * @deprecated - use {@link SchemaService.hasResource | hasResource}
   */
  doesTypeExist?(type: string): boolean;

  /**
   * Queries whether the SchemaService recognizes `type` as a resource type
   *
   * @public
   */
  hasResource(resource: ObjectWithStringTypeProperty | ResourceKey): boolean;

  /**
   * Queries whether the SchemaService recognizes `type` as a resource trait
   *
   * @public
   */
  hasTrait(type: string): boolean;

  /**
   * Queries whether the given resource has the given trait
   *
   * @public
   */
  resourceHasTrait(resource: ObjectWithStringTypeProperty | ResourceKey, trait: string): boolean;

  /**
   * Queries for the fields of a given resource type or resource identity.
   *
   * Should error if the resource type is not recognized.
   *
   * @public
   */
  fields(resource: ObjectWithStringTypeProperty | ResourceKey): Map<string, FieldSchema>;

  /**
   * Queries for the fields of a given resource type or resource identity.
   *
   * Should error if the resource type is not recognized.
   *
   * @public
   */
  cacheFields?(
    resource: ObjectWithStringTypeProperty | ResourceKey
  ): Map<string, Exclude<CacheableFieldSchema, IdentityField>>;

  /**
   * Returns the transformation registered with the name provided
   * by `field.type`. Validates that the field is a valid transformable.
   *
   * @public
   */
  transformation(field: GenericField | ObjectField | ArrayField | ObjectWithStringTypeProperty): Transformation;

  /**
   * Returns the hash function registered with the name provided
   * by `field.type`. Validates that the field is a valid HashField.
   *
   * @public
   */
  hashFn(field: HashField | ObjectWithStringTypeProperty): HashFn;

  /**
   * Returns the derivation registered with the name provided
   * by `field.type`. Validates that the field is a valid DerivedField.
   *
   * @public
   */
  derivation(field: DerivedField | ObjectWithStringTypeProperty): Derivation;

  /**
   * Returns the schema for the provided resource type.
   *
   * @public
   */
  resource(resource: ObjectWithStringTypeProperty | ResourceKey): Schema;

  /**
   * Enables registration of multiple Schemas at once.
   *
   * This can be useful for either pre-loading schema information
   * or for registering schema information delivered by API calls
   * or other sources just-in-time.
   *
   * @public
   */
  registerResources(schemas: Schema[]): void;

  /**
   * Enables registration of a single Schema representing either
   * a resource in PolarisMode or LegacyMode or an ObjectSchema
   * representing an embedded structure in other schemas.
   *
   * This can be useful for either pre-loading schema information
   * or for registering schema information delivered by API calls
   * or other sources just-in-time.
   *
   * @public
   */
  registerResource(schema: Schema): void;

  /**
   * Enables registration of a transformation.
   *
   * The transformation can later be retrieved by the name
   * attached to it's `[Type]` property.
   *
   * @public
   */
  registerTransformation(transform: Transformation): void;

  /**
   * Enables registration of a derivation.
   *
   * The derivation can later be retrieved by the name
   * attached to it's `[Type]` property.
   *
   * @public
   */
  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void;

  /**
   * Enables registration of a hashing function
   *
   * The hashing function can later be retrieved by the name
   * attached to it's `[Type]` property.
   *
   * @public
   */
  registerHashFn(hashFn: HashFn): void;

  /**
   * Registers a {@link Trait} for use by resource schemas.
   *
   * Traits are re-usable collections of fields that can be composed to
   * build up a resource schema. Often they represent polymorphic behaviors
   * a resource should exhibit.
   *
   * When we finalize a resource, we walk its traits and apply their fields
   * to the resource's fields. All specified traits must be registered by
   * this time or an error will be thrown.
   *
   * Traits are applied left-to-right, with traits of traits being applied in the same
   * way. Thus for the most part, application of traits is a post-order graph traversal
   * problem.
   *
   * A trait is only ever processed once. If multiple traits (A, B, C) have the same
   * trait (D) as a dependency, D will be included only once when first encountered by
   * A.
   *
   * If a cycle exists such that trait A has trait B which has Trait A, trait A will
   * be applied *after* trait B in production. In development a cycle error will be thrown.
   *
   * Fields are finalized on a "last wins principle". Thus traits appearing higher in
   * the tree and further to the right of a traits array take precedence, with the
   * resource's fields always being applied last and winning out.
   *
   * @public
   */
  registerTrait?(trait: Trait): void;

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
   * @public
   * @deprecated - use {@link SchemaService.fields | fields}
   */
  attributesDefinitionFor?(key: ResourceKey | ObjectWithStringTypeProperty): AttributesSchema;

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
   * @public
   * @deprecated - use {@link SchemaService.fields | fields}
   */
  relationshipsDefinitionFor?(key: ResourceKey | ObjectWithStringTypeProperty): RelationshipsSchema;

  /**
   * Returns all known resource types
   *
   * @public
   */
  resourceTypes(): Readonly<string[]>;

  /**
   * Register an extension for either objects or arrays
   *
   * See also {@link CAUTION_MEGA_DANGER_ZONE_Extension}
   *
   * @public
   */
  CAUTION_MEGA_DANGER_ZONE_registerExtension?(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void;

  /**
   * Retrieve the extension map for a resource
   *
   * @public
   */
  CAUTION_MEGA_DANGER_ZONE_resourceExtensions?(
    resource: ResourceKey | { type: string }
  ): null | ProcessedExtension['features'];

  /**
   * Retrieve the extension map for an object field
   *
   * @public
   */
  CAUTION_MEGA_DANGER_ZONE_objectExtensions?(
    field: ExtensibleField,
    resolvedType: string | null
  ): null | ProcessedExtension['features'];

  /**
   * Retrieve the extension map for an array field
   *
   * @public
   */
  CAUTION_MEGA_DANGER_ZONE_arrayExtensions?(field: ExtensibleField): null | ProcessedExtension['features'];

  /**
   * Check if a specific extension has been registered previously
   *
   * @public
   */
  CAUTION_MEGA_DANGER_ZONE_hasExtension?(ext: { kind: 'object' | 'array'; name: string }): boolean;
}
