import type { Store } from '../../store/-private.ts';
import type { SignalStore } from '../../store/-private/new-core-tmp/reactivity/internal.ts';
import type { ResourceKey } from '../../types.ts';
import type {
  FieldSchema,
  HashField,
  IdentityField,
  SchemaArrayField,
  SchemaObjectField,
} from '../../types/schema/fields.ts';
import { getAliasField, setAliasField } from './kind/alias-field.ts';
import { getArrayField, setArrayField } from './kind/array-field.ts';
import { getAttributeField, setAttributeField } from './kind/attribute-field.ts';
import { getBelongsToField, setBelongsToField } from './kind/belongs-to-field.ts';
import { getCollectionField, setCollectionField } from './kind/collection-field.ts';
import { getDerivedField, setDerivedField } from './kind/derived-field.ts';
import { getGenericField, setGenericField } from './kind/generic-field.ts';
import { getHasManyField, setHasManyField } from './kind/has-many-field.ts';
import { getHashField, setHashField } from './kind/hash-field.ts';
import { getIdentityField, setIdentityField } from './kind/identity-field.ts';
import { getLocalField, setLocalField } from './kind/local-field.ts';
import { getObjectField, setObjectField } from './kind/object-field.ts';
import { getResourceField, setResourceField } from './kind/resource-field.ts';
import { getSchemaArrayField, setSchemaArrayField } from './kind/schema-array-field.ts';
import { getSchemaObjectField, setSchemaObjectField } from './kind/schema-object-field.ts';
import type { ReactiveResource } from './record.ts';

export type PathLike = string | symbol | Array<string | symbol>;

export type ModeName = 'polaris' | 'legacy';
export interface ModeInfo {
  name: ModeName;
  legacy: boolean;
  editable: boolean;
}

export interface BaseContext {
  store: Store;
  resourceKey: ResourceKey;
  modeName: ModeName;
  legacy: boolean;
  editable: boolean;
}

export interface ResourceContext extends BaseContext {
  path: null;
  field: null;
  value: null;
}
export interface ObjectContext extends BaseContext {
  path: string[];
  field: SchemaObjectField | SchemaArrayField;
  value: string;
}
export interface KindContext<T extends FieldSchema | IdentityField | HashField> extends BaseContext {
  path: string[];
  field: T;
  value: unknown;
  record: ReactiveResource;
  signals: SignalStore;
}

export interface KindImpl<T extends FieldSchema | IdentityField | HashField> {
  /**
   * A function which produces the value for the field when invoked.
   */
  get: (context: KindContext<T>) => unknown;
  /**
   * A function which updates the value for the field when invoked.
   *
   * This will never be invoked when the record is in a non-editable mode.
   *
   * This should assert in dev and return false if mutation is not allowed.
   */
  set: (context: KindContext<T>) => boolean;
  /**
   * Whether this field is ever mutable (writable). This should be
   * if there is ever a scenario in which the field can be written
   * and false only if the field can never be written to.
   */
  mutable: boolean;
  /**
   * Whether this field's of this kind should be included in the
   * enumerated (iterable) keys of the record/object instance.
   *
   * This should generally be true except for fields that are not
   * producing a value backed by the cache. For instance, locals
   * should not be enumerable, as their value is not tied to the
   * cache at all.
   */
  enumerable: boolean;
  /**
   *
   */
  serializable: boolean;
}

type Mode = {
  [Field in FieldSchema | IdentityField | HashField as Field['kind']]: KindImpl<Field>;
};

export const DefaultMode: Mode = {
  '@hash': {
    get: getHashField,
    set: setHashField,
    mutable: false,
    enumerable: false,
    serializable: false,
  },
  '@id': {
    get: getIdentityField,
    set: setIdentityField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  '@local': {
    get: getLocalField,
    set: setLocalField,
    mutable: true,
    enumerable: false,
    serializable: false,
  },
  alias: {
    get: getAliasField,
    set: setAliasField,
    mutable: true,
    enumerable: true,
    serializable: false,
  },
  array: {
    get: getArrayField,
    set: setArrayField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  attribute: {
    get: getAttributeField,
    set: setAttributeField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  belongsTo: {
    get: getBelongsToField,
    set: setBelongsToField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  collection: {
    get: getCollectionField,
    set: setCollectionField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  derived: {
    get: getDerivedField,
    set: setDerivedField,
    mutable: true,
    enumerable: true,
    serializable: false,
  },
  field: {
    get: getGenericField,
    set: setGenericField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  hasMany: {
    get: getHasManyField,
    set: setHasManyField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  object: {
    get: getObjectField,
    set: setObjectField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  resource: {
    get: getResourceField,
    set: setResourceField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  'schema-array': {
    get: getSchemaArrayField,
    set: setSchemaArrayField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
  'schema-object': {
    get: getSchemaObjectField,
    set: setSchemaObjectField,
    mutable: true,
    enumerable: true,
    serializable: true,
  },
};
