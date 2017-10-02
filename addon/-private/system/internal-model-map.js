import { assert } from '@ember/debug';
import InternalModel from './model/internal-model';

/**
 `InternalModelMap` is a custom storage map for internalModels of a given modelName
 used by `IdentityMap`.

 It was extracted from an implicit pojo based "internalModel map" and preserves
 that interface while we work towards a more official API.

 @class InternalModelMap
 @private
 */
export default class InternalModelMap {
  constructor(modelName) {
    this.modelName = modelName;
    this._idToModel = Object.create(null);
    this._models = [];
    this._metadata = null;
  }

  /**
   *
   * @param id
   * @returns {InternalModel}
   */
  get(id) {
    return this._idToModel[id];
  }

  has(id) {
    return !!this._idToModel[id];
  }

  get length() {
    return this._models.length;
  }

  set(id, internalModel) {
    assert(`You cannot index an internalModel by an empty id'`, id);
    assert(`You cannot set an index for an internalModel to something other than an internalModel`, internalModel instanceof InternalModel);
    assert(`You cannot set an index for an internalModel that is not in the InternalModelMap`, this.contains(internalModel));
    assert(`You cannot update the id index of an InternalModel once set. Attempted to update ${id}.`, !this.has(id) || this.get(id) === internalModel);

    this._idToModel[id] = internalModel;
  }

  add(internalModel, id) {
    assert(`You cannot re-add an already present InternalModel to the InternalModelMap.`, !this.contains(internalModel));

    if (id) {
      this._idToModel[id] = internalModel;
    }

    this._models.push(internalModel);
  }

  remove(internalModel, id) {
    delete this._idToModel[id];

    let loc = this._models.indexOf(internalModel);

    if (loc !== -1) {
      this._models.splice(loc, 1);
    }
  }

  contains(internalModel) {
    return this._models.indexOf(internalModel) !== -1;
  }

  /**
   An array of all models of this modelName
   */
  get models() {
    return this._models;
  }

  /**
   * meta information about internalModels
   */
  get metadata() {
    return this._metadata || (this._metadata = Object.create(null));
  }

  /**
   deprecated (and unsupported) way of accessing modelClass

   @deprecated
   */
  get type() {
    throw new Error('InternalModelMap.type is no longer available');
  }

  /**
   Destroy all models in the internalModelTest and wipe metadata.

   @method clear
   */
  clear() {
    let models = this._models;
    this._models = [];

    for (let i = 0; i < models.length; i++) {
      let model = models[i];
      model.unloadRecords();
    }

    this._metadata = null;
  }

}
