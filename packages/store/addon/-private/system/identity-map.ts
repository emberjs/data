import InternalModelMap from './internal-model-map';

type ConfidentDict<T> = import('../ts-interfaces/utils').ConfidentDict<T>;

/**
  @module @ember-data/store
*/

/**
 `IdentityMap` is a custom storage map for records by modelName
 used by `Store`.

 @class IdentityMap
 @private
 */
export default class IdentityMap {
  private _map: ConfidentDict<InternalModelMap> = Object.create(null);

  /**
   Retrieves the `InternalModelMap` for a given modelName,
   creating one if one did not already exist. This is
   similar to `getWithDefault` or `get` on a `MapWithDefault`

   @method retrieve
   @param modelName a previously normalized modelName
   @return {InternalModelMap} the InternalModelMap for the given modelName
   */
  retrieve(modelName: string): InternalModelMap {
    let map = this._map[modelName];

    if (map === undefined) {
      map = this._map[modelName] = new InternalModelMap(modelName);
    }

    return map;
  }

  /**
   Clears the contents of all known `RecordMaps`, but does
   not remove the InternalModelMap instances.

   @method clear
   */
  clear(): void {
    let map = this._map;
    let keys = Object.keys(map);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      map[key].clear();
    }
  }
}
