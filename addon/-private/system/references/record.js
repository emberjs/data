import Ember from 'ember';
import Reference from './reference';

var RecordReference = function(store, internalModel) {
  this._super$constructor(store, internalModel);
  this.type = internalModel.modelName;
  this._id = internalModel.id;
};

RecordReference.prototype = Object.create(Reference.prototype);
RecordReference.prototype.constructor = RecordReference;
RecordReference.prototype._super$constructor = Reference;

RecordReference.prototype.id = function() {
  return this._id;
};

RecordReference.prototype.remoteType = function() {
  return 'identity';
};

RecordReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((data) => {
    var record = this.store.push(data);
    return record;
  });
};

RecordReference.prototype.value = function() {
  return this.internalModel.record;
};

RecordReference.prototype.load = function() {
  return this.store.findRecord(this.type, this._id);
};

RecordReference.prototype.reload = function() {
  var record = this.value();
  if (record) {
    return record.reload();
  }

  return this.load();
};

export default RecordReference;
