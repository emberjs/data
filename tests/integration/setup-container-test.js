import Application from '@ember/application';
import { run } from '@ember/runloop';
import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import DS from 'ember-data';

const { Store, _setupContainer: setupContainer } = DS;

let container, registry, application;

/*
  These tests ensure that Ember Data works with Ember.js' container
  initialization and dependency injection API.
*/

module("integration/setup-container - Setting up a container", {
  beforeEach() {
    application = run(() => Application.create());

    container = application.__container__;
    registry = application.__registry__;

    let setupContainerArgument;
    if (registry) {
      setupContainerArgument = application;
    } else {
      // In Ember < 2.1.0 application.__registry__ is undefined so we
      // pass in the registry to mimic the setup behavior.
      registry = setupContainerArgument = application.registry;
    }
    setupContainer(setupContainerArgument);
  },

  afterEach() {
    run(() => application.destroy());
  }
});

test("The store should be registered into a container.", function(assert) {
  assert.ok(container.lookup('service:store') instanceof Store, "the custom store is instantiated");
});

test("The store should be registered into the container as a service.", function(assert) {
  assert.ok(container.lookup('service:store') instanceof Store, "the store as a service is registered");
});

test("If a store is instantiated, it should be made available to each controller.", function(assert) {
  registry.register('controller:foo', EmberObject.extend({}));
  let fooController = container.lookup('controller:foo');
  assert.ok(fooController.get('store') instanceof Store, "the store was injected");
});

test("serializers are not returned as singletons - each lookup should return a different instance", function(assert) {
  let serializer1, serializer2;
  serializer1 = container.lookup('serializer:-rest');
  serializer2 = container.lookup('serializer:-rest');
  assert.notEqual(serializer1, serializer2);
});

test("adapters are not returned as singletons - each lookup should return a different instance", function(assert) {
  let adapter1, adapter2;
  adapter1 = container.lookup('adapter:-rest');
  adapter2 = container.lookup('adapter:-rest');
  assert.notEqual(adapter1, adapter2);
});
