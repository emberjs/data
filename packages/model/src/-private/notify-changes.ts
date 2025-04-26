import { cacheFor } from '@ember/object/internals';

import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store';
import { ARRAY_SIGNAL, notifyInternalSignal } from '@ember-data/store/-private';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { LegacyRelationshipField as RelationshipSchema } from '@warp-drive/core-types/schema/fields';

import { LEGACY_SUPPORT } from './legacy-relationships-support';
import type { Model } from './model';

export default function notifyChanges(
  identifier: StableRecordIdentifier,
  value: NotificationType,
  key: string | undefined,
  record: Model,
  store: Store
) {
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
      record.notifyPropertyChange('id');
      break;
  }
}

function notifyRelationship(identifier: StableRecordIdentifier, key: string, record: Model, meta: RelationshipSchema) {
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
      notifyInternalSignal(manyArray[ARRAY_SIGNAL]);

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

function notifyAttribute(store: Store, identifier: StableRecordIdentifier, key: string, record: Model) {
  const currentValue = cacheFor(record, key);
  const cache = store.cache;
  if (currentValue !== cache.getAttr(identifier, key)) {
    record.notifyPropertyChange(key);
  }
}
