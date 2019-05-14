import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let env, store, adapter, serializer;

module('integration/adapter/serialize - DS.Adapter integration test', function(hooks) {
  hooks.beforeEach(function() {
    const Person = DS.Model.extend({
      name: DS.attr('string'),
    });

    env = setupStore({ person: Person });
    store = env.store;
    adapter = env.adapter;
    serializer = store.serializerFor('person');
  });

  hooks.afterEach(function() {
    run(env.container, 'destroy');
  });

  test('serialize() is delegated to the serializer', function(assert) {
    assert.expect(1);

    serializer.serialize = function(snapshot, options) {
      assert.deepEqual(options, { foo: 'bar' });
    };

    let person = store.createRecord('person');
    adapter.serialize(person._createSnapshot(), { foo: 'bar' });
  });
});
