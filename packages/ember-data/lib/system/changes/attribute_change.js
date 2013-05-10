/**
  An AttributeChange object is created whenever a record's
  attribute changes value. It is used to track changes to a
  record between transaction commits.
*/

var AttributeChange = DS.AttributeChange = function(options) {
  this.reference = options.reference;
  this.store = options.store;
  this.name = options.name;
  this.oldValue = options.oldValue;
};

AttributeChange.createChange = function(options) {
  return new AttributeChange(options);
};

AttributeChange.prototype = {
  sync: function() {
    this.store.recordAttributeDidChange(this.reference, this.name, this.value, this.oldValue);

    // TODO: Use this object in the commit process
    this.destroy();
  },

  /**
   If the AttributeChange is destroyed (either by being rolled back
   or being committed), remove it from the list of pending changes
   on the record.
  */
  destroy: function() {
    var record = this.reference.record;

    delete record._changesToSync[this.name];
  }
};
