import { cacheFor } from '@ember/object/internals';

import type { NotificationType, Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import { Context } from '@warp-drive/core/reactive/-private';
import { notifyInternalSignal, peekInternalSignal, withSignalStore } from '@warp-drive/core/store/-private';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { LegacyRelationshipField as RelationshipSchema } from '@warp-drive/core/types/schema/fields';

import { LEGACY_SUPPORT } from './legacy-relationships-support.ts';
import type { Model } from './model.ts';

export default function notifyChanges(
  identifier: ResourceKey,
  value: NotificationType,
  key: string | undefined,
  record: Model,
  store: Store
): void {
  switch (value) {
    case 'added':
    case 'attributes':
      if (key) {
        notifyAttribute(store, identifier, key, record);
      } else {
        record.eachAttribute((name) => {
          notifyAttribute(store, identifier, name, record);
        });
      }
      break;

    case 'relationships':
      if (key) {
        const meta = (record.constructor as typeof Model).relationshipsByName.get(key);
        assert(`Expected to find a relationship for ${key} on ${identifier.type}`, meta);
        notifyRelationship(identifier, key, record, meta);
      } else {
        record.eachRelationship((name, meta) => {
          notifyRelationship(identifier, name, record, meta);
        });
      }
      break;

    case 'identity':
      notifyInternalSignal(peekInternalSignal(withSignalStore(record), 'id'));
      break;
  }
}

function notifyRelationship(identifier: ResourceKey, key: string, record: Model, meta: RelationshipSchema) {
  if (meta.kind === 'belongsTo') {
    record.notifyPropertyChange(key);
  } else if (meta.kind === 'hasMany') {
    const support = LEGACY_SUPPORT.get(identifier);
    const manyArray = support && support._manyArrayCache[key];
    const hasPromise = support && support._relationshipPromisesCache[key];

    if (manyArray && hasPromise) {
      // do nothing, we will notify the ManyArray directly
      // once the fetch has completed.
      return;
    }

    if (manyArray) {
      notifyInternalSignal(manyArray[Context].signal);

      //We need to notifyPropertyChange in the adding case because we need to make sure
      //we fetch the newly added record in case it is unloaded
      //TODO(Igor): Consider whether we could do this only if the record state is unloaded
      assert(`Expected options to exist on relationship meta`, meta.options);
      assert(`Expected async to exist on relationship meta options`, 'async' in meta.options);
      if (meta.options.async) {
        record.notifyPropertyChange(key);
      }
    }
  }
}

function notifyAttribute(store: Store, identifier: ResourceKey, key: string, record: Model) {
  const currentValue = cacheFor(record, key);
  const cache = store.cache;
  if (currentValue !== cache.getAttr(identifier, key)) {
    record.notifyPropertyChange(key);
  }
}
