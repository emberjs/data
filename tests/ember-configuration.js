/* globals ENV, QUnit */

(function () {
  window.Ember = window.Ember || {};

  Ember.config = {};
  Ember.testing = true;
  Ember.LOG_VERSION = false;

  window.ENV = { TESTING: true, LOG_VERSION: false };

  var extendPrototypes = QUnit.urlParams.extendprototypes;
  ENV['EXTEND_PROTOTYPES'] = !!extendPrototypes;
  ENV['ENABLE_DS_FILTER'] = true;

  // Handle testing feature flags
  ENV['ENABLE_OPTIONAL_FEATURES'] = !!QUnit.urlParams.enableoptionalfeatures;

  window.async = function(callback, timeout) {
    var timer;
    stop();

    timer = setTimeout(function() {
      start();
      ok(false, "Timeout was reached");
    }, timeout || 200);

    return function() {
      clearTimeout(timer);

      start();

      var args = arguments;
      return Ember.run(function() {
        return callback.apply(this, args);
      });
    };
  };

  window.asyncEqual = function(a, b, message) {
    Ember.RSVP.all([Ember.RSVP.resolve(a), Ember.RSVP.resolve(b)]).then(async(function(array) {
      /*globals QUnit*/
      QUnit.push(array[0] === array[1], array[0], array[1], message);
    }));
  };

  window.invokeAsync = function(callback, timeout) {
    timeout = timeout || 1;

    setTimeout(async(callback, timeout+100), timeout);
  };

  window.setupStore = function(options) {
    var container, registry;
    var env = {};
    options = options || {};

    if (Ember.Registry) {
      registry = env.registry = new Ember.Registry();
      container = env.container = registry.container();
    } else {
      container = env.container = new Ember.Container();
      registry = env.registry = container;
    }

    env.replaceContainerNormalize = function replaceContainerNormalize(fn) {
      if (env.registry) {
        env.registry.normalize = fn;
      } else {
        env.container.normalize = fn;
      }
    };

    var adapter = env.adapter = (options.adapter || '-default');
    delete options.adapter;

    if (typeof adapter !== 'string') {
      env.registry.register('adapter:-ember-data-test-custom', adapter);
      adapter = '-ember-data-test-custom';
    }

    for (var prop in options) {
      registry.register('model:' + Ember.String.dasherize(prop), options[prop]);
    }

    registry.register('service:store', DS.Store.extend({
      adapter: adapter
    }));

    registry.optionsForType('serializer', { singleton: false });
    registry.optionsForType('adapter', { singleton: false });
    registry.register('adapter:-default', DS.Adapter);

    registry.register('serializer:-default', DS.JSONSerializer);
    registry.register('serializer:-rest', DS.RESTSerializer);
    registry.register('serializer:-rest-new', DS.RESTSerializer.extend({ isNewSerializerAPI: true }));

    registry.register('adapter:-rest', DS.RESTAdapter);

    registry.register('adapter:-json-api', DS.JSONAPIAdapter);
    registry.register('serializer:-json-api', DS.JSONAPISerializer);

    env.restSerializer = container.lookup('serializer:-rest');
    env.restNewSerializer = container.lookup('serializer:-rest-new');
    env.store = container.lookup('service:store');
    env.serializer = env.store.serializerFor('-default');
    env.adapter = env.store.get('defaultAdapter');

    return env;
  };

  window.createStore = function(options) {
    return setupStore(options).store;
  };

  QUnit.begin(function() {
    Ember.RSVP.configure('onerror', function(reason) {
      // only print error messages if they're exceptions;
      // otherwise, let a future turn of the event loop
      // handle the error.
      if (reason && reason instanceof Error) {
        Ember.Logger.log(reason, reason.stack);
        throw reason;
      }
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

  });

  // Generate the jQuery expando on window ahead of time
  // to make the QUnit global check run clean
  jQuery(window).data('testing', true);

  window.warns = function(callback, regex) {
    var warnWasCalled = false;
    var oldWarn = Ember.warn;
    Ember.warn = function Ember_assertWarning(message, test) {
      if (!test) {
        warnWasCalled = true;
        if (regex) {
          ok(regex.test(message), 'the call to Ember.warn got an unexpected message: ' + message);
        }
      }
    };
    try {
      callback();
      ok(warnWasCalled, 'expected Ember.warn to warn, but was not called');
    } finally {
      Ember.warn = oldWarn;
    }
  };

  window.noWarns = function(callback) {
    var oldWarn = Ember.warn;
    var warnWasCalled = false;
    Ember.warn = function Ember_noWarn(message, test) {
      warnWasCalled = !test;
    };
    try {
      callback();
    } finally {
      ok(!warnWasCalled, 'Ember.warn warned when it should not have warned');
      Ember.warn = oldWarn;
    }
  };

})();
