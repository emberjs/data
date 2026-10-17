/**
 * The [Schemas](/guides/the-manual/schemas/) guide teaches how these schemas and
 * fields fit together.
 *
 * @module
 * @summary Types for every field schema kind and for PolarisMode and LegacyMode resource, object and trait schemas,
 * plus the `resourceSchema` and `objectSchema` helpers and type guards.
 */

// oxlint-disable-next-line no-unused-vars
import type { SchemaService } from '../../types.ts';
// oxlint-disable-next-line no-unused-vars
import type { Cache } from '../cache.ts';
import type { ObjectValue, PrimitiveValue, Value } from '../json/raw.ts';

/**
 * Options signature for Legacy Attributes.
 *
 * @summary Options object on a legacy `attribute` field schema, holding a `defaultValue` (a primitive or a function
 * producing one) plus any transform-specific options.
 */
export interface AttrOptions {
  /**
   * A primitive value or a function which produces a value.
   */
  defaultValue?: PrimitiveValue | (() => Value);
  [key: string]: Value | (() => Value) | undefined;
}

/**
 * A generic "field" that can be used to define
 * primitive value fields.
 *
 * The [SimpleFields](/guides/the-manual/schemas/simple-fields) guide shows how to
 * define them.
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
 * @summary Field schema of kind `field` for a primitive value, optionally converted by a registered `Transformation`;
 * objects and arrays in it are not deep-tracked.
 * @public
 */
export interface GenericField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'field';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link GenericField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * the name of the {@link Transformation} to use, if any
   *
   * @public
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
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
 * ~~AliasFields may utilize a transform, specified by type,
 * to pre/post process the raw data for the field.~~ (not yet implemented)
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
 * @summary Field schema of kind `alias` for LegacyMode resources that exposes another field's cache value, including
 * legacy attributes and relationships, under a new name.
 * @public
 */
export interface LegacyAliasField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'alias';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * Always null (for now)
   *
   * @public
   */
  type: null; // should always be null

  /**
   * The field def for which this is an alias.
   *
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
 * ~~AliasFields may utilize a transform, specified by type,
 * to pre/post process the raw data for the field.~~ (not yet implemented)
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
 * @summary Field schema of kind `alias` for PolarisMode resources that exposes another field's cache value, including
 * LinksMode relationships, under a new name.
 * @public
 */
export interface PolarisAliasField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'alias';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * Always null (for now)
   *
   * @public
   */
  type: null; // should always be null

  /**
   * The field def for which this is an alias.
   *
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
 * @summary Field schema of kind `alias` for object schemas that exposes another non-relationship field's cache value
 * under a new name.
 * @public
 */
export interface ObjectAliasField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'alias';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * Always null (for now)
   *
   * @public
   */
  type: null; // should always be null

  /**
   * The field def for which this is an alias.
   *
   * @public
   */
  options: GenericField | ObjectField | SchemaObjectField | ArrayField | SchemaArrayField;
}

/**
 * Represents a field whose value is the primary
 * key of the resource.
 *
 * The [ResourceSchemas](/guides/the-manual/schemas/resources/) guide shows where it
 * sits in a schema.
 *
 * This allows any field to serve as the primary
 * key while still being able to drive identity
 * needs within the system.
 *
 * This is useful for resources that use for instance
 * 'uuid', 'urn' or 'entityUrn' or 'primaryKey' as their
 * primary key field instead of 'id'.
 *
 * @summary Field schema of kind `@id` naming which field holds a resource's primary key, with an optional `sourceKey`
 * when the API uses another name like `uuid`.
 * @public
 */
export interface IdentityField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: '@id';

  /**
   * The name of the field that serves as the
   * primary key for the resource.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link IdentityField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   entityUrn: '324523-sadf34-345'
   * }
   * ```
   *
   * But the app desires to use `record.id; // '324523-sadf34-345'`
   *
   * Then `name` would be set to `'id'` and
   * `sourceKey` would be set to `'entityUrn'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;
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
 * the schema-objects it contains have such a field.
 *
 * Only one hash field is permittable per schema-object, and
 * it should be placed in the `ResourceSchema`'s `@id` field
 * in place of an `IdentityField`.
 *
 * @summary Field schema of kind `@hash` that computes a schema-object's identity from its cache data using a registered
 * hash function.
 * @public
 */
export interface HashField {
  /**
   * The kind of field this is.
   *
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
   * @public
   */
  name: string | null;

  /**
   * The name of a function to run to compute the hash.
   * The function will only have access to the cached
   * data for the record.
   *
   * @public
   */
  type: string;

  /**
   * Any options that should be provided to the hash
   * function.
   *
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
 * only allow our own ReactiveResource default fields to
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
 * @summary Field schema of kind `@local` for memoized, writable per-record state that is never cached or sent to the
 * server; currently private to built-in fields.
 * @public
 */
export interface LocalField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: '@local';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;
  /**
   * Not currently utilized, we are considering
   * allowing transforms to operate on local fields
   *
   * @public
   */
  type?: string;

  /**
   * Options for the field.
   *
   * @public
   */
  options?: {
    /**
     * The default value to use for the field when no value
     * has yet been set.
     */
    defaultValue?: PrimitiveValue;
  };
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
 * @summary Field schema of kind `object` for a plain object of primitive values, optionally passed as a whole through a
 * registered transformation.
 * @public
 */
export interface ObjectField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'object';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link ObjectField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of a transform to pass the entire object
   * through before displaying or serializing it.
   *
   * @public
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * @public
   */
  options?: {
    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this object should use.
     *
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to objects to support migrating away from deprecated patterns
     * like custom getters, computeds, and methods
     */
    objectExtensions?: string[];

    [key: string]: Value | undefined;
  };
}

/**
 * Represents a field whose value is an object
 * with a well-defined structure described by
 * a schema-object (a non-resource schema).
 *
 * The [Complex Fields](/guides/the-manual/schemas/complex-fields#schema-objects) guide
 * shows how to use it.
 *
 * If the object's structure is not well-defined,
 * use 'object' instead.
 *
 * By default, a SchemaObject within
 *
 * @summary Field schema of kind `schema-object` for a nested object whose shape is described by an `ObjectSchema`, with
 * optional polymorphism.
 * @public
 */
export interface SchemaObjectField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'schema-object';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link SchemaObjectField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * If the field is not polymorphic:
   *
   * The name of the ObjectSchema that describes the
   * structure of the object.
   *
   * If the field is polymorphic:
   *
   * The name of the hashFn to use to extract
   * the type from the contained value or null.
   *
   * @public
   */
  type: string | null;

  /**
   * Options for configuring the behavior of the
   * SchemaObject.
   *
   * - `polymorphic` : Whether this SchemaObject is Polymorphic.
   * - `type` : If the SchemaObject is Polymorphic, the key on the raw cache data to use as the "resource-type" value for the schema-object.
   *
   * @public
   */
  options?: {
    /**
     * If true, if no value for this field exists in the cache,
     * an empty `{}` will be used as the source for a new SchemaObject
     * of the associated schema type, as opposed to the field's
     * value being `null`.
     *
     * If `polymorphic` is `true`, defaultValue will be considered `false`.
     */
    defaultValue?: boolean;

    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this object should use.
     *
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to objects to support migrating away from deprecated patterns
     * like custom getters, computeds, and methods
     */
    objectExtensions?: string[];

    /**
     * Whether this SchemaObject is Polymorphic.
     *
     * If the SchemaObject is polymorphic, `options.type` must also be supplied.
     *
     * @public
     */
    polymorphic?: boolean;

    /**
     * If the SchemaObject is Polymorphic, the key on the raw cache data to use
     * as the "resource-type" value for the schema-object.
     *
     * The default is `'type'`.
     *
     * Valid options are:
     *
     * - `'@hash'`                : will lookup the `@hash` function specified by
     *       SchemaObjectField.type and use it to calculate the type for each value.
     * - \<field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
     *       Are valid field names for this purpose. The cache state without transforms applied will be
     *       used when comparing values.
     *
     * @public
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
 * @summary Field schema of kind `array` for an array of primitive values, each optionally passed through a registered
 * transformation.
 * @public
 */
export interface ArrayField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'array';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link ArrayField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of a transform to pass each item
   * in the array through before displaying or
   * or serializing it.
   *
   * @public
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * @public
   */
  options?: {
    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this array is allowed to use.
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to arrays to support migrating away from deprecated behaviors
     * such as Ember's "ArrayLike" and FragmentArray from ember-data-model-fragments
     */
    arrayExtensions?: string[];

    [key: string]: Value | undefined;
  };
}

/**
 * Represents a field whose value is an array
 * of objects with a well-defined structure
 * described by a non-resource schema.
 *
 * The [Complex Fields](/guides/the-manual/schemas/complex-fields#schema-arrays) guide
 * shows how to use it.
 *
 * If the array's elements are not well-defined,
 * use 'array' instead.
 *
 * @summary Field schema of kind `schema-array` for an array of objects described by an `ObjectSchema`, with options for
 * member identity keys and polymorphism.
 * @public
 */
export interface SchemaArrayField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'schema-array';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link SchemaArrayField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * If the SchemaArray is not polymorphic:
   *
   * The name of the ObjectSchema that describes the
   * structure of the objects in the array.
   *
   * If the SchemaArray is polymorphic:
   *
   * The name of the hashFn to use to extract
   * the type from contained members or null.
   *
   * @public
   */
  type: string | null;

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
   * - `'@identity'`(default)  : the cached object's referential identity will be used.
   *       This may result in significant instability when resource data is updated from the API
   * - `'@index'`              : the cached object's index in the array will be used.
   *       This is only a good choice for arrays that rarely if ever change membership
   * - `'@hash'`               : will lookup the `@hash` function supplied in the ResourceSchema for
   *       The contained schema-object and use the computed result to determine and compare identity.
   * - \<field-name> (string)  : the name of a field to use as the key, only GenericFields (kind `field`)
   *       Are valid field names for this purpose. The cache state without transforms applied will be
   *       used when comparing values. The field value should be unique enough to guarantee two schema-objects
   *       of the same type will not collide.
   *
   * - `polymorphic` : Whether this SchemaArray is Polymorphic.
   * - `type` : If the SchemaArray is Polymorphic, the key on the raw cache data to use as the "resource-type" value for the schema-object.
   *
   * @public
   */
  options?: {
    /**
     * If true, if no value for this field exists in the cache,
     * an empty `[]` will be used as the value of the field,
     * as opposed to the field's value being `null`.
     *
     */
    defaultValue?: boolean;

    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this array is allowed to use.
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to arrays to support migrating away from deprecated behaviors
     * such as Ember's "ArrayLike" and FragmentArray from ember-data-model-fragments
     */
    arrayExtensions?: string[];
    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this object should use.
     *
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to objects to support migrating away from deprecated patterns
     * like custom getters, computeds, and methods
     */
    objectExtensions?: string[];

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
     * - \<field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
     *       Are valid field names for this purpose. The cache state without transforms applied will be
     *       used when comparing values. The field value should be unique enough to guarantee two schema-objects
     *       of the same type will not collide.
     *
     */
    key?: '@identity' | '@index' | '@hash' | string;

    /**
     * Whether this SchemaArray is Polymorphic.
     *
     * If the SchemaArray is polymorphic, `options.type` must also be supplied.
     *
     */
    polymorphic?: boolean;

    /**
     * If the SchemaArray is Polymorphic, the key on the raw cache data to use
     * as the "resource-type" value for the schema-object.
     *
     * The default is `'type'`.
     *
     * Valid options are:
     *
     * - `'@hash'`                : will lookup the `@hash` function specified by
     *       SchemaArrayField.type and use it to calculate the type for each value.
     * - \<field-name> (string)   : the name of a field to use as the key, only GenericFields (kind `field`)
     *       Are valid field names for this purpose. The cache state without transforms applied will be
     *       used when comparing values.
     */
    type?: string;
  };
}

/**
 * Represents a field whose value is derived
 * from other fields in the schema.
 *
 * The [Derivations](/guides/the-manual/schemas/derivations) guide explains when to
 * use one and how to register its derivation.
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
 * @summary Field schema of kind `derived` for a read-only, memoized value computed by a registered derivation and never
 * cached or sent to the server.
 * @public
 */
export interface DerivedField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'derived';

  /**
   * The name of the field.
   *
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
   * @public
   */
  type: string;

  /**
   * Options to pass to the derivation, if any
   *
   * Must comply to the specific derivation's
   * options schema.
   *
   * @public
   */
  options?: ObjectValue;
}

/**
 * Represents a field that is a reference to
 * another resource.
 *
 * The value of a `resource` field on a ReactiveResource is a
 * `ReactiveRelationshipDocument` whose `data` is the related
 * resource (or `null`), and whose `links` and `meta` mirror the
 * relationship payload received from the API.
 *
 * ```ts
 * const user = store.peekRecord<User>('user', '1');
 * user.bestFriend.data; // User | null | undefined
 * user.bestFriend.links; // { related: '/users/1/best-friend' }
 * ```
 *
 * The relationship payload for this field is expected to have the
 * shape `{ data?: { type, id } | null, links?: Links, meta?: Meta }`.
 * When `data` is omitted from the payload `doc.data` is `undefined`
 * and `doc.fetch()` may be used to load the related resource via
 * the `related` link.
 *
 * In LegacyMode the relationship is mutable via `doc.data = record`.
 * In PolarisMode it is immutable unless the parent resource has been
 * checked out for editing.
 *
 * @summary Field schema of kind `resource` for a reference to another resource, whose value is a
 * `ReactiveRelationshipDocument`.
 * @public
 */
export interface ResourceField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'resource';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link ResourceField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @public
   */
  type: string;

  /**
   * Options for resources are optional. If
   * not present, all options are presumed
   * to be falsey
   *
   * @public
   */
  options?: {
    /**
     * Whether the relationship is async.
     *
     * For `resource` fields `async` describes what the API
     * sends for the relationship (see the Relationship
     * Specification in the manual):
     *
     * - `true`: every payload for the relationship MUST carry a
     *   `links` object with a `related` link. `data` may be
     *   omitted; when present, the referenced resource MUST be
     *   included in the payload.
     * - `false` (default): whenever the relationship is present
     *   in a payload its `data` member MUST be present and the
     *   referenced resource MUST be included in the payload.
     *   The relationship SHOULD NOT carry `links`.
     *
     * Related resources are never fetched automatically.
     *
     * @public
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
     * @public
     */
    inverse?: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @public
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @public
     */
    polymorphic?: boolean;
  };
}

/**
 * Represents a field that is a reference to
 * a collection of other resources.
 *
 * The value of a `collection` field on a ReactiveResource is a
 * `ReactiveRelationshipDocument` whose `data` is a reactive array
 * of the related resources, and whose `links` and `meta` mirror the
 * relationship payload received from the API.
 *
 * ```ts
 * const user = store.peekRecord<User>('user', '1');
 * user.friends.data; // User[] | undefined
 * user.friends.links; // { related: '/users/1/friends' }
 * ```
 *
 * The relationship payload for this field is expected to have the
 * shape `{ data?: { type, id }[], links?: Links, meta?: Meta }`.
 * When `data` is omitted from the payload `doc.data` is `undefined`
 * and `doc.fetch()` may be used to load the related resources via
 * the `related` link.
 *
 * Collection relationships are not paginated: pagination links present
 * on the relationship are surfaced on `doc.links` but are never merged
 * into the relationship's membership. Large, sortable, filterable or
 * paginated lists should be loaded with a top-level request instead.
 *
 * In LegacyMode the relationship is mutable via `doc.data.push(record)`
 * (and the other array mutation methods) or `doc.data = [records]`.
 * In PolarisMode it is immutable unless the parent resource has been
 * checked out for editing.
 *
 * @summary Field schema of kind `collection` for a reference to other resources, whose value is a
 * `ReactiveRelationshipDocument`.
 * @public
 */
export interface CollectionField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'collection';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link CollectionField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @public
   */
  type: string;

  /**
   * Options for resources are optional. If
   * not present, all options are presumed
   * to be falsey
   *
   * @public
   */
  options?: {
    /**
     * Whether the relationship is async.
     *
     * For `collection` fields `async` describes what the API
     * sends for the relationship (see the Relationship
     * Specification in the manual):
     *
     * - `true`: every payload for the relationship MUST carry a
     *   `links` object with a `related` link. `data` may be
     *   omitted; when present, every referenced resource MUST be
     *   included in the payload.
     * - `false` (default): whenever the relationship is present
     *   in a payload its `data` member MUST be present (an array,
     *   possibly empty) and every referenced resource MUST be
     *   included in the payload. The relationship SHOULD NOT
     *   carry `links`.
     *
     * Related resources are never fetched automatically. Use
     * `doc.fetch()` or a top-level request to load them.
     *
     * @public
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
     * @public
     */
    inverse?: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @public
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @public
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
 * The [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode#defining-legacy-schemas)
 * guide shows how to use it.
 *
 * Transforms when defined are legacy transforms
 * that a serializer *might* use, but their usage
 * is not guaranteed.
 *
 * @summary Legacy field schema of kind `attribute` for a primitive value whose `type` names a legacy transform a
 * serializer may apply; LegacyMode only.
 * @public
 */
export interface LegacyAttributeField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'attribute';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link LegacyAttributeField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of the transform to use, if any
   *
   * @public
   */
  type?: string | null;
  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   *
   * See {@link AttrOptions} for more info.
   */
  options?: AttrOptions;
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
 * The [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode#defining-legacy-schemas)
 * guide shows how to use it.
 *
 * @summary Legacy field schema of kind `belongsTo` for a reference to one related resource, with required `async` and
 * `inverse` options and optional `linksMode`.
 * @public
 */
export interface LegacyBelongsToField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'belongsTo';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link LegacyBelongsToField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @public
   */
  type: string;

  /**
   * Options for belongsTo are mandatory.
   *
   * @public
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
     * @public
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
     * If the inverse field definition uses a sourceKey,
     * this should still be the name of the field, not the sourceKey.
     *
     * @public
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @public
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @public
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy request infra
     * from @warp-drive/legacy/compat and the LegacyNetworkMiddleware for
     * adapters and serializers.
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * (`async: false`, currently the only supported combination) must satisfy
     * one of the following whenever pushed to the cache:
     *
     * - a `links.related` link is present, **or**
     * - the relationship is fully linked: `data` is `null`, or `data` points
     *   to a resource present in the document's `included` array
     *
     * A related link lets you omit the related resource from `included`; a
     * `data` key that is missing entirely, or explicitly `undefined`, is never
     * valid unless a `links.related` link is present.
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
     * @public
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
     * @public
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
 * @summary Legacy field schema of kind `belongsTo` in LinksMode: a sync reference to one related resource, loaded via
 * links without adapters, usable in PolarisMode.
 * @public
 */
export interface LinksModeBelongsToField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'belongsTo';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link LinksModeBelongsToField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @public
   */
  type: string;

  /**
   * Options for belongsTo are mandatory.
   *
   * @public
   */
  options: {
    /**
     * Whether the relationship is async
     *
     * MUST be false for PolarisMode + LinksMode
     *
     * @public
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
     * If the inverse field definition uses a sourceKey,
     * this should still be the name of the field, not the sourceKey.
     *
     * @public
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @public
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @public
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @warp-drive/legacy/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * MUST be true for PolarisMode + LinksMode
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * (`async: false`, currently the only supported combination) must satisfy
     * one of the following whenever pushed to the cache:
     *
     * - a `links.related` link is present, **or**
     * - the relationship is fully linked: `data` is `null`, or `data` points
     *   to a resource present in the document's `included` array
     *
     * A related link lets you omit the related resource from `included`; a
     * `data` key that is missing entirely, or explicitly `undefined`, is never
     * valid unless a `links.related` link is present.
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
     * @public
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
 * The [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode#defining-legacy-schemas)
 * guide shows how to use it.
 *
 * @summary Legacy field schema of kind `hasMany` for a reference to many related resources, with required `async` and
 * `inverse` options and optional `linksMode`.
 * @public
 */
export interface LegacyHasManyField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'hasMany';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link LegacyHasManyField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * the name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @public
   */
  type: string;

  /**
   * Options for hasMany are mandatory.
   *
   * @public
   */
  options: {
    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this array is allowed to use.
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to arrays to support migrating away from deprecated behaviors
     * such as Ember's "ArrayLike" and FragmentArray from ember-data-model-fragments
     */
    arrayExtensions?: string[];

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
     * hasMany relationships do not support pagination. To page through a
     * large collection, request it as its own document and use the
     * experimental pagination primitives; see the
     * [Pagination guide](/guides/the-manual/experiments/pagination).
     *
     * @public
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
     * If the inverse field definition uses a sourceKey,
     * this should still be the name of the field, not the sourceKey.
     *
     * @public
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @public
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @public
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @warp-drive/legacy/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * (`async: false`, currently the only supported combination) must satisfy
     * one of the following whenever pushed to the cache:
     *
     * - a `links.related` link is present, **or**
     * - the relationship is fully linked: `data` is `[]`, or every resource
     *   identifier in `data` is present in the document's `included` array
     *
     * A related link lets you omit the related resources from `included`; a
     * `data` key that is missing entirely, or explicitly `undefined`, is never
     * valid unless a `links.related` link is present.
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
     * @public
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
     * @public
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
 * @summary Legacy field schema of kind `hasMany` in LinksMode: a sync reference to many related resources, loaded via
 * links without adapters, usable in PolarisMode.
 * @public
 */
export interface LinksModeHasManyField {
  /**
   * The kind of field this is.
   *
   * @public
   */
  kind: 'hasMany';

  /**
   * The name of the field.
   *
   * @public
   */
  name: string;

  /**
   * The name of the field as returned by the API
   * and inserted into the {@link Cache} if it differs
   * from {@link LinksModeHasManyField.name}
   *
   * For instance, if the API returns:
   *
   * ```ts
   * {
   *   attributes: {
   *     'first-name': 'Chris'
   *   }
   * }
   * ```
   *
   * But the app desires to use `record.firstName; // 'Chris'`
   *
   * Then `name` would be set to `'firstName'` and
   * `sourceKey` would be set to `'first-name'`.
   *
   * This option is only needed when the value differs from name.
   */
  sourceKey?: string;

  /**
   * the name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   *
   * @public
   */
  type: string;

  /**
   * Options for hasMany are mandatory.
   *
   * @public
   */
  options: {
    /**
     * ::: warning ⚠️ Dangerous Feature Ahead
     * :::
     *
     * Configures which extensions this array is allowed to use.
     * Extensions are registered with the store's schema service
     * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
     *
     * Extensions should only be used for temporary enhancements
     * to arrays to support migrating away from deprecated behaviors
     * such as Ember's "ArrayLike" and FragmentArray from ember-data-model-fragments
     */
    arrayExtensions?: string[];
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
     * hasMany relationships do not support pagination. To page through a
     * large collection, request it as its own document and use the
     * experimental pagination primitives; see the
     * [Pagination guide](/guides/the-manual/experiments/pagination).
     *
     * @public
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
     * If the inverse field definition uses a sourceKey,
     * this should still be the name of the field, not the sourceKey.
     *
     * @public
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     *
     * @public
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     *
     * @public
     */
    polymorphic?: boolean;

    /**
     * Whether this field should ever make use of the legacy support infra
     * from @warp-drive/legacy/model and the LegacyNetworkMiddleware for adapters and serializers.
     *
     * MUST be true for PolarisMode + LinksMode
     *
     * When true, none of the legacy support will be utilized. Sync relationships
     * (`async: false`, currently the only supported combination) must satisfy
     * one of the following whenever pushed to the cache:
     *
     * - a `links.related` link is present, **or**
     * - the relationship is fully linked: `data` is `[]`, or every resource
     *   identifier in `data` is present in the document's `included` array
     *
     * A related link lets you omit the related resources from `included`; a
     * `data` key that is missing entirely, or explicitly `undefined`, is never
     * valid unless a `links.related` link is present.
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
     * @public
     */
    linksMode: true;
  };
}

/**
 * A union of all possible LegacyMode field schemas.
 *
 * Available field schemas are:
 *
 * - {@link GenericField}
 * - {@link LegacyAliasField}
 * - {@link LocalField}
 * - {@link ObjectField}
 * - {@link SchemaObjectField}
 * - {@link ArrayField}
 * - {@link SchemaArrayField}
 * - {@link DerivedField}
 * - {@link ResourceField}
 * - {@link CollectionField}
 * - {@link LegacyAttributeField}
 * - {@link LegacyBelongsToField}
 * - {@link LegacyHasManyField}
 *
 * @summary Union of every field schema allowed on a LegacyMode resource schema, including legacy attribute, belongsTo,
 * and hasMany fields.
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
  | ResourceField
  | CollectionField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField;

/**
 * A union of all possible PolarisMode field schemas.
 *
 * Available field schemas are:
 *
 * - {@link GenericField}
 * - {@link PolarisAliasField}
 * - {@link LocalField}
 * - {@link ObjectField}
 * - {@link SchemaObjectField}
 * - {@link ArrayField}
 * - {@link SchemaArrayField}
 * - {@link DerivedField}
 * - {@link ResourceField}
 * - {@link CollectionField}
 * - {@link LinksModeBelongsToField}
 * - {@link LinksModeHasManyField}
 *
 * @summary Union of every field schema allowed on a PolarisMode resource schema, with relationships limited to their
 * LinksMode forms.
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
  | ResourceField
  | CollectionField
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
 * @summary Union of every LegacyMode and PolarisMode field schema; prefer the mode-specific unions for more precise
 * type-checking.
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
 * A union of all possible LegacyMode and PolarisMode
 * field schemas that represent data that could be in
 * the cache.
 *
 * In other words this will not include types like alias
 * fields, local fields, or derived fields.
 *
 * @summary Union of the field schemas whose values live in the cache, excluding alias, local, and derived fields.
 * @public
 */
export type CacheableFieldSchema =
  | IdentityField
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
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
 * @summary Union of the field schemas allowed in an `ObjectSchema`, which excludes identity and relationship fields.
 * @public
 */
export type ObjectFieldSchema =
  | LegacyAttributeField
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
 * @summary Schema describing a PolarisMode resource type: its `@id` identity field, its fields, and the traits it
 * implements.
 * @public
 */
export interface PolarisResourceSchema {
  /**
   * A flag indicating that this is not a legacy resource schema.
   *
   * @public
   */
  legacy?: false;

  /**
   * For primary resources, this should be an IdentityField
   *
   * for schema-objects, this should be either a HashField or null
   *
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
   * @public
   */
  type: string;

  /**
   * The fields that make up the shape of the resource
   *
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
   * @public
   */
  traits?: string[];
}

/**
 * Represents a schema for a primary resource in LegacyMode
 *
 * The [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode#defining-legacy-schemas)
 * guide shows how to define one.
 *
 * Primary resources are objects with a unique identity of their
 * own which may allow them to appear in relationships, or in multiple
 * response documents.
 *
 * @summary Schema describing a LegacyMode resource type, marked `legacy: true`, with its identity field, fields,
 * traits, and optional extensions.
 * @public
 */
export interface LegacyResourceSchema {
  /**
   * A flag indicating that this is a legacy resource schema
   *
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
   * @public
   */
  type: string;

  /**
   * The fields that make up the shape of the resource
   *
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
   * @public
   */
  traits?: string[];

  /**
   * ::: warning ⚠️ Dangerous Feature Ahead
   * :::
   *
   * Configures which extensions this resource should use.
   *
   * Extensions are registered with the store's schema service
   * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
   *
   * Extensions should only be used for temporary enhancements
   * to objects to support migrating away from deprecated patterns
   * like custom getters, computeds, and methods
   */
  objectExtensions?: string[];
}

/**
 * A type which represents a valid JSON schema
 * definition for either a PolarisMode or a
 * LegacyMode resource.
 *
 * The [ResourceSchemas](/guides/the-manual/schemas/resources/) guide shows how to
 * create and register one.
 *
 * Note, this is separate from the type returned
 * by the SchemaService which provides fields as a Map
 * instead of as an Array.
 *
 * @summary Union of the PolarisMode and LegacyMode schema definitions for a primary resource type, as registered with
 * the schema service.
 * @public
 */
export type ResourceSchema = PolarisResourceSchema | LegacyResourceSchema;

/**
 * Represents a schema for an object that is not
 * a primary resource (has no unique identity of its own).
 *
 * The [ObjectSchemas](/guides/the-manual/schemas/object-schemas) guide shows how to
 * define and register one.
 *
 * ObjectSchemas may not currently contain relationships.
 *
 * @summary Schema describing an embedded object that has no identity of its own, used by `schema-object` and
 * `schema-array` fields.
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
   * @public
   */
  type: string;

  /**
   * The fields that make up the shape of the object
   *
   * @public
   */
  fields: ObjectFieldSchema[];

  /**
   * ::: warning ⚠️ Dangerous Feature Ahead
   * :::
   *
   * Configures which extensions this object should use.
   *
   * Extensions are registered with the store's schema service
   * via {@link SchemaService.CAUTION_MEGA_DANGER_ZONE_registerExtension}
   *
   * Extensions should only be used for temporary enhancements
   * to objects to support migrating away from deprecated patterns
   * like custom getters, computeds, and methods
   */
  objectExtensions?: string[];
}

/**
 * A union of {@link ResourceSchema} and {@link ObjectSchema} representing
 * any schema that can be registered with or returned by the SchemaService.
 *
 * @summary Union of resource and object schemas, covering any schema that can be registered with or returned by the
 * schema service.
 * @public
 */
export type Schema = ResourceSchema | ObjectSchema;

/**
 * A trait for use on a PolarisMode record.
 *
 * Traits are reusable collections of fields that can be composed onto a
 * resource schema, often to describe a polymorphic capability shared by
 * multiple resource types.
 *
 * @summary A named, reusable set of PolarisMode fields that resource schemas compose in via their `traits`, often to
 * model polymorphic capabilities.
 */
export interface PolarisTrait {
  /**
   * The name of the trait.
   *
   * This is the string referenced by a resource schema's `traits` array,
   * or by another trait's `traits` array, in order to make use of this
   * trait.
   */
  name: string;

  /**
   * The mode this trait is valid for use with.
   *
   * A PolarisTrait may only be applied to PolarisMode resource schemas.
   */
  mode: 'polaris';

  /**
   * The fields that this trait contributes to any resource schema
   * that implements it.
   */
  fields: PolarisModeFieldSchema[];

  /**
   * A list of other traits that this trait itself implements.
   *
   * As with a resource schema's `traits`, each entry should be a string
   * matching the `name` of another trait.
   */
  traits?: string[];
}

/**
 * A trait for use on a LegacyMode record.
 *
 * Traits are reusable collections of fields that can be composed onto a
 * resource schema, often to describe a polymorphic capability shared by
 * multiple resource types.
 *
 * @summary A named, reusable set of LegacyMode fields that resource schemas compose in via their `traits`, often to
 * model polymorphic capabilities.
 */
export interface LegacyTrait {
  /**
   * The name of the trait.
   *
   * This is the string referenced by a resource schema's `traits` array,
   * or by another trait's `traits` array, in order to make use of this
   * trait.
   */
  name: string;

  /**
   * The mode this trait is valid for use with.
   *
   * A LegacyTrait may only be applied to LegacyMode resource schemas.
   */
  mode: 'legacy';

  /**
   * The fields that this trait contributes to any resource schema
   * that implements it.
   */
  fields: LegacyModeFieldSchema[];

  /**
   * A list of other traits that this trait itself implements.
   *
   * As with a resource schema's `traits`, each entry should be a string
   * matching the `name` of another trait.
   */
  traits?: string[];
}

/**
 * A union of
 * - {@link LegacyTrait}
 * - {@link PolarisTrait}
 *
 * The [Traits](/guides/the-manual/schemas/traits) guide shows how to create, register
 * and use one.
 *
 * @summary Union of the LegacyMode and PolarisMode trait definitions that can be registered with the schema service.
 */
export type Trait = LegacyTrait | PolarisTrait;

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
 * @summary Returns the given resource schema unchanged, typed so its definition is type-checked; relationship inverses
 * and related types are not validated.
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
 * @summary Returns the given object schema unchanged, typed so its definition is type-checked.
 * @public
 */
export function objectSchema<T extends ObjectSchema>(schema: T): T {
  return schema;
}

/**
 * A type utility to narrow a schema to a ResourceSchema
 *
 * @summary Type guard that returns true when a schema is a resource schema, meaning its identity field is of kind
 * `@id`.
 * @public
 */
/**
 * Whether a field kind is a to-many relationship: the legacy `hasMany` or the
 * `collection` kind.
 *
 * @public
 */
export function isManyKind(kind: string): kind is 'hasMany' | 'collection' {
  return kind === 'hasMany' || kind === 'collection';
}

/**
 * Whether a field kind is a to-one relationship: the legacy `belongsTo` or the
 * `resource` kind.
 *
 * @public
 */
export function isSingleKind(kind: string): kind is 'belongsTo' | 'resource' {
  return kind === 'belongsTo' || kind === 'resource';
}

/**
 * Whether a field kind is any relationship kind, legacy or not.
 *
 * @public
 */
export function isRelationshipKind(kind: string): kind is 'belongsTo' | 'hasMany' | 'resource' | 'collection' {
  return isManyKind(kind) || isSingleKind(kind);
}

export function isResourceSchema(schema: ResourceSchema | ObjectSchema): schema is ResourceSchema {
  return schema?.identity?.kind === '@id';
}

/**
 * A type utility to narrow a schema to LegacyResourceSchema
 *
 * @summary Type guard that returns true when a schema is a LegacyMode resource schema, meaning it is a resource schema
 * with `legacy: true`.
 * @public
 */
export function isLegacyResourceSchema(schema: ResourceSchema | ObjectSchema): schema is LegacyResourceSchema {
  return isResourceSchema(schema) && schema.legacy === true;
}

/**
 * A union of all field schemas considered "legacy", i.e. those historically
 * associated with `@warp-drive/legacy/model`'s Attribute, BelongsTo and
 * HasMany fields, including their LinksMode variants.
 *
 * Available field schemas are:
 *
 * - {@link LegacyAttributeField}
 * - {@link LegacyBelongsToField}
 * - {@link LegacyHasManyField}
 * - {@link LinksModeBelongsToField}
 * - {@link LinksModeHasManyField}
 *
 * @summary Union of the legacy attribute, belongsTo, and hasMany field schemas, including the LinksMode relationship
 * variants.
 * @public
 */
export type LegacyField =
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;

/**
 * A union of all legacy relationship field schemas, i.e. {@link LegacyField}
 * excluding {@link LegacyAttributeField}.
 *
 * Available field schemas are:
 *
 * - {@link LegacyBelongsToField}
 * - {@link LegacyHasManyField}
 * - {@link LinksModeBelongsToField}
 * - {@link LinksModeHasManyField}
 *
 * @summary Union of the legacy belongsTo and hasMany field schemas, including their LinksMode variants.
 * @public
 */
export type LegacyRelationshipField =
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
