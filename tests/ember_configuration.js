(function() {
  window.Ember = window.Ember || {};

  Ember.config = {};
  Ember.testing = true;

  window.ENV = { TESTING: true };

  window.async = function(callback, timeout) {
    stop();

    timeout = setTimeout(function() {
      start();
      ok(false, "Timeout was reached");
    }, timeout || 100);

    return function() {
      clearTimeout(timeout);

      start();
      callback.apply(this, arguments);
    };
  };

  window.invokeAsync = function(callback, timeout) {
    timeout = timeout || 1;

    setTimeout(async(callback, timeout+100), timeout);
  };

  var syncForTest = function(fn) {
    var callSuper;

    if (typeof fn !== "function") { callSuper = true; }

    return function() {
      var override = false, ret;

      if (Ember.run && !Ember.run.currentRunLoop) {
        Ember.run.begin();
        override = true;
      }

      try {
        if (callSuper) {
          ret = this._super.apply(this, arguments);
        } else {
          ret = fn.apply(this, arguments);
        }
      } finally {
        if (override) {
          Ember.run.end();
        }
      }

      return ret;
    };
  };

  Ember.config.overrideAccessors = function() {
    Ember.set = syncForTest(Ember.set);
    Ember.get = syncForTest(Ember.get);
  };

  Ember.config.overrideClassMixin = function(ClassMixin) {
    ClassMixin.reopen({
      create: syncForTest()
    });
  };

  Ember.config.overridePrototypeMixin = function(PrototypeMixin) {
    PrototypeMixin.reopen({
      destroy: syncForTest()
    });
  };


  minispade.register('ember-data/~test-setup', function() {
    Ember.View.reopen({
      _insertElementLater: syncForTest()
    });

    DS.Store.reopen({
      createRecord: syncForTest(),
      deleteRecord: syncForTest(),
      load: syncForTest(),
      loadMany: syncForTest(),
      filter: syncForTest(),
      find: syncForTest(),
      findByClientId: syncForTest(),
      findMany: syncForTest(),
      didSaveRecord: syncForTest(),
      didSaveRecords: syncForTest(),
      didUpdateAttribute: syncForTest(),
      didUpdateAttributes: syncForTest(),
      didUpdateRelationship: syncForTest(),
      didUpdateRelationships: syncForTest(),
    });

    DS.Model.reopen({
      then: syncForTest(),
      deleteRecord: syncForTest(),
      dataDidChange: Ember.observer(syncForTest(), 'data'),
      updateRecordArraysLater: syncForTest()
    });

    DS.RecordArray.reopen({
      then: syncForTest()
    });

    DS.Transaction.reopen({
      commit: syncForTest(),
    });
  });
})();
