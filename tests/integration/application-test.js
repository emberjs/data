import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var run = Ember.run;
var Application = Ember.Application;
var Controller = Ember.Controller;
var Store = DS.Store;
var Namespace = Ember.Namespace;

var app, App, container;

/*
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

function getStore() {
  return lookup('service:store');
}

function lookup(thing) {
  return run(container, 'lookup', thing);
}

module("integration/application - Injecting a Custom Store", {
  beforeEach: function() {
    run(function() {
      app = Application.create({
        StoreService: Store.extend({ isCustom: true }),
        FooController: Controller.extend(),
        BazController: {},
        ApplicationController: Controller.extend(),
        rootElement: '#qunit-fixture'
      });
    });

    container = app.__container__;
  },

  afterEach: function() {
    run(app, app.destroy);
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function(assert) {
  run(function() {
    assert.ok(getStore().get('isCustom'), "the custom store was instantiated");
  });
});

test("If a store is instantiated, it should be made available to each controller.", function(assert) {
  var fooController = lookup('controller:foo');
  var isCustom = run(fooController, 'get', 'store.isCustom');
  assert.ok(isCustom, "the custom store was injected");
});

test("The JSONAPIAdapter is the default adapter when no custom adapter is provided", function(assert) {
  run(function() {
    var store = getStore();

    var adapter = store.adapterFor('application');

    assert.ok(adapter instanceof DS.JSONAPIAdapter, 'default adapter should be the JSONAPIAdapter');
  });
});

module("integration/application - Injecting the Default Store", {
  beforeEach: function() {
    run(function() {
      app = Application.create({
        FooController: Controller.extend(),
        BazController: {},
        ApplicationController: Controller.extend()
      });
    });

    container = app.__container__;
  },

  afterEach: function() {
    run(app, 'destroy');
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function(assert) {
  assert.ok(getStore() instanceof DS.Store, "the store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function(assert) {
  run(function() {
    var fooController = lookup('controller:foo');
    assert.ok(fooController.get('store') instanceof DS.Store, "the store was injected");
  });
});

test("the DS namespace should be accessible", function(assert) {
  run(function() {
    assert.ok(Namespace.byName('DS') instanceof Namespace, "the DS namespace is accessible");
  });
});

if (Ember.inject && Ember.inject.service) {
  module("integration/application - Using the store as a service", {
    beforeEach: function() {
      run(function() {
        app = Application.create({
          DoodleService: Ember.Service.extend({ store: Ember.inject.service() })
        });
      });

      container = app.__container__;
    },

    afterEach: function() {
      run(app, 'destroy');
      Ember.BOOTED = false;
    }
  });

  test("The store can be injected as a service", function(assert) {
    run(function() {
      var doodleService = lookup('service:doodle');
      assert.ok(doodleService.get('store') instanceof Store, "the store can be used as a service");
    });
  });
}

module("integration/application - Attaching initializer", {
  beforeEach: function() {
    App = Application.extend();
  },

  afterEach: function() {
    if (app) {
      run(app, app.destroy);
    }
    Ember.BOOTED = false;
  }
});

test("ember-data initializer is run", function(assert) {
  var ran = false;
  App.initializer({
    name:       "after-ember-data",
    after:      "ember-data",
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  assert.ok(ran, 'ember-data initializer was found');
});

test("ember-data initializer does not register the store service when it was already registered", function(assert) {

  var AppStore = Store.extend({
    isCustomStore: true
  });

  App.initializer({
    name:       "after-ember-data",
    before:      "ember-data",
    initialize: function(registry) {
      registry.register('service:store', AppStore);
    }
  });

  run(function() {
    app = App.create();
    container = app.__container__;
  });

  var store = getStore();
  assert.ok(store && store.get('isCustomStore'), 'ember-data initializer does not overwrite the previous registered service store');

});

test("store initializer is run (DEPRECATED)", function(assert) {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'store',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  assert.ok(ran, 'store initializer was found');
});

test("injectStore initializer is run (DEPRECATED)", function(assert) {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'injectStore',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  assert.ok(ran, 'injectStore initializer was found');
});

test("transforms initializer is run (DEPRECATED)", function(assert) {
  var ran = false;
  App.initializer({
    name:       "after-store",
    after:      'transforms',
    initialize: function() { ran = true; }
  });

  run(function() {
    app = App.create();
  });

  assert.ok(ran, 'transforms initializer was found');
});
