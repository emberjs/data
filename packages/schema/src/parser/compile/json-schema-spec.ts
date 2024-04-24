import { ObjectValue, PrimitiveValue } from '../utils/extract-json';

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
 */
export type GenericField = {
  kind: 'field';
  name: string;
  /** the name of the transform to use, if any */
  type?: string;
  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   */
  options?: ObjectValue;
};

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
 */
export type IdentityField = {
  kind: '@id';

  /**
   * The name of the field that serves as the
   * primary key for the resource.
   */
  name: string;
};

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
 * In the future, we may choose to only allow our
 * own SchemaRecord to utilize them.
 *
 * Example use cases that drove the creation of local
 * fields are states like `isDestroying` and `isDestroyed`
 * which are specific to a record instance but not
 * stored in the cache. We wanted to be able to drive
 * these fields from schema the same as all other fields.
 *
 * Don't make us regret this decision.
 */
export type LocalField = {
  kind: '@local';
  name: string;
  /**
   * Not currently utilized, we are considering
   * allowing transforms to operate on local fields
   */
  type?: string;
  options?: { defaultValue?: PrimitiveValue };
};

/**
 * Represents a field whose value is an object
 * with keys pointing to values that are primitive
 * values.
 *
 * If values of the keys are not primitives, or
 * if the key/value pairs have well-defined shape,
 * use 'schema-object' instead.
 */
export type ObjectField = {
  kind: 'object';
  name: string;

  /**
   * The name of a transform to pass the entire object
   * through before displaying or serializing it.
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   */
  options?: ObjectValue;
};

/**
 * Represents a field whose value is an object
 * with a well-defined structure described by
 * a non-resource schema.
 *
 * If the object's structure is not well-defined,
 * use 'object' instead.
 */
export type SchemaObjectField = {
  kind: 'schema-object';
  name: string;

  /**
   * The name of the schema that describes the
   * structure of the object.
   *
   * These schemas
   */
  type: string;

  // FIXME: would we ever need options here?
  options?: ObjectValue;
};

/**
 * Represents a field whose value is an array
 * of primitive values.
 *
 * If the array's elements are not primitive
 * values, use 'schema-array' instead.
 */
export type ArrayField = {
  kind: 'array';
  name: string;

  /**
   * The name of a transform to pass each item
   * in the array through before displaying or
   * or serializing it.
   */
  type?: string;

  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   */
  options?: ObjectValue;
};

/**
 * Represents a field whose value is an array
 * of objects with a well-defined structure
 * described by a non-resource schema.
 *
 * If the array's elements are not well-defined,
 * use 'array' instead.
 */
export type SchemaArrayField = {
  kind: 'schema-array';
  name: string;

  /**
   * The name of the schema that describes the
   * structure of the objects in the array.
   */
  type: string;

  // FIXME: would we ever need options here?
  options?: ObjectValue;
};

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
 */
export type DerivedField = {
  kind: 'derived';
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
   */
  type: string;

  /**
   * Options to pass to the derivation, if any
   *
   * Must comply to the specific derivation's
   * options schema.
   */
  options?: ObjectValue;
};

/**
 * Represents a field that is a reference to
 * another resource.
 */
export type ResourceField = {
  kind: 'resource';
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   */
  type: string;

  /**
   * Options for resources are optional. If
   * not present, all options are presumed
   * to be falsey
   */
  options?: {
    /**
     * Whether the relationship is async
     *
     * If true, it is expected that the cache
     * data for this field will contain a link
     * that can be used to fetch the related
     * resource when needed.
     */
    async?: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     */
    inverse?: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     */
    polymorphic?: boolean;
  };
};

/**
 * Represents a field that is a reference to
 * a collection of other resources, potentially
 * paginate.
 */
export type CollectionField = {
  kind: 'collection';
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   */
  type: string;

  /**
   * Options for resources are optional. If
   * not present, all options are presumed
   * to be falsey
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
     */
    async?: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     */
    inverse?: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     */
    polymorphic?: boolean;
  };
};

/**
 * > [!CAUTION]
 * > This Field is LEGACY
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
 */
export type LegacyAttributeField = {
  kind: 'attribute';
  name: string;
  /** the name of the transform to use, if any */
  type?: string;
  /**
   * Options to pass to the transform, if any
   *
   * Must comply to the specific transform's options
   * schema.
   */
  options?: ObjectValue;
};

/**
 *  * > [!CAUTION]
 * > This Field is LEGACY
 *
 * Represents a field that is a reference to
 * another resource.
 *
 * This is the legacy version of the `ResourceField`
 * type, and is used to represent fields that were
 */
export type LegacyBelongsToField = {
  kind: 'belongsTo';
  name: string;

  /**
   * The name of the resource that this field
   * refers to. In the case of a polymorphic
   * relationship, this should be the trait
   * or abstract type.
   */
  type: string;

  /**
   * Options for belongsTo are mandatory.
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
     */
    async: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     */
    polymorphic?: boolean;
  };
};

/**
 * > [!CAUTION]
 * > This Field is LEGACY
 */
export type LegacyHasManyField = {
  kind: 'hasMany';
  name: string;
  type: string;

  /**
   * Options for hasMany are mandatory.
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
     */
    async: boolean;

    /**
     * The name of the inverse field on the
     * related resource that points back to
     * this field on this resource to form a
     * bidirectional relationship.
     *
     * If null, the relationship is unidirectional.
     */
    inverse: string | null;

    /**
     * If this field is satisfying a polymorphic
     * relationship on another resource, then this
     * should be set to the trait or abstract type
     * that this resource implements.
     */
    as?: string;

    /**
     * Whether this field is a polymorphic relationship,
     * meaning that it can point to multiple types of
     * resources so long as they implement the trait
     * or abstract type specified in `type`.
     */
    polymorphic?: boolean;

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
     */
    resetOnRemoteUpate?: false;
  };
};

export type SchemaField =
  | GenericField
  | IdentityField
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

export type Schema = {
  '@id': IdentityField | null;
  /**
   * The name of the schema
   *
   * For cacheable resources, this should be the
   * primary resource type.
   *
   * For object schemas, this should be the name
   * of the object schema. object schemas should
   * follow the following guidelines for naming
   *
   * - for globally shared objects: The pattern `$field:${KlassName}` e.g. `$field:AddressObject`
   * - for resource-specific objects: The pattern `$${ResourceKlassName}:$field:${KlassName}` e.g. `$User:$field:ReusableAddress`
   * - for inline objects: The pattern `$${ResourceKlassName}.${fieldPath}:$field:anonymous` e.g. `$User.shippingAddress:$field:anonymous`
   */
  '@type': string;
  traits: string[];
  fields: SchemaField[];
};
