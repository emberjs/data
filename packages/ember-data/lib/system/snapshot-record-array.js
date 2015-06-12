/**
  @module ember-data
*/

/**
  @class SnapshotRecordArray
  @namespace DS
  @private
  @constructor
  @param {Array} snapshots An array of snapshots
  @param {Object} meta
*/
function SnapshotRecordArray(recordArray, meta, adapterOptions) {
  this._snapshots = null;
  this._recordArray = recordArray;
  this.length = recordArray.get('length');
  this.meta = meta;
  this.adapterOptions = adapterOptions;
}

SnapshotRecordArray.prototype.snapshots = function() {
  if (this._snapshots) {
    return this._snapshots;
  }
  var recordArray = this._recordArray;
  this._snapshots = recordArray.invoke('createSnapshot');

  return this._snapshots;
};

export default SnapshotRecordArray;
