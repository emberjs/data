import Service, { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import Application from '@ember/application';
import { run } from '@ember/runloop';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';

import { module, test } from 'qunit';

import DS from 'ember-data';

const Store = DS.Store;
const Namespace = Ember.Namespace;

let app, App, container;

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
  beforeEach() {
    run(() => {
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

  afterEach() {
    run(app, app.destroy);
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function(assert) {
  run(() => {
    assert.ok(getStore().get('isCustom'), "the custom store was instantiated");
  });
});

test("If a store is instantiated, it should be made available to each controller.", function(assert) {
  let fooController = lookup('controller:foo');
  let isCustom = run(fooController, 'get', 'store.isCustom');
  assert.ok(isCustom, "the custom store was injected");
});

test("The JSONAPIAdapter is the default adapter when no custom adapter is provided", function(assert) {
  run(() => {
    let store = getStore();
    let adapter = store.adapterFor('application');

    assert.ok(adapter instanceof DS.JSONAPIAdapter, 'default adapter should be the JSONAPIAdapter');
  });
});

module("integration/application - Injecting the Default Store", {
  beforeEach() {
    run(() => {
      app = Application.create({
        FooController: Controller.extend(),
        BazController: {},
        ApplicationController: Controller.extend()
      });
    });

    container = app.__container__;
  },

  afterEach() {
    run(app, 'destroy');
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function(assert) {
  assert.ok(getStore() instanceof DS.Store, "the store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function(assert) {
  run(() => {
    let fooController = lookup('controller:foo');
    assert.ok(fooController.get('store') instanceof DS.Store, "the store was injected");
  });
});

test("the DS namespace should be accessible", function(assert) {
  run(() => {
    assert.ok(Namespace.byName('DS') instanceof Namespace, "the DS namespace is accessible");
  });
});

if (Ember.inject && service) {
  module("integration/application - Using the store as a service", {
    beforeEach() {
      run(() => {
        app = Application.create({
          DoodleService: Service.extend({ store: service() })
        });
      });

      container = app.__container__;
    },

    afterEach() {
      run(app, 'destroy');
      Ember.BOOTED = false;
    }
  });

  test("The store can be injected as a service", function(assert) {
    run(() => {
      let doodleService = lookup('service:doodle');
      assert.ok(doodleService.get('store') instanceof Store, "the store can be used as a service");
    });
  });
}

module("integration/application - Attaching initializer", {
  beforeEach() {
    App = Application.extend();
  },

  afterEach() {
    if (app) {
      run(app, app.destroy);
    }
    Ember.BOOTED = false;
  }
});

test("ember-data initializer is run", function(assert) {
  let ran = false;
  App.initializer({
    name:       "after-ember-data",
    after:      "ember-data",
    initialize() { ran = true; }
  });

  run(() => {
    app = App.create();
  });

  assert.ok(ran, 'ember-data initializer was found');
});

test("ember-data initializer does not register the store service when it was already registered", function(assert) {

  let AppStore = Store.extend({
    isCustomStore: true
  });

  App.initializer({
    name:       "after-ember-data",
    before:      "ember-data",
    initialize(registry) {
      registry.register('service:store', AppStore);
    }
  });

  run(() => {
    app = App.create();
    container = app.__container__;
  });

  let store = getStore();
  assert.ok(store && store.get('isCustomStore'), 'ember-data initializer does not overwrite the previous registered service store');

});

testInDebug("store initializer is run (DEPRECATED)", function(assert) {
  let ran = false;
  App.initializer({
    name:       "after-store",
    after:      'store',
    initialize() { ran = true; }
  });

  assert.expectDeprecation(() => {
    run(() => {
      app = App.create();
    });
  }, /The initializer `store` has been deprecated/)

  assert.ok(ran, 'store initializer was found');
});

testInDebug("injectStore initializer is run (DEPRECATED)", function(assert) {
  let ran = false;
  App.initializer({
    name:       "after-store",
    after:      'injectStore',
    initialize() { ran = true; }
  });

  assert.expectDeprecation(() => {
    run(() => {
      app = App.create();
    });
  }, /The initializer `injectStore` has been deprecated/)

  assert.ok(ran, 'injectStore initializer was found');
});

testInDebug("transforms initializer is run (DEPRECATED)", function(assert) {
  let ran = false;
  App.initializer({
    name:       "after-store",
    after:      'transforms',
    initialize() { ran = true; }
  });

  assert.expectDeprecation(() => {
    run(() => {
      app = App.create();
    });
  }, /The initializer `transforms` has been deprecated/)

  assert.ok(ran, 'transforms initializer was found');
});
