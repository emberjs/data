import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import DS from 'ember-data';
import { module, test } from 'qunit';

let env, originalMODEL_FACTORY_INJECTIONS = Ember.MODEL_FACTORY_INJECTIONS;
const { run } = Ember;

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
