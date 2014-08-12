/* globals syncForTest */

;(function(){

  Ember.RSVP.configure('onerror', function(reason) {
    // only print error messages if they're exceptions;
    // otherwise, let a future turn of the event loop
    // handle the error.
    if (reason && reason instanceof Error) {
      Ember.Logger.log(reason, reason.stack);
      throw reason;
    }
  });

  Ember.RSVP.resolve = syncForTest(Ember.RSVP.resolve);

  Ember.View.reopen({
    _insertElementLater: syncForTest()
  });

  DS.Store.reopen({
    save: syncForTest(),
    createRecord: syncForTest(),
    deleteRecord: syncForTest(),
    push: syncForTest(),
    pushMany: syncForTest(),
    filter: syncForTest(),
    find: syncForTest(),
    findMany: syncForTest(),
    findByIds: syncForTest(),
    didSaveRecord: syncForTest(),
    didSaveRecords: syncForTest(),
    didUpdateAttribute: syncForTest(),
    didUpdateAttributes: syncForTest(),
    didUpdateRelationship: syncForTest(),
    didUpdateRelationships: syncForTest()
  });

  DS.Model.reopen({
    save: syncForTest(),
    reload: syncForTest(),
    deleteRecord: syncForTest(),
    dataDidChange: Ember.observer(syncForTest(), 'data'),
    updateRecordArraysLater: syncForTest()
  });

  var transforms = {
    'boolean': DS.BooleanTransform.create(),
    'date': DS.DateTransform.create(),
    'number': DS.NumberTransform.create(),
    'string': DS.StringTransform.create()
  };

  // Prevent all tests involving serialization to require a container
  DS.JSONSerializer.reopen({
    transformFor: function(attributeType) {
      return this._super(attributeType, true) || transforms[attributeType];
    }
  });

  Ember.RSVP.Promise.prototype.then = syncForTest(Ember.RSVP.Promise.prototype.then);
})();
