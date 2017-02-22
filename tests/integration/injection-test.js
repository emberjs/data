import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import DS from 'ember-data';
import { module, test } from 'qunit';

let env, originalFactoryFor, originalMODEL_FACTORY_INJECTIONS = Ember.MODEL_FACTORY_INJECTIONS;
const { run } = Ember;

const factory = {
  isFactory: true,
  class: {
    isModel: true,
    _create() { }
  }
};

module('integration/injection factoryFor enabled', {
  setup() {
    env = setupStore();

    originalFactoryFor = Ember.getOwner(env.store).factoryFor;

    Ember.getOwner(env.store).factoryFor = function(name) {
      return factory;
    };
  },

  teardown() {
    Ember.getOwner(env.store).factoryFor = originalFactoryFor;

    run(env.store, 'destroy');
  }
});

test('modelFactoryFor', function(assert) {
  const modelFactory = env.store.modelFactoryFor('super-villain');

  assert.equal(modelFactory, factory, 'expected the factory itself to be returned');
});

test('modelFor', function(assert) {
  const modelFactory = env.store.modelFor('super-villain');

  assert.equal(modelFactory, factory.class, 'expected the factory itself to be returned');

  // TODO: we should deprecate this next line. Resolved state on the class is fraught with peril
  assert.equal(modelFactory.modelName, 'super-villain', 'expected the factory itself to be returned');
});

module('integration/injection eager injections', {
  setup() {
    Ember.MODEL_FACTORY_INJECTIONS = true;
    env = setupStore();

    env.registry.injection('model:foo', 'apple', 'service:apple');
    env.registry.register('model:foo',     DS.Model);
    env.registry.register('service:apple', Ember.Object.extend({ isService: true }));
    // container injection
  },

  teardown() {
    // can be removed once we no longer support ember versions without lookupFactory
    Ember.MODEL_FACTORY_INJECTIONS = originalMODEL_FACTORY_INJECTIONS;

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
