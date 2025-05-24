import { getOwner, setOwner } from '@ember/application';

import { assert } from '@warp-drive/build-config/macros';
import { setCacheFor, setRecordIdentifier, type Store, StoreMap } from '@warp-drive/core/store/-private';
import type { Cache } from '@warp-drive/core/types/cache';
import type { StableRecordIdentifier } from '@warp-drive/core/types/identifier';
import type { TypeFromInstance, TypeFromInstanceOrString } from '@warp-drive/core/types/record';

import type { Model, ModelStore } from './model.ts';
import { getModelFactory } from './schema-provider.ts';
import { normalizeModelName } from './util.ts';

function recast(context: Store): asserts context is ModelStore {}

export function instantiateRecord(
  this: Store,
  identifier: StableRecordIdentifier,
  createRecordArgs: { [key: string]: unknown }
): Model {
  const type = identifier.type;

  recast(this);

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

export function modelFor<T>(type: TypeFromInstance<T>): typeof Model | void;
export function modelFor(type: string): typeof Model | void;
export function modelFor<T>(this: Store, modelName: TypeFromInstanceOrString<T>): typeof Model | void {
  assert(
    `Attempted to call store.modelFor(), but the store instance has already been destroyed.`,
    !this.isDestroyed && !this.isDestroying
  );
  assert(`You need to pass a model name to the store's modelFor method`, modelName);
  assert(
    `Please pass a proper model name to the store's modelFor method`,
    typeof modelName === 'string' && modelName.length
  );
  recast(this);

  const type = normalizeModelName(modelName);
  const maybeFactory = getModelFactory(this, type);
  const klass = maybeFactory && maybeFactory.class ? maybeFactory.class : null;

  const ignoreType = !klass || !klass.isModel || this._forceShim;
  if (!ignoreType) {
    return klass;
  }
  assert(`No model was found for '${type}' and no schema handles the type`, this.schema.hasResource({ type }));
}

function secretInit(record: Model, cache: Cache, identifier: StableRecordIdentifier, store: Store): void {
  setRecordIdentifier(record, identifier);
  StoreMap.set(record, store);
  setCacheFor(record, cache);
}
