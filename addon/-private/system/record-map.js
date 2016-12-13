import { assert, deprecate } from "ember-data/-private/debug";
import InternalModel from './model/internal-model';

/**
 `RecordMap` is a custom storage map for records of a given modelName
 used by `IdentityMap`.

 It was extracted from an implicit pojo based "record map" and preserves
 that interface while we work towards a more official API.

 @class RecordMap
 @private
 */
export default class RecordMap {
  constructor(modelName) {
    this.modelName = modelName;
    this._idToRecord = Object.create(null);
    this._records = [];
    this._metadata = null;
  }

  /**
    A "map" of records based on their ID for this modelName
   */
  get idToRecord() {
    deprecate('Use of RecordMap.idToRecord is deprecated, use RecordMap.get(id) instead.', false, {
      id: 'ds.record-map.idToRecord',
      until: '2.13'
    });
    return this._idToRecord;
  }

  /**
   *
   * @param id
   * @returns {InternalModel}
   */
  get(id) {
    let r = this._idToRecord[id];
    return r;
  }

  has(id) {
    return !!this._idToRecord[id];
  }

  get length() {
    return this._records.length;
  }

  set(id, internalModel) {
    assert(`You cannot index an internalModel by an empty id'`, id);
    assert(`You cannot set an index for an internalModel to something other than an internalModel`, internalModel instanceof InternalModel);
    assert(`You cannot set an index for an internalModel that is not in the RecordMap`, this.contains(internalModel));
    assert(`You cannot update the id index of an InternalModel once set. Attempted to update ${id}.`, !this.has(id) || this.get(id) === internalModel);

    this._idToRecord[id] = internalModel;
  }

  add(internalModel, id) {
    assert(`You cannot re-add an already present InternalModel to the RecordMap.`, !this.contains(internalModel));

    if (id) {
      this._idToRecord[id] = internalModel;
    }

    this._records.push(internalModel);
  }

  remove(internalModel, id) {
    if (id) {
      delete this._idToRecord[id];
    }

    let loc = this._records.indexOf(internalModel);

    if (loc !== -1) {
      this._records.splice(loc, 1);
    }
  }

  contains(internalModel) {
    return this._records.indexOf(internalModel) !== -1;
  }

  /**
   An array of all records of this modelName
   */
  get records() {
    return this._records;
  }

  /**
   * meta information about records
   */
  get metadata() {
    return this._metadata || (this._metadata = Object.create(null));
  }

  /**
   deprecated (and unsupported) way of accessing modelClass

   @deprecated
   */
  get type() {
    throw new Error('RecordMap.type is no longer available');
  }

  /**
   Destroy all records in the recordMap and wipe metadata.

   @method clear
   */
  clear() {
    if (this._records) {
      let records = this._records;
      this._records = [];
      let record;

      for (let i = 0; i < records.length; i++) {
        record = records[i];
        record.unloadRecord();
        record.destroy(); // maybe within unloadRecord
      }
    }

    this._metadata = null;
  }

  destroy() {
    this._store = null;
    this._modelClass = null;
  }
}
