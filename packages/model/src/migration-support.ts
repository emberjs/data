import { assert } from '@ember/debug';

import { recordIdentifierFor } from '@ember-data/store';

import { Errors } from './-private';
import {
  belongsTo,
  changedAttributes,
  createSnapshot,
  deleteRecord,
  destroyRecord,
  hasMany,
  MinimalLegacyRecord,
  reload,
  rollbackAttributes,
  save,
  serialize,
  unloadRecord,
} from './-private/model-methods';
import RecordState from './-private/record-state';

interface FieldSchema {
  type: string | null;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array' | '@id' | '@local';
  options?: Record<string, unknown>;
}

type Derivation<R, T> = (record: R, options: Record<string, unknown> | null, prop: string) => T;
type SchemaService = {
  registerDerivation(name: string, derivation: Derivation<unknown, unknown>): void;
};
// 'isDestroying', 'isDestroyed'
const LegacyFields = [
  '_createSnapshot',
  'adapterError',
  'belongsTo',
  'changedAttributes',
  'constructor',
  'currentState',
  'deleteRecord',
  'destroyRecord',
  'dirtyType',
  'errors',
  'hasDirtyAttributes',
  'hasMany',
  'isDeleted',
  'isEmpty',
  'isError',
  'isLoaded',
  'isLoading',
  'isNew',
  'isSaving',
  'isValid',
  'reload',
  'rollbackAttributes',
  'save',
  'serialize',
  'unloadRecord',
];

const LegacySupport = new WeakMap<MinimalLegacyRecord, Record<string, unknown>>();

function legacySupport(record: MinimalLegacyRecord, options: Record<string, unknown> | null, prop: string): unknown {
  let state = LegacySupport.get(record);
  if (!state) {
    state = {};
    LegacySupport.set(record, state);
  }

  switch (prop) {
    case '_createSnapshot':
      return createSnapshot;
    case 'adapterError':
      return record.currentState.adapterError;
    case 'belongsTo':
      return belongsTo;
    case 'changedAttributes':
      return changedAttributes;
    case 'constructor':
      return (state._constructor = state._constructor || {
        isModel: true,
        modelName: recordIdentifierFor(record).type,
      });
    case 'currentState':
      return (state.recordState = state.recordState || new RecordState(record));
    case 'deleteRecord':
      return deleteRecord;
    case 'destroyRecord':
      return destroyRecord;
    case 'dirtyType':
      return record.currentState.dirtyType;
    case 'errors':
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return (state.errors = state.errors || Errors.create({ __record: record }));
    case 'hasDirtyAttributes':
      return record.currentState.isDirty;
    case 'hasMany':
      return hasMany;
    case 'isDeleted':
      return record.currentState.isDeleted;
    case 'isEmpty':
      return record.currentState.isEmpty;
    case 'isError':
      return record.currentState.isError;
    case 'isLoaded':
      return record.currentState.isLoaded;
    case 'isLoading':
      return record.currentState.isLoading;
    case 'isNew':
      return record.currentState.isNew;
    case 'isSaving':
      return record.currentState.isSaving;
    case 'isValid':
      return record.currentState.isValid;
    case 'reload':
      return reload;
    case 'rollbackAttributes':
      return rollbackAttributes;
    case 'save':
      return save;
    case 'serialize':
      return serialize;
    case 'unloadRecord':
      return unloadRecord;
    default:
      assert(`${prop} is not a supported legacy field`, false);
  }
}

export function withFields(fields: FieldSchema[]) {
  LegacyFields.forEach((field) => {
    fields.push({
      type: '@legacy',
      name: field,
      kind: 'derived',
    });
  });
  fields.push({
    name: 'id',
    kind: '@id',
    type: null,
  });
  fields.push({
    name: 'isReloading',
    kind: '@local',
    type: 'boolean',
    options: { defaultValue: false },
  });
  fields.push({
    name: 'isDestroying',
    kind: '@local',
    type: 'boolean',
    options: { defaultValue: false },
  });
  fields.push({
    name: 'isDestroyed',
    kind: '@local',
    type: 'boolean',
    options: { defaultValue: false },
  });
  return fields;
}

export function registerDerivations(schema: SchemaService) {
  schema.registerDerivation('@legacy', legacySupport as Derivation<unknown, unknown>);
}
