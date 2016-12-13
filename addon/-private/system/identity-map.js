import RecordMap from './record-map';

/**
 `IdentityMap` is a custom storage map for records by modelName
 used by `DS.Store`.

 @class IdentityMap
 @private
 */
export default class IdentityMap {
  constructor() {
    this._map = Object.create(null);
  }

  /**
   Retrieves the `RecordMap` for a given modelName,
   creating one if one did not already exist. This is
   similar to `getWithDefault` or `get` on a `MapWithDefault`

   @method retrieve
   @param modelName a previously normalized modelName
   @returns {RecordMap} the RecordMap for the given modelName
   */
  retrieve(modelName) {
    let recordMap = this._map[modelName];

    if (!recordMap) {
      recordMap = this._map[modelName] = new RecordMap(modelName);
    }

    return recordMap;
  }

  /**
   Clears the contents of all known `RecordMaps`, but does
   not remove the RecordMap instances.

   @method clear
   */
  clear() {
    let recordMaps = this._map;
    let keys = Object.keys(recordMaps);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      recordMaps[key].clear();
    }
  }
}
