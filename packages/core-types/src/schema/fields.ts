/**
 * @module @warp-drive/core-types
 */
import type { ObjectValue, PrimitiveValue } from '../json/raw';

/**
 * A generic "field" that can be used to define
 * primitive value fields.
 *
 * Replaces "attribute" for primitive value fields.
 * Can also be used to eject from deep-tracking of
 * objects or arrays.
 *
 * A major difference between "field" and "attribute"
 * is that "type" points to a legacy transform on
 * "attribute" that a serializer *might* use, while
 * "type" points to a new-style transform on "field"
 * that a record implmentation *must* use.
 *
 * @class <Type> GenericField
 * @public
 */
export interface GenericField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'field'}
   * @public
   */
  kind: 'field';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * the name of the transform to use, if any
   *
   * @property type
   * @type {String | undefined}
   * @public
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: ObjectValue;
}

/**
 * A field that can be used to alias one key to another
 * key present in the cache version of the resource.
 *
 * Unlike DerivedField, an AliasField may write to its
 * source when a record is in an editable mode.
 *
 * AliasFields may utilize a transform, specified by type,
 * to pre/post process the field.
 *
 * An AliasField may also specify a `kind` via options.
 * `kind` may be any other valid field kind other than
 *
 * - `@hash`
 * - `@id`
 * - `@local`
 * - `derived`
 *
 * This allows an AliasField to rename any field in the cache.
 *
 * Alias fields are generally intended to be used to support migrating
 * between different schemas, though there are times where they are useful
 * as a form of advanced derivation when used with a transform. For instance,
 * an AliasField could be used to expose both a string and a Date version of the
 * same field, with both being capable of being written to.
 *
 * @class <Type> LegacyAliasField
 * @public
 */
export interface LegacyAliasField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'alias'}
   * @public
   */
  kind: 'alias';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * Always null (for now)
   *
   * @property type
   * @type {null}
   * @public
   */
  type: null; // should always be null

  /**
   * The field def for which this is an alias.
   *
   * @property options
   * @type {GenericField | ObjectField | SchemaObjectField | ArrayField | SchemaArrayField | LegacyAttributeField | LegacyBelongsToField | LegacyHasManyField}
   * @public
   */
  options:
    | GenericField
    | ObjectField
    | SchemaObjectField
    | ArrayField
    | SchemaArrayField
    // | ResourceField
    // | CollectionField
    | LegacyAttributeField
    | LegacyBelongsToField
    | LegacyHasManyField;
}

/**
 * A field that can be used to alias one key to another
 * key present in the cache version of the resource.
 *
 * Unlike DerivedField, an AliasField may write to its
 * source when a record is in an editable mode.
 *
 * AliasFields may utilize a transform, specified by type,
 * to pre/post process the field.
 *
 * An AliasField may also specify a `kind` via options.
 * `kind` may be any other valid field kind other than
 *
 * - `@hash`
 * - `@id`
 * - `@local`
 * - `derived`
 *
 * This allows an AliasField to rename any field in the cache.
 *
 * Alias fields are generally intended to be used to support migrating
 * between different schemas, though there are times where they are useful
 * as a form of advanced derivation when used with a transform. For instance,
 * an AliasField could be used to expose both a string and a Date version of the
 * same field, with both being capable of being written to.
 *
 * @class <Type> PolarisAliasField
 * @public
 */
export interface PolarisAliasField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'alias'}
   * @public
   */
  kind: 'alias';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * Always null (for now)
   *
   * @property type
   * @type {null}
   * @public
   */
  type: null; // should always be null

  /**
   * The field def for which this is an alias.
   *
   * @property options
   * @type {GenericField | ObjectField | SchemaObjectField | ArrayField | SchemaArrayField | LinksModeBelongsToField | LinksModeHasManyField}
   * @public
   */
  options:
    | GenericField
    | ObjectField
    | SchemaObjectField
    | ArrayField
    | SchemaArrayField
    // | ResourceField
    // | CollectionField
    | LinksModeBelongsToField
    | LinksModeHasManyField;
}

/**
 * A field that can be used to alias one key to another
 * key present in the cache version of the resource.
 *
 * Unlike DerivedField, an AliasField may write to its
 * source when a record is in an editable mode.
 *
 * AliasFields may utilize a transform, specified by type,
 * to pre/post process the field.
 *
 * An AliasField may also specify a `kind` via options.
 * `kind` may be any other valid field kind other than
 *
 * - `@hash`
 * - `@id`
 * - `@local`
 * - `derived`
 *
 * This allows an AliasField to rename any field in the cache.
 *
 * Alias fields are generally intended to be used to support migrating
 * between different schemas, though there are times where they are useful
 * as a form of advanced derivation when used with a transform. For instance,
 * an AliasField could be used to expose both a string and a Date version of the
 * same field, with both being capable of being written to.
 *
 * @class <Type> ObjectAliasField
 * @public
 */
export interface ObjectAliasField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'alias'}
   * @public
   */
  kind: 'alias';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * Always null (for now)
   *
   * @property type
   * @type {null}
   * @public
   */
  type: null; // should always be null

  /**
   * The field def for which this is an alias.
   *
   * @property options
   * @type {GenericField | ObjectField | SchemaObjectField | ArrayField | SchemaArrayField}
   * @public
   */
  options: GenericField | ObjectField | SchemaObjectField | ArrayField | SchemaArrayField;
}

/**
 * Represents a field whose value is the primary
 * key of the resource.
 *
 * This allows any field to serve as the primary
 * key while still being able to drive identity
 * needs within the system.
 *
 * This is useful for resources that use for instance
 * 'uuid', 'urn' or 'entityUrn' or 'primaryKey' as their
 * primary key field instead of 'id'.
 *
 * @class <Type> IdentityField
 * @public
 */
export interface IdentityField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'@id'}
   * @public
   */
  kind: '@id';

  /**
   * The name of the field that serves as the
   * primary key for the resource.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;
}

/**
 * Represents a specialized field whose computed value
 * will be used as the primary key of a schema-object
 * for serializability and comparison purposes.
 *
 * This field functions similarly to derived fields in that
 * it is non-settable, derived state but differs in that
 * it is only able to compute off of cache state and is given
 * no access to a record instance.
 *
 * This means that if a hashing function wants to compute its value
 * taking into account transformations and derivations it must
 * perform those itself.
 *
 * A schema-array can declare its "key" value to be `@hash` if
 * a schema-object has such a field.
 *
 * Only one hash field is permittable per schema-object, and
 * it should be placed in the `ResourceSchema`'s `@id` field
 * in place of an `IdentityField`.
 *
 * @class <Type> HashField
 * @public
 */
export interface HashField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'@hash'}
   * @public
   */
  kind: '@hash';

  /**
   * The name of the field that serves as the
   * hash for the resource.
   *
   * Only required if access to this value by
   * the UI is desired, it can be `null` otherwise.
   *
   * @property name
   * @type {String | null}
   * @public
   */
  name: string | null;

  /**
   * The name of a function to run to compute the hash.
   * The function will only have access to the cached
   * data for the record.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Any options that should be provided to the hash
   * function.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: ObjectValue;
}

/**
 * Represents a field whose value is a local
 * value that is not stored in the cache, nor
 * is it sent to the server.
 *
 * Local fields can be written to, and their
 * value is both memoized and reactive (though
 * not deep-tracked).
 *
 * Because their state is not derived from the cache
 * data or the server, they represent a divorced
 * uncanonical source of state.
 *
 * For this reason Local fields should be used sparingly.
 *
 * Currently, while we document this feature here,
 * only allow our own SchemaRecord default fields to
 * utilize them and the feature should be considered private.
 *
 * Example use cases that drove the creation of local
 * fields are states like `isDestroying` and `isDestroyed`
 * which are specific to a record instance but not
 * stored in the cache. We wanted to be able to drive
 * these fields from schema the same as all other fields.
 *
 * Don't make us regret this decision.
 *
 * @class <Type> LocalField
 * @public
 */
export interface LocalField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'@local'}
   * @public
   */
  kind: '@local';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;
  /**
   * Not currently utilized, we are considering
   * allowing transforms to operate on local fields
   *
   * @property type
   * @type {String | undefined}
   * @public
   */
  type?: string;

  /**
   * Options for the field.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: { defaultValue?: PrimitiveValue };
}

/**
 * Represents a field whose value is an object
 * with keys pointing to values that are primitive
 * values.
 *
 * If values of the keys are not primitives, or
 * if the key/value pairs have well-defined shape,
 * use 'schema-object' instead.
 *
 * @class <Type> ObjectField
 * @public
 */
export interface ObjectField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'object'}
   * @public
   */
  kind: 'object';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of a transform to pass the entire object
   * through before displaying or serializing it.
   *
   * @property type
   * @type {String | undefined}
   * @public
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: ObjectValue;
}

/**
 * Represents a field whose value is an object
 * with a well-defined structure described by
 * a non-resource schema.
 *
 * If the object's structure is not well-defined,
 * use 'object' instead.
 *
 * @class <Type> SchemaObjectField
 * @public
 */
export interface SchemaObjectField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'schema-object'}
   * @public
   */
  kind: 'schema-object';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the ObjectSchema that describes the
   * structure of the object.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for configuring the behavior of the
   * SchemaObject.
   *
   * - `polymorphic` : Whether this SchemaObject is Polymorphic.
   * - `type` : If the SchemaObject is Polymorphic, the key on the raw cache data to use as the "resource-type" value for the schema-object.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: {
    /**
     * Whether this SchemaObject is Polymorphic.
     *
     * If the SchemaObject is polymorphic, `options.type` must also be supplied.
     *
     * @typedoc
     */
    polymorphic?: boolean;

    /**
     * If the SchemaObject is Polymorphic, the key on the raw cache data to use
     * as the "resource-type" value for the schema-object.
     *
     * Defaults to "type".
     *
     * @typedoc
     */
    type?: string;
  };
}

/**
 * Represents a field whose value is an array
 * of primitive values.
 *
 * If the array's elements are not primitive
 * values, use 'schema-array' instead.
 *
 * @class <Type> ArrayField
 * @public
 */
export interface ArrayField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'array'}
   * @public
   */
  kind: 'array';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of a transform to pass each item
   * in the array through before displaying or
   * or serializing it.
   *
   * @property type
   * @type {String | undefined}
   * @public
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: ObjectValue;
}

/**
 * Represents a field whose value is an array
 * of objects with a well-defined structure
 * described by a non-resource schema.
 *
 * If the array's elements are not well-defined,
 * use 'array' instead.
 *
 * @class <Type> SchemaArrayField
 * @public
 */
export interface SchemaArrayField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'schema-array'}
   * @public
   */
  kind: 'schema-array';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the ObjectSchema that describes the
   * structure of the objects in the array.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for configuring the behavior of the
   * SchemaArray.
   *
   * - `key`
   *
   * Configures how the SchemaArray determines whether an object in the cache is the same
   * as an object previously used to instantiate one of the schema-objects it contains.
   *
   * The default is `'@identity'`.
   *
   * Valid options are:
   *
   * - `'@identity'` (default) : the cached object's referential identity will be used.
   *       This may result in significant instability when resource data is updated from the API
   * - `'@index'`              : the cached object's index in the array will be used.
   *       This is only a good choice for arrays that rarely if ever change membership
   * - `'@hash'`               : will lookup the `@hash` function supplied in the ResourceSchema for
   *       The contained schema-object and use the computed result to determine and compare identity.
   * - <field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
   *       Are valid field names for this purpose. The cache state without transforms applied will be
   *       used when comparing values. The field value should be unique enough to guarantee two schema-objects
   *       of the same type will not collide.
   *
   * - `polymorphic` : Whether this SchemaArray is Polymorphic.
   * - `type` : If the SchemaArray is Polymorphic, the key on the raw cache data to use as the "resource-type" value for the schema-object.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: {
    /**
     * Configures how the SchemaArray determines whether
     * an object in the cache is the same as an object
     * previously used to instantiate one of the schema-objects
     * it contains.
     *
     * The default is `'@identity'`.
     *
     * Valid options are:
     *
     * - `'@identity'` (default) : the cached object's referential identity will be used.
     *       This may result in significant instability when resource data is updated from the API
     * - `'@index'`              : the cached object's index in the array will be used.
     *       This is only a good choice for arrays that rarely if ever change membership
     * - `'@hash'`               : will lookup the `@hash` function supplied in the ResourceSchema for
     *       The contained schema-object and use the computed result to determine and compare identity.
     * - <field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
     *       Are valid field names for this purpose. The cache state without transforms applied will be
     *       used when comparing values. The field value should be unique enough to guarantee two schema-objects
     *       of the same type will not collide.
     *
     * @typedoc
     */
    key?: '@identity' | '@index' | '@hash' | string;

    /**
     * Whether this SchemaArray is Polymorphic.
     *
     * If the SchemaArray is polymorphic, `options.type` must also be supplied.
     *
     * @typedoc
     */
    polymorphic?: boolean;

    /**
     * If the SchemaArray is Polymorphic, the key on the raw cache data to use
     * as the "resource-type" value for the schema-object.
     *
     * Defaults to "type".
     *
     * @typedoc
     */
    type?: string;
  };
}

/**
 * Represents a field whose value is derived
 * from other fields in the schema.
 *
 * The value is read-only, and is not stored
 * in the cache, nor is it sent to the server.
 *
 * Usage of derived fields should be minimized
 * to scenarios where the derivation is known
 * to be safe. For instance, derivations that
 * required fields that are not always loaded
 * or that require access to related resources
 * that may not be loaded should be avoided.
 *
 * @class <Type> DerivedField
 * @public
 */
export interface DerivedField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'derived'}
   * @public
   */
  kind: 'derived';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the derivation to use.
   *
   * Derivations are functions that take the
   * record, options, and the name of the field
   * as arguments, and return the derived value.
   *
   * Derivations are memoized, and are only
   * recomputed when the fields they depend on
   * change.
   *
   * Derivations are not stored in the cache,
   * and are not sent to the server.
   *
   * Derivation functions must be explicitly
   * registered with the schema service.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options to pass to the derivation, if any
   *
   * Must comply to the specific derivation's
   * options schema.
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: ObjectValue;
}

/**
 * Represents a field that is a reference to
 * another resource.
 *
 * SUPPORT FOR THIS FEATURE IS NOT YET IMPLEMENTED
 * BY SchemaRecord
 *
 * @class <Type> ResourceField
 * @public
 */
export interface ResourceField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'resource'}
   * @public
   */
  kind: 'resource';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for resources are optional. If
   * not present, all options are presumed
   * to be falsey
   *
   * @property options
   * @type {ObjectValue | undefined}
   * @public
   */
  options?: {
    /**
     * Whether the relationship is async
     *
     * If true, it is expected that the cache
     * data for this field will contain a link
     * that can be used to fetch the related
     * resource when needed.
     *
     * @typedoc
     */
    async?: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     *
     * @typedoc
     */
    inverse?: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @typedoc
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @typedoc
     */
    polymorphic?: boolean;
  };
}

/**
 * Represents a field that is a reference to
 * a collection of other resources, potentially
 * paginate.
 *
 * SUPPORT FOR THIS FEATURE IS NOT YET IMPLEMENTED
 * BY SchemaRecord
 *
 * @class <Type> CollectionField
 * @public
 */
export interface CollectionField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'collection'}
   * @public
   */
  kind: 'collection';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for resources are optional. If
   * not present, all options are presumed
   * to be falsey
   *
   * @typedoc
   */
  options?: {
    /**
     * Whether the relationship is async
     *
     * If true, it is expected that the cache
     * data for this field will contain links
     * that can be used to fetch the related
     * resources when needed.
     *
     * When false, it is expected that all related
     * resources are loaded together with this resource,
     * and that the cache data for this field will
     * contain the full list of pointers.
     *
     * When true, it is expected that the relationship
     * is paginated. If the relationship is not paginated,
     * then the cache data for "page 1" would contain the
     * full list of pointers, and loading "page 1" would
     * load all related resources.
     *
     * @typedoc
     */
    async?: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     *
     * @typedoc
     */
    inverse?: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @typedoc
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @typedoc
     */
    polymorphic?: boolean;
  };
}

/**
 * > [!CAUTION]
 * > This Field is LEGACY
 * > It cannot be used with PolarisMode
 *
 * A generic "field" that can be used to define
 * primitive value fields.
 *
 * If the field points to an object or array,
 * it will not be deep-tracked.
 *
 * Transforms when defined are legacy transforms
 * that a serializer *might* use, but their usage
 * is not guaranteed.
 *
 * @class <Type> LegacyAttributeField
 * @public
 */
export interface LegacyAttributeField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'attribute'}
   * @public
   */
  kind: 'attribute';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;
  /**
   * The name of the transform to use, if any
   *
   * @property type
   * @type {String | undefined | null}
   * @public
   */
  type?: string | null;
  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * @typedoc
   */
  options?: ObjectValue;
}

/**
 * > [!CAUTION]
 * > This Field is LEGACY
 *
 * Represents a field that is a reference to
 * another resource.
 *
 * This is the legacy version of the `ResourceField`.
 *
 * @class <Type> LegacyBelongsToField
 * @public
 */
export interface LegacyBelongsToField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'belongsTo'}
   * @public
   */
  kind: 'belongsTo';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for belongsTo are mandatory.
   *
   * @typedoc
   */
  options: {
    /**
     * Whether the relationship is async
     *
     * If true, it is expected that the cache
     * data for this field will contain a link
     * or a pointer that can be used to fetch
     * the related resource when needed.
     *
     * Pointers are highly discouraged.
     *
     * @typedoc
     */
    async: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     *
     * @typedoc
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @typedoc
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @typedoc
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @ember-data/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * will be expected to already have all their data. When reloading a sync relationship
     * you would be expected to have a `related link` available from a prior relationship
     * payload e.g.
     *
     * ```ts
     * {
     *   data: {
     *     type: 'user',
     *     id: '2',
     *     attributes: { name: 'Chris' },
     *     relationships: {
     *       bestFriend: {
     *         links: { related: "/users/1/bestFriend" },
     *         data: { type: 'user', id: '1' },
     *       }
     *     }
     *   },
     *   included: [
     *     { type: 'user', id: '1', attributes: { name: 'Krystan' } }
     *   ]
     * }
     * ```
     *
     * Async relationships will be loaded via their link if needed.
     *
     * @typedoc
     */
    linksMode?: true;

    /**
     * When omitted, the cache data for this field will
     * clear local state of all changes except for the
     * addition of records still in the "new" state any
     * time the remote data for this field is updated.
     *
     * When set to `false`, the cache data for this field
     * will instead intelligently commit any changes from
     * local state that are present in the remote data,
     * leaving any remaining changes in local state still.
     *
     * @typedoc
     */
    resetOnRemoteUpdate?: false;
  };
}

/**
 * > [!CAUTION]
 * > This Field is LEGACY
 *
 * Represents a field that is a reference to
 * another resource.
 *
 * This is the legacy version of the `ResourceField`.
 *
 * @class <Type> LinksModeBelongsToField
 * @public
 */
export interface LinksModeBelongsToField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'belongsTo'}
   * @public
   */
  kind: 'belongsTo';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for belongsTo are mandatory.
   *
   * @typedoc
   */
  options: {
    /**
     * Whether the relationship is async
     *
     * MUST be false for PolarisMode + LinksMode
     *
     * @typedoc
     */
    async: false;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     *
     * @typedoc
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @typedoc
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @typedoc
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @ember-data/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * MUST be true for PolarisMode + LinksMode
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * will be expected to already have all their data. When reloading a sync relationship
     * you would be expected to have a `related link` available from a prior relationship
     * payload e.g.
     *
     * ```ts
     * {
     *   data: {
     *     type: 'user',
     *     id: '2',
     *     attributes: { name: 'Chris' },
     *     relationships: {
     *       bestFriend: {
     *         links: { related: "/users/1/bestFriend" },
     *         data: { type: 'user', id: '1' },
     *       }
     *     }
     *   },
     *   included: [
     *     { type: 'user', id: '1', attributes: { name: 'Krystan' } }
     *   ]
     * }
     * ```
     *
     * Async relationships will be loaded via their link if needed.
     *
     * Activating LinksMode will *also* deactivate the deprecated
     * `resetOnRemoteUpdate` behavior for this field.
     *
     * This means that when new remote state is received, the cache
     * will intelligently commit any changes from local state that
     * are present in the remote data for this field, leaving any remaining
     * changes in local state still.
     *
     * Previously, the cache would clear local state of all changes
     * except for the addition of records still in the "new" state any
     * time the remote data for this field was updated.
     *
     * @typedoc
     */
    linksMode: true;
  };
}

/**
 * > [!CAUTION]
 * > This Field is LEGACY
 *
 * Represents a field that is a reference to
 * a collection of other resources.
 *
 * This is the legacy version of the `CollectionField`.
 *
 * @class <Type> LegacyHasManyField
 * @public
 */
export interface LegacyHasManyField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'hasMany'}
   * @public
   */
  kind: 'hasMany';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * the name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for hasMany are mandatory.
   *
   * @typedoc
   */
  options: {
    /**
     * Whether the relationship is async
     *
     * If true, it is expected that the cache
     * data for this field will contain links
     * or pointers that can be used to fetch
     * the related resources when needed.
     *
     * When false, it is expected that all related
     * resources are loaded together with this resource,
     * and that the cache data for this field will
     * contain the full list of pointers.
     *
     * hasMany relationships do not support pagination.
     *
     * @typedoc
     */
    async: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     *
     * @typedoc
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @typedoc
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @typedoc
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @ember-data/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * will be expected to already have all their data. When reloading a sync relationship
     * you would be expected to have a `related link` available from a prior relationship
     * payload e.g.
     *
     * ```ts
     * {
     *   data: {
     *     type: 'user',
     *     id: '2',
     *     attributes: { name: 'Chris' },
     *     relationships: {
     *       bestFriends: {
     *         links: { related: "/users/1/bestFriends" },
     *         data: [ { type: 'user', id: '1' } ],
     *       }
     *     }
     *   },
     *   included: [
     *     { type: 'user', id: '1', attributes: { name: 'Krystan' } }
     *   ]
     * }
     * ```
     *
     * Async relationships will be loaded via their link if needed.
     *
     * @typedoc
     */
    linksMode?: true;

    /**
     * When omitted, the cache data for this field will
     * clear local state of all changes except for the
     * addition of records still in the "new" state any
     * time the remote data for this field is updated.
     *
     * When set to `false`, the cache data for this field
     * will instead intelligently commit any changes from
     * local state that are present in the remote data,
     * leaving any remaining changes in local state still.
     *
     * @typedoc
     */
    resetOnRemoteUpdate?: false;
  };
}

/**
 * > [!CAUTION]
 * > This Field is LEGACY
 *
 * Represents a field that is a reference to
 * a collection of other resources.
 *
 * This is the legacy version of the `CollectionField`.
 *
 * @class <Type> LinksModeHasManyField
 * @public
 */
export interface LinksModeHasManyField {
  /**
   * The kind of field this is.
   *
   * @property kind
   * @type {'hasMany'}
   * @public
   */
  kind: 'hasMany';

  /**
   * The name of the field.
   *
   * @property name
   * @type {String}
   * @public
   */
  name: string;

  /**
   * the name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * Options for hasMany are mandatory.
   *
   * @typedoc
   */
  options: {
    /**
     * Whether the relationship is async
     *
     * MUST be false for PolarisMode + LinksMode
     *
     * If true, it is expected that the cache
     * data for this field will contain links
     * or pointers that can be used to fetch
     * the related resources when needed.
     *
     * When false, it is expected that all related
     * resources are loaded together with this resource,
     * and that the cache data for this field will
     * contain the full list of pointers.
     *
     * hasMany relationships do not support pagination.
     *
     * @typedoc
     */
    async: false;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     *
     * @typedoc
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @typedoc
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @typedoc
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @ember-data/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * MUST be true for PolarisMode + LinksMode
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * will be expected to already have all their data. When reloading a sync relationship
     * you would be expected to have a `related link` available from a prior relationship
     * payload e.g.
     *
     * ```ts
     * {
     *   data: {
     *     type: 'user',
     *     id: '2',
     *     attributes: { name: 'Chris' },
     *     relationships: {
     *       bestFriends: {
     *         links: { related: "/users/1/bestFriends" },
     *         data: [ { type: 'user', id: '1' } ],
     *       }
     *     }
     *   },
     *   included: [
     *     { type: 'user', id: '1', attributes: { name: 'Krystan' } }
     *   ]
     * }
     * ```
     *
     * Async relationships will be loaded via their link if needed.
     *
     * Activating LinksMode will *also* deactivate the deprecated
     * `resetOnRemoteUpdate` behavior for this field.
     *
     * This means that when new remote state is received, the cache
     * will intelligently commit any changes from local state that
     * are present in the remote data for this field, leaving any remaining
     * changes in local state still.
     *
     * Previously, the cache would clear local state of all changes
     * except for the addition of records still in the "new" state any
     * time the remote data for this field was updated.
     *
     * @typedoc
     */
    linksMode: true;
  };
}

/**
 * A union of all possible LegacyMode field schemas.
 *
 * Available field schemas are:
 *
 * - [GenericField](../classes/<Type>%20GenericField)
 * - [LegacyAliasField](../classes/<Type>%20LegacyAliasField)
 * - [LocalField](../classes/<Type>%20LocalField)
 * - [ObjectField](../classes/<Type>%20ObjectField)
 * - [SchemaObjectField](../classes/<Type>%20SchemaObjectField)
 * - [ArrayField](../classes/<Type>%20ArrayField)
 * - [SchemaArrayField](../classes/<Type>%20SchemaArrayField)
 * - [DerivedField](../classes/<Type>%20DerivedField)
 * - [ResourceField (not yet implemented)](../classes/<Type>%20ResourceField)
 * - [CollectionField (not yet implemented)](../classes/<Type>%20CollectionField)
 * - [LegacyAttributeField](../classes/<Type>%20LegacyAttributeField)
 * - [LegacyBelongsToField](../classes/<Type>%20LegacyBelongsToField)
 * - [LegacyHasManyField](../classes/<Type>%20LegacyHasManyField)
 *
 * @class <Type> LegacyModeFieldSchema
 * @public
 */
export type LegacyModeFieldSchema =
  | GenericField
  | LegacyAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField
  //  | ResourceField // not yet implemented
  //  | CollectionField // not yet implemented
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField;

/**
 * A union of all possible PolarisMode field schemas.
 *
 * Available field schemas are:
 *
 * - [GenericField](../classes/<Type>%20GenericField)
 * - [PolarisAliasField](../classes/<Type>%20PolarisAliasField)
 * - [LocalField](../classes/<Type>%20LocalField)
 * - [ObjectField](../classes/<Type>%20ObjectField)
 * - [SchemaObjectField](../classes/<Type>%20SchemaObjectField)
 * - [ArrayField](../classes/<Type>%20ArrayField)
 * - [SchemaArrayField](../classes/<Type>%20SchemaArrayField)
 * - [DerivedField](../classes/<Type>%20DerivedField)
 * - [ResourceField (not yet implemented)](../classes/<Type>%20ResourceField)
 * - [CollectionField (not yet implemented)](../classes/<Type>%20CollectionField)
 * - [LinksModeBelongsToField](../classes/<Type>%20LinksModeBelongsToField)
 * - [LinksModeHasManyField](../classes/<Type>%20LinksModeHasManyField)
 *
 * @class <Type> PolarisModeFieldSchema
 * @public
 */
export type PolarisModeFieldSchema =
  | GenericField
  | PolarisAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField
  //  | ResourceField
  //  | CollectionField
  | LinksModeBelongsToField
  | LinksModeHasManyField;

/**
 * A union of all possible LegacyMode and PolarisMode
 * field schemas.
 *
 * You likely will want to use PolarisModeFieldSchema,
 * LegacyModeFieldSchema, or ObjectFieldSchema instead
 * as appropriate as they are more specific and will
 * provide better guidance around what is valid.
 *
 * @class <Type> FieldSchema
 * @public
 */
export type FieldSchema =
  | GenericField
  | LegacyAliasField
  | PolarisAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField
  | ResourceField
  | CollectionField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;

/**
 * A union of all possible field schemas that can be
 * used in an ObjectSchema.
 *
 * @class <Type> ObjectFieldSchema
 * @public
 */
export type ObjectFieldSchema =
  | GenericField
  | ObjectAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField;

/**
 * Represents a schema for a primary resource in PolarisMode.
 *
 * Primary resources are objects with a unique identity of their
 * own which may allow them to appear in relationships, or in multiple
 * response documents.
 *
 * @class <Type> PolarisResourceSchema
 * @public
 */
export interface PolarisResourceSchema {
  legacy?: false;

  /**
   * For primary resources, this should be an IdentityField
   *
   * for schema-objects, this should be either a HashField or null
   *
   * @property identity
   * @type {IdentityField}
   * @public
   */
  identity: IdentityField;

  /**
   * The name of the schema
   *
   * For cacheable resources, this should be the
   * primary resource type.
   *
   * For object schemas, this should be the name
   * of the object schema.
   *
   * The names of object and resource schemas share
   * a single namespace and must not conflict.
   *
   * We recommend a naming convention for object schemas
   * such as below for ensuring uniqueness:
   *
   * - for globally shared objects: The pattern `$field:${KlassName}` e.g. `$field:AddressObject`
   * - for resource-specific objects: The pattern `$${ResourceKlassName}:$field:${KlassName}` e.g. `$User:$field:ReusableAddress`
   * - for inline objects: The pattern `$${ResourceKlassName}.${fieldPath}:$field:anonymous` e.g. `$User.shippingAddress:$field:anonymous`
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * The fields that make up the shape of the resource
   *
   * @property fields
   * @type {PolarisModeFieldSchema[]}
   * @public
   */
  fields: PolarisModeFieldSchema[];

  /**
   * A list of traits that this resource implements. The fields for these
   * traits should still be defined in the fields array.
   *
   * Each trait should be a string that matches the `type` of another
   * resource schema. The trait can be abstract and reference a resource
   * type that is never defined as a schema.
   *
   * @property traits
   * @type {String[]}
   * @public
   */
  traits?: string[];
}

/**
 * Represents a schema for a primary resource in LegacyMode
 *
 * Primary resources are objects with a unique identity of their
 * own which may allow them to appear in relationships, or in multiple
 * response documents.
 *
 * @class <Type> LegacyResourceSchema
 * @public
 */
export interface LegacyResourceSchema {
  /**
   * A flag indicating that this is a legacy resource schema
   *
   * @property legacy
   * @type {true}
   * @public
   */
  legacy: true;

  /**
   * This should be an IdentityField.
   *
   * To maximize compatibility with Model where `id` was the
   * name of the identity field, we recommend using `{ kind: '@id', name: 'id' }`
   * for records in legacy mode, but this is not required.
   *
   * @property identity
   * @type {IdentityField}
   * @public
   */
  identity: IdentityField;

  /**
   * The name of the schema
   *
   * For cacheable resources, this should be the
   * primary resource type.
   *
   * The names of object and resource schemas share
   * a single namespace and must not conflict.
   *
   * We recommend a naming convention for object schemas
   * such as below for ensuring uniqueness:
   *
   * - for globally shared objects: The pattern `$field:${KlassName}` e.g. `$field:AddressObject`
   * - for resource-specific objects: The pattern `$${ResourceKlassName}:$field:${KlassName}` e.g. `$User:$field:ReusableAddress`
   * - for inline objects: The pattern `$${ResourceKlassName}.${fieldPath}:$field:anonymous` e.g. `$User.shippingAddress:$field:anonymous`
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * The fields that make up the shape of the resource
   *
   * @property fields
   * @type {LegacyModeFieldSchema[]}
   * @public
   */
  fields: LegacyModeFieldSchema[];

  /**
   * A list of traits that this resource implements. The fields for these
   * traits should still be defined in the fields array.
   *
   * Each trait should be a string that matches the `type` of another
   * resource schema. The trait can be abstract and reference a resource
   * type that is never defined as a schema.
   *
   * @property traits
   * @type {String[]}
   * @public
   */
  traits?: string[];
}

/**
 * A type which represents a valid JSON schema
 * definition for either a PolarisMode or a
 * LegacyMode resource.
 *
 * Note, this is separate from the type returned
 * by the SchemaService which provides fields as a Map
 * instead of as an Array.
 *
 * @typedoc
 */
export type ResourceSchema = PolarisResourceSchema | LegacyResourceSchema;

/**
 * Represents a schema for an object that is not
 * a primary resource (has no unique identity of its own).
 *
 * ObjectSchemas may not currently contain relationships.
 *
 * @class <Type> ObjectSchema
 * @public
 */
export interface ObjectSchema {
  /**
   * Either a HashField from which to calculate an identity or null
   *
   * In the case of `null`, the object's identity will be based
   * on the referential identity of the object in the cache itself
   * when an identity is needed.
   *
   * @property identity
   * @type {HashField | null}
   * @public
   */
  identity: HashField | null;

  /**
   * The name of the schema
   *
   * The names of object and resource schemas share
   * a single namespace and must not conflict.
   *
   * We recommend a naming convention for object schemas
   * such as below for ensuring uniqueness:
   *
   * - for globally shared objects: The pattern `$field:${KlassName}` e.g. `$field:AddressObject`
   * - for resource-specific objects: The pattern `$${ResourceKlassName}:$field:${KlassName}` e.g. `$User:$field:ReusableAddress`
   * - for inline objects: The pattern `$${ResourceKlassName}.${fieldPath}:$field:anonymous` e.g. `$User.shippingAddress:$field:anonymous`
   *
   * @property type
   * @type {String}
   * @public
   */
  type: string;

  /**
   * The fields that make up the shape of the object
   *
   * @property fields
   * @type {ObjectFieldSchema[]}
   * @public
   */
  fields: ObjectFieldSchema[];
}

export type Schema = ResourceSchema | ObjectSchema;

/**
 * A no-op type utility that enables type-checking resource schema
 * definitions.
 *
 * Will return the passed in schema.
 *
 * This will not validate relationship inverses or related types,
 * as doing so would require a full schema graph to be passed in
 * and no cycles in the graph to be present.
 *
 * @method resourceSchema
 * @static
 * @for @warp-drive/core-types
 * @param {ResourceSchema} schema
 * @return {ResourceSchema} the passed in schema
 * @public
 */
export function resourceSchema<T extends LegacyResourceSchema | PolarisResourceSchema>(
  schema: LegacyResourceSchema | PolarisResourceSchema
): T {
  return schema as T;
}

/**
 * A no-op type utility that enables type-checking object schema
 * definitions.
 *
 * Will return the passed in schema.
 *
 * @method objectSchema
 * @static
 * @for @warp-drive/core-types
 * @param {ObjectSchema} schema
 * @return {ObjectSchema} the passed in schema
 * @public
 */
export function objectSchema<T extends ObjectSchema>(schema: T): T {
  return schema;
}

/**
 * A type utility to narrow a schema to a ResourceSchema
 *
 * @method isResourceSchema
 * @static
 * @for @warp-drive/core-types
 * @param schema
 * @return {Boolean}
 * @public
 */
export function isResourceSchema(schema: ResourceSchema | ObjectSchema): schema is ResourceSchema {
  return schema?.identity?.kind === '@id';
}

/**
 * A type utility to narrow a schema to LegacyResourceSchema
 *
 * @method isLegacyResourceSchema
 * @static
 * @for @warp-drive/core-types
 * @param schema
 * @return {Boolean}
 * @public
 */
export function isLegacyResourceSchema(schema: ResourceSchema | ObjectSchema): schema is LegacyResourceSchema {
  return isResourceSchema(schema) && schema.legacy === true;
}

export type LegacyField =
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
export type LegacyRelationshipField =
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
