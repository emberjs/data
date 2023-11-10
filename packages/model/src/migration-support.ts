import { assert } from '@ember/debug';

import { importSync } from '@embroider/macros';

import { upgradeStore } from '@ember-data/legacy-compat/-private';
import { recordIdentifierFor } from '@ember-data/store';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { Errors } from './-private';
import RecordState, { MinimalLegacyRecord } from './-private/record-state';

interface FieldSchema {
  type: string | null;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array' | '@id';
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

function unloadRecord(this: MinimalLegacyRecord) {
  if (this.currentState.isNew && (this.isDestroyed || this.isDestroying)) {
    return;
  }
  this[RecordStore].unloadRecord(this);
}

function serialize(this: MinimalLegacyRecord, options?: Record<string, unknown>) {
  upgradeStore(this[RecordStore]);
  return this[RecordStore].serializeRecord(this, options);
}

function createSnapshot(this: MinimalLegacyRecord) {
  const store = this[RecordStore];

  upgradeStore(store);
  if (!store._fetchManager) {
    const FetchManager = (importSync('@ember-data/legacy-compat/-private') as typeof import('@ember-data/legacy-compat/-private')).FetchManager;
    store._fetchManager = new FetchManager(store);
  }

  return store._fetchManager.createSnapshot(recordIdentifierFor(this));
}

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
      throw new Error('not implemented');
    case 'changedAttributes':
      throw new Error('not implemented');
    case 'constructor':
      return (state._constructor = state._constructor || {
        isModel: true,
        modelName: recordIdentifierFor(record).type,
      });
    case 'currentState':
      return (state.recordState = state.recordState || new RecordState(record));
    case 'deleteRecord':
      throw new Error('not implemented');
    case 'destroyRecord':
      throw new Error('not implemented');
    case 'dirtyType':
      return record.currentState.dirtyType;
    case 'errors':
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return (state.errors = state.errors || Errors.create({ __record: record }));
    case 'hasDirtyAttributes':
      return record.currentState.isDirty;
    case 'hasMany':
      throw new Error('not implemented');
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
      throw new Error('not implemented');
    case 'rollbackAttributes':
      throw new Error('not implemented');
    case 'save':
      throw new Error('not implemented');
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
  return fields;
}

export function registerDerivations(schema: SchemaService) {
  schema.registerDerivation('@legacy', legacySupport as Derivation<unknown, unknown>);
}
