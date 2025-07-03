import type { Store } from '../../store/-private.ts';
import type { StableRecordIdentifier } from '../../types.ts';
import type { FieldSchema, HashField, IdentityField } from '../../types/schema/fields.ts';
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

export interface KindImpl<T extends FieldSchema | IdentityField | HashField> {
  get: (
    store: Store,
    record: ReactiveResource,
    resourceKey: StableRecordIdentifier,
    field: T,
    path: string | string[],
    editable: boolean
  ) => unknown;
  set: (
    store: Store,
    record: ReactiveResource,
    resourceKey: StableRecordIdentifier,
    field: T,
    path: string | string[],
    value: unknown
  ) => boolean;
}

type Mode = {
  [Field in FieldSchema | IdentityField | HashField as Field['kind']]: KindImpl<Field>;
};

export const DefaultMode: Mode = {
  '@hash': {
    get: getHashField,
    set: setHashField,
  },
  '@id': {
    get: getIdentityField,
    set: setIdentityField,
  },
  '@local': {
    get: getLocalField,
    set: setLocalField,
  },
  alias: {
    get: getAliasField,
    set: setAliasField,
  },
  array: {
    get: getArrayField,
    set: setArrayField,
  },
  attribute: {
    get: getAttributeField,
    set: setAttributeField,
  },
  belongsTo: {
    get: getBelongsToField,
    set: setBelongsToField,
  },
  collection: {
    get: getCollectionField,
    set: setCollectionField,
  },
  derived: {
    get: getDerivedField,
    set: setDerivedField,
  },
  field: {
    get: getGenericField,
    set: setGenericField,
  },
  hasMany: {
    get: getHasManyField,
    set: setHasManyField,
  },
  object: {
    get: getObjectField,
    set: setObjectField,
  },
  resource: {
    get: getResourceField,
    set: setResourceField,
  },
  'schema-array': {
    get: getSchemaArrayField,
    set: setSchemaArrayField,
  },
  'schema-object': {
    get: getSchemaObjectField,
    set: setSchemaObjectField,
  },
};
