import { assert } from '@ember/debug';
import InternalModel from './model/internal-model';
import {recordIdentifierFor} from "./cache/identifier-index";
import {internalModelFor, setInternalModelFor} from "./cache/internal-model-for";

/**
 `InternalModelMap` is a custom storage map for internalModels of a given modelName
 used by `IdentityMap`.

 It was extracted from an implicit pojo based "internalModel map" and preserves
 that interface while we work towards a more official API.

 @class InternalModelMap
 @private
 */
export default class InternalModelMap {
  constructor(modelName, index) {
    this.index = index;
    this.modelName = modelName;
    this._models = [];
    this._metadata = null;
  }

  get _identifiers() {
    return this.index.cache['json-api-identifier'][this.modelName];
  }

  get _idToModel() {
    throw new Error('dont use me');
  }

  /**
   * @method get
   * @param id {String}
   * @return {InternalModel}
   */
  get(id) {
    let identifier = this._identifiers[id];

    return internalModelFor(identifier);
  }

  has(id) {
    return !!this.get(id);
  }

  get length() {
    return this._models.length;
  }

  set(id, internalModel) {
    assert(`You cannot index an internalModel by an empty id'`, id);
    assert(
      `You cannot set an index for an internalModel to something other than an internalModel`,
      internalModel instanceof InternalModel
    );
    assert(
      `You cannot set an index for an internalModel that is not in the InternalModelMap`,
      this.contains(internalModel)
    );
    assert(
      `You cannot update the id index of an InternalModel once set. Attempted to update ${id}.`,
      !this.has(id) || this.get(id) === internalModel
    );

    let identifier = this._identifiers[id];

    throw new Error('hrmmmmm unsure this should exist');
    setInternalModelFor(identifier, internalModel);
  }

  add(internalModel, id) {
    assert(
      `You cannot re-add an already present InternalModel to the InternalModelMap.`,
      !this.contains(internalModel)
    );

    if (id) {
      assert(
        `Duplicate InternalModel for ${this.modelName}:${id} detected.`,
        !this.has(id) || this.get(id) === internalModel
      );

      this._idToModel[id] = internalModel;
    }

    this._models.push(internalModel);
    throw new Error('hrrmmmmmmm hrm hrm');
  }

  remove(internalModel) {
    let identifier = recordIdentifierFor({ lid: internalModel.clientId });

    // fallback for internalModels that don't have ids
    setInternalModelFor(identifier, null);
  }

  contains(internalModel) {
    return this._models.indexOf(internalModel) !== -1;
  }

  /**
   An array of all models of this modelName
   @property models
   @type Array
   */
  get models() {
    return this._models;
  }

  /**
   * meta information about internalModels
   * @property metadata
   * @type Object
   */
  get metadata() {
    return this._metadata || (this._metadata = Object.create(null));
  }

  /**
   deprecated (and unsupported) way of accessing modelClass

   @property type
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
      model.unloadRecord();
    }

    this._metadata = null;
  }
}
