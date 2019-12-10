import { cacheFor } from '@ember/object/internals';

type Store = import('../ds-model-store').default;
type DSModel = import('../../ts-interfaces/ds-model').DSModel;
type StableRecordIdentifier = import('../../ts-interfaces/identifier').StableRecordIdentifier;

export default function notifyChanges(
  identifier: StableRecordIdentifier,
  value: 'attributes' | 'relationships' | 'errors' | 'meta' | 'unload' | 'identity' | 'property' | 'state',
  record: DSModel,
  store: Store
) {
  if (value === 'attributes') {
    record.eachAttribute(key => {
      let currentValue = cacheFor(record, key);
      let internalModel = store._internalModelForResource(identifier);
      if (currentValue !== internalModel._recordData.getAttr(key)) {
        record.notifyPropertyChange(key);
      }
    });
  } else if (value === 'relationships') {
    record.eachRelationship((key, meta) => {
      let internalModel = store._internalModelForResource(identifier);
      if (meta.kind === 'belongsTo') {
        record.notifyPropertyChange(key);
      } else if (meta.kind === 'hasMany') {
        if (meta.options.async) {
          record.notifyPropertyChange(key);
          internalModel.hasManyRemovalCheck(key);
        }
        if (internalModel._manyArrayCache[key]) {
          internalModel._manyArrayCache[key].retrieveLatest();
        }
      }
    });
  } else if (value === 'errors') {
    let internalModel = store._internalModelForResource(identifier);
    //TODO guard
    let errors = internalModel._recordData.getErrors!(identifier);
    record.invalidErrorsChanged(errors);
  } else if (value === 'state') {
    record.notifyPropertyChange('isNew');
    record.notifyPropertyChange('isDeleted');
  } else if (value === 'identity') {
    record.notifyPropertyChange('id');
  }
}
