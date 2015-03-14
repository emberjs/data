var run = Ember.run;
var Application = Ember.Application;
var Controller = Ember.Controller;
var View = Ember.View;
var Store = DS.Store;
var Namespace = Ember.Namespace;

var app, App, container;

/*
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

function getStore() {
  return lookup('store:main');
}

function lookup(thing) {
  return run(container, 'lookup', thing);
}

module("integration/application - Injecting a Custom Store", {
  setup: function() {
    run(function() {
      app = Application.create({
        ApplicationStore: Store.extend({ isCustom: true }),
        FooController: Controller.extend(),
        ApplicationView: View.extend(),
        BazController: {},
        ApplicationController: Controller.extend(),
        rootElement: '#qunit-fixture'
      });
    });

    container = app.__container__;
  },

  teardown: function() {
    run(app, app.destroy);
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  run(function() {
    ok(getStore().get('isCustom'), "the custom store was instantiated");
  });
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  var fooController = lookup('controller:foo');
  var isCustom = run(fooController, 'get', 'store.isCustom');
  ok(isCustom, "the custom store was injected");
});

test("registering App.Store is deprecated but functional", function() {
  run(app, 'destroy');

  expectDeprecation(function() {
    run(function() {
      app = Application.create({
        Store: DS.Store.extend({ isCustomButDeprecated: true }),
        FooController: Controller.extend()
      });
    });
    container = app.__container__;
  }, 'Specifying a custom Store for Ember Data on your global namespace as `App.Store` ' +
     'has been deprecated. Please use `App.ApplicationStore` instead.');

  run(function() {
    ok(lookup('store:main').get('isCustomButDeprecated'), "the custom store was instantiated");
  });

  var fooController = lookup('controller:foo');
  run(function() {
    ok(fooController.get('store.isCustomButDeprecated'), "the custom store was injected");
  });
});

module("integration/application - Injecting the Default Store", {
  setup: function() {
    run(function() {
      app = Application.create({
        FooController: Controller.extend(),
        ApplicationView: View.extend(),
        BazController: {},
        ApplicationController: Controller.extend()
      });
    });

    container = app.__container__;
  },

  teardown: function() {
    run(app, 'destroy');
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  ok(getStore() instanceof DS.Store, "the store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  run(function() {
    var fooController = lookup('controller:foo');
    ok(fooController.get('store') instanceof DS.Store, "the store was injected");
  });
});

test("the DS namespace should be accessible", function() {
  run(function() {
    ok(Namespace.byName('DS') instanceof Namespace, "the DS namespace is accessible");
  });
});

if (Ember.inject && Ember.inject.service) {
  module("integration/application - Using the store as a service", {
    setup: function() {
      run(function() {
        app = Application.create({
          DoodleService: Ember.Object.extend({ store: Ember.inject.service() })
        });
      });

      container = app.__container__;
    },

    teardown: function() {
      run(app, 'destroy');
      Ember.BOOTED = false;
    }
  });

  test("The store can be injected as a service", function() {
    run(function() {
      var doodleService = lookup('service:doodle');
      ok(doodleService.get('store') instanceof Store, "the store can be used as a service");
    });
  });
}

module("integration/application - Attaching initializer", {
  setup: function() {
    App = Application.extend();
  },

  teardown: function() {
    if (app) {
      run(app, app.destroy);
    }
    Ember.BOOTED = false;
  }
});

test("ember-data initializer is run", function() {
  var ran = false;
  App.initializer({
    name:       "after-ember-data",
    after:      "ember-data",
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  ok(ran, 'ember-data initializer was found');
});

test("store initializer is run (DEPRECATED)", function() {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'store',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  ok(ran, 'store initializer was found');
});

test("injectStore initializer is run (DEPRECATED)", function() {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'injectStore',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  ok(ran, 'injectStore initializer was found');
});

test("transforms initializer is run (DEPRECATED)", function() {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'transforms',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  ok(ran, 'transforms initializer was found');
});

test("activeModelAdapter initializer is run (DEPRECATED)", function() {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'activeModelAdapter',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  ok(ran, 'activeModelAdapter initializer was found');
});
