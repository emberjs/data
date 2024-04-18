import { assert } from '@ember/debug';
import { cacheFor } from '@ember/object/internals';

import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { RelationshipSchema } from '@warp-drive/core-types/schema';

import { LEGACY_SUPPORT } from './legacy-relationships-support';
import type { Model } from './model';

export default function notifyChanges(
  identifier: StableRecordIdentifier,
  value: NotificationType,
  key: string | undefined,
  record: Model,
  store: Store
) {
  if (value === 'attributes') {
    if (key) {
      notifyAttribute(store, identifier, key, record);
    } else {
      record.eachAttribute((name) => {
        notifyAttribute(store, identifier, name, record);
      });
    }
  } else if (value === 'relationships') {
    if (key) {
      const meta = (record.constructor as typeof Model).relationshipsByName.get(key);
      assert(`Expected to find a relationship for ${key} on ${identifier.type}`, meta);
      notifyRelationship(identifier, key, record, meta);
    } else {
      record.eachRelationship((name, meta) => {
        notifyRelationship(identifier, name, record, meta);
      });
    }
  } else if (value === 'identity') {
    record.notifyPropertyChange('id');
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
      manyArray.notify();

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
