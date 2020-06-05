import { assert } from '@ember/debug';

import InternalModel from './model/internal-model';

type ConfidentDict<T> = import('../ts-interfaces/utils').ConfidentDict<T>;

/**
  @module @ember-data/store
*/

/**
 `InternalModelMap` is a custom storage map for internalModels of a given modelName
 used by `IdentityMap`.

 It was extracted from an implicit pojo based "internalModel map" and preserves
 that interface while we work towards a more official API.

 @class InternalModelMap
 @private
 */
export default class InternalModelMap {
  private _idToModel: ConfidentDict<InternalModel> = Object.create(null);
  private _models: InternalModel[] = [];
  private _metadata: ConfidentDict<any> | null = null;

  constructor(public modelName: string) {}

  /**
   * @method get
   * @param id {String}
   * @return {InternalModel}
   */
  get(id: string): InternalModel | null {
    return this._idToModel[id] || null;
  }

  has(id: string): boolean {
    return !!this._idToModel[id];
  }

  get length(): number {
    return this._models.length;
  }

  set(id: string, internalModel: InternalModel): void {
    assert(`You cannot index an internalModel by an empty id'`, typeof id === 'string' && id.length > 0);
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

    this._idToModel[id] = internalModel;
  }

  add(internalModel: InternalModel, id: string | null): void {
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
  }

  remove(internalModel: InternalModel, id: string): void {
    delete this._idToModel[id];

    let loc = this._models.indexOf(internalModel);

    if (loc !== -1) {
      this._models.splice(loc, 1);
    }
  }

  contains(internalModel: InternalModel): boolean {
    return this._models.indexOf(internalModel) !== -1;
  }

  /**
   An array of all models of this modelName
   @property models
   @type Array
   */
  get models(): InternalModel[] {
    return this._models;
  }

  /**
   * meta information about internalModels
   * @property metadata
   * @type Object
   */
  get metadata(): ConfidentDict<any> {
    return this._metadata || (this._metadata = Object.create(null));
  }

  /**
   Destroy all models in the internalModelTest and wipe metadata.

   @method clear
   */
  clear(): void {
    let internalModels = this._models;
    this._models = [];

    for (let i = 0; i < internalModels.length; i++) {
      let internalModel = internalModels[i];
      internalModel.unloadRecord();
    }

    this._metadata = null;
  }
}
