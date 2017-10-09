import {
  setup as setupModelFactoryInjections,
  reset as resetModelFactoryInjections
} from 'dummy/tests/helpers/model-factory-injection';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/application';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import DS from 'ember-data';
import { module, test } from 'qunit';

let env, hasFactoryFor, originalLookupFactory, originalOwnerLookupFactory, originalFactoryFor;

const model = {
  isModel: true,
  _create() { }
};
const factory = {
  class: model
};

module('integration/injection factoryFor enabled', {
  setup() {
    env = setupStore();

    if (getOwner) {
      let owner = getOwner(env.store);

      hasFactoryFor = !!owner.factoryFor;
      originalFactoryFor = owner.factoryFor;
      originalOwnerLookupFactory = owner._lookupFactory;

      if (originalFactoryFor) {
        owner.factoryFor = function(/* name */) {
          return factory;
        };
      } else {
        // Ember 2.3 - Ember 2.11
        originalOwnerLookupFactory = owner._lookupFactory;
        owner._lookupFactory = function() {
          return model;
        };
      }
    } else {
      originalLookupFactory = env.store.container.lookupFactory;
      env.store.container.lookupFactory = function() {
        return model;
      };
    }
  },

  teardown() {
    if (getOwner) {
      let owner = getOwner(env.store);

      if (owner.factoryFor) {
        owner.factoryFor = originalFactoryFor;
      } else {
        owner._lookupFactory = originalOwnerLookupFactory;
      }
    } else {
      env.store.container.lookupFactory = originalLookupFactory;
    }

    run(env.store, 'destroy');
  }
});

test('modelFactoryFor', function(assert) {
  const modelFactory = env.store.modelFactoryFor('super-villain');

  assert.equal(modelFactory, hasFactoryFor ? factory : model, 'expected the factory itself to be returned');
});

test('modelFor', function(assert) {
  const modelFactory = env.store.modelFor('super-villain');

  assert.equal(modelFactory, model, 'expected the factory itself to be returned');

  // TODO: we should deprecate this next line. Resolved state on the class is fraught with peril
  assert.equal(modelFactory.modelName, 'super-villain', 'expected the factory itself to be returned');
});

module('integration/injection eager injections', {
  setup() {
    setupModelFactoryInjections();
    env = setupStore();

    env.registry.injection('model:foo', 'apple', 'service:apple');
    env.registry.register('model:foo',     DS.Model);
    env.registry.register('service:apple', EmberObject.extend({ isService: true }));
    // container injection
  },

  teardown() {
    // can be removed once we no longer support ember versions without lookupFactory
    resetModelFactoryInjections();

    run(env.store, 'destroy');
  }
});

test('did inject', function(assert) {
  let foo = run(() => env.store.createRecord('foo'));
  let apple = foo.get('apple');
  let Apple = env.registry.registrations['service:apple'];

  assert.ok(apple, `'model:foo' instance should have an 'apple' property`);
  assert.ok(apple instanceof Apple, `'model:foo'.apple should be an instance of 'service:apple'`);
});
