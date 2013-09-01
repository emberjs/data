/**
  @module ember-data
*/

/**
  An AttributeChange object is created whenever a record's
  attribute changes value. It is used to track changes to a
  record between transaction commits.

  @class AttributeChange
  @namespace DS
  @private
  @constructor
*/
var AttributeChange = DS.AttributeChange = function(options) {
  this.record = options.record;
  this.store = options.store;
  this.name = options.name;
  this.value = options.value;
  this.oldValue = options.oldValue;
};

AttributeChange.createChange = function(options) {
  return new AttributeChange(options);
};

AttributeChange.prototype = {
  sync: function() {
    if (this.value !== this.oldValue) {
      this.record.send('becomeDirty');
      this.record.updateRecordArraysLater();
    }

    // TODO: Use this object in the commit process
    this.destroy();
  },

  /**
    If the AttributeChange is destroyed (either by being rolled back
    or being committed), remove it from the list of pending changes
    on the record.

    @method destroy
  */
  destroy: function() {
    delete this.record._changesToSync[this.name];
  }
};
