/*globals EmberDev ENV QUnit */

(function() {
  window.Ember = window.Ember || {};

  Ember.config = {};
  Ember.testing = true;

  window.ENV = { TESTING: true };

  var extendPrototypes = QUnit.urlParams.extendprototypes;
  ENV['EXTEND_PROTOTYPES'] = !!extendPrototypes;

  if (EmberDev.jsHint) {
    // jsHint makes its own Object.create stub, we don't want to use this
    ENV['STUB_OBJECT_CREATE'] = !Object.create;
  }

  window.async = function(callback, timeout) {
    stop();

    timeout = setTimeout(function() {
      start();
      ok(false, "Timeout was reached");
    }, timeout || 200);

    return function() {
      clearTimeout(timeout);

      start();

      var args = arguments;
      return Ember.run(function() {
        return callback.apply(this, args);
      });
    };
  };

  window.asyncEqual = function(a, b, message) {
    Ember.RSVP.all([ Ember.RSVP.resolve(a), Ember.RSVP.resolve(b) ]).then(async(function(array) {
      /*globals QUnit*/
      QUnit.push(array[0] === array[1], array[0], array[1], message);
    }));
  };

  window.invokeAsync = function(callback, timeout) {
    timeout = timeout || 1;

    setTimeout(async(callback, timeout+100), timeout);
  };

  window.setupStore = function(options) {
    var env = {};
    options = options || {};

    var container = env.container = new Ember.Container();

    var adapter = env.adapter = (options.adapter || DS.Adapter);
    delete options.adapter;

    for (var prop in options) {
      container.register('model:' + prop, options[prop]);
    }

    container.register('store:main', DS.Store.extend({
      adapter: adapter
    }));

    container.register('serializer:_default', DS.JSONSerializer);
    container.register('serializer:_rest', DS.RESTSerializer);
    container.register('adapter:_rest', DS.RESTAdapter);

    container.injection('serializer', 'store', 'store:main');

    env.serializer = container.lookup('serializer:_default');
    env.restSerializer = container.lookup('serializer:_rest');
    env.store = container.lookup('store:main');
    env.adapter = env.store.get('defaultAdapter');

    return env;
  };

  window.createStore = function(options) {
    return setupStore(options).store;
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
    var ERRORS = [
      Error,
      EvalError,
      RangeError,
      ReferenceError,
      SyntaxError,
      TypeError,
      URIError
    ]

    function isError(error) {
      for(var i=0, l = ERRORS.length; i < l; i++) {
        if (error instanceof ERRORS[i]) {
          return true;
        }
      }

      return false;
    }

    Ember.RSVP.configure('onerror', function(reason) {
      // only print error messages if they're exceptions;
      // otherwise, let a future turn of the event loop
      // handle the error.
      if (reason && isError(reason)) {
        console.log(reason.stack);
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
        return this._super(attributeType) || transforms[attributeType];
      }
    });

    Ember.RSVP.Promise.prototype.then = syncForTest(Ember.RSVP.Promise.prototype.then);
  });

  EmberDev.distros = {
    //spade:   'ember-data-spade.js',
    spade:   'ember-spade.js',
    build:   'ember-data.js'
  };

  // Generate the jQuery expando on window ahead of time
  // to make the QUnit global check run clean
  jQuery(window).data('testing', true);

})();
