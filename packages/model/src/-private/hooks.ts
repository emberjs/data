import { getOwner, setOwner } from '@ember/application';
import { assert } from '@ember/debug';

import { setCacheFor, setRecordIdentifier, type Store, StoreMap } from '@ember-data/store/-private';
import type { Cache } from '@ember-data/types/cache/cache';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { ModelStore } from './model';
import Model from './model';
import { getModelFactory } from './schema-provider';
import { normalizeModelName } from './util';

export function instantiateRecord(
  this: ModelStore,
  identifier: StableRecordIdentifier,
  createRecordArgs: { [key: string]: unknown }
): Model {
  const type = identifier.type;

  const cache = this.cache;
  // TODO deprecate allowing unknown args setting
  const createOptions = {
    _createProps: createRecordArgs,
    // TODO @deprecate consider deprecating accessing record properties during init which the below is necessary for
    _secretInit: {
      identifier,
      cache,
      store: this,
      cb: secretInit,
    },
  };

  // ensure that `getOwner(this)` works inside a model instance
  setOwner(createOptions, getOwner(this)!);
  const factory = getModelFactory(this, type);

  assert(`No model was found for '${type}'`, factory);
  return factory.class.create(createOptions);
}

export function teardownRecord(record: Model): void {
  assert(
    `expected to receive an instance of Model from @ember-data/model. If using a custom model make sure you implement teardownRecord`,
    'destroy' in record
  );
  record.destroy();
}

export function modelFor(this: Store, modelName: string): typeof Model | void {
  assert(`You need to pass a model name to the store's modelFor method`, modelName);
  assert(
    `Please pass a proper model name to the store's modelFor method`,
    typeof modelName === 'string' && modelName.length
  );
  const type = normalizeModelName(modelName);
  const maybeFactory = getModelFactory(this as ModelStore, type);
  const klass = maybeFactory && maybeFactory.class ? maybeFactory.class : null;

  const ignoreType = !klass || !klass.isModel || this._forceShim;
  if (!ignoreType) {
    return klass;
  }
  assert(
    `No model was found for '${type}' and no schema handles the type`,
    this.getSchemaDefinitionService().doesTypeExist(type)
  );
}

function secretInit(record: Model, cache: Cache, identifier: StableRecordIdentifier, store: Store): void {
  setRecordIdentifier(record, identifier);
  StoreMap.set(record, store);
  setCacheFor(record, cache);
}
