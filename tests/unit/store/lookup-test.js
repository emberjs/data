import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let store, env, applicationAdapter, applicationSerializer, Person;
const { run } = Ember;

function resetStore() {
  if (store) {
    run(store, 'destroy');
  }
  env = setupStore({
    adapter: '-rest',
    person: Person
  });

  env.registry.unregister('adapter:application');
  env.registry.unregister('serializer:application');

  env.registry.optionsForType('serializer', { singleton: true });
  env.registry.optionsForType('adapter', { singleton: true });

  store = env.store;
}

function lookupAdapter(adapterName) {
  return run(store, 'adapterFor', adapterName);
}

function lookupSerializer(serializerName) {
  return run(store, 'serializerFor', serializerName);
}

function registerAdapter(adapterName, adapter) {
  env.registry.register(`adapter:${adapterName}`, adapter);
}

function registerSerializer(serializerName, serializer) {
  env.registry.register(`serializer:${serializerName}`, serializer);
}

module('unit/store/lookup - Managed Instance lookups', {
  beforeEach() {
    Person = DS.Model.extend();
    resetStore();
    env.registry.register('adapter:application', DS.Adapter.extend());
    env.registry.register('adapter:serializer', DS.Adapter.extend());

    applicationAdapter = run(store, 'adapterFor', 'application');
    applicationSerializer = run(store, 'serializerFor', 'application');
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('when the adapter does not exist for a type, the fallback is returned', (assert) => {
  let personAdapter = lookupAdapter('person');

  assert.strictEqual(personAdapter, applicationAdapter);
});

test('when the adapter for a type exists, returns that instead of the fallback', (assert) => {
  registerAdapter('person', DS.Adapter.extend());
  let personAdapter = lookupAdapter('person');

  assert.ok(personAdapter !== applicationAdapter);
});

test('when the serializer does not exist for a type, the fallback is returned', (assert) => {
  let personSerializer = lookupSerializer('person');

  assert.strictEqual(personSerializer, applicationSerializer);
});

test('when the serializer does exist for a type, the serializer is returned', (assert) => {
  registerSerializer('person', DS.Serializer.extend());

  let personSerializer = lookupSerializer('person');

  assert.ok(personSerializer !== applicationSerializer);
});

test('adapter lookup order', (assert) => {
  assert.expect(3);

  resetStore();

  let personAdapter = lookupAdapter('person');

  assert.strictEqual(personAdapter, lookupAdapter('-rest'), 'looks up the RESTAdapter first');
  resetStore();

  registerAdapter('application', DS.RESTSerializer.extend());
  personAdapter = lookupAdapter('person');

  assert.strictEqual(personAdapter, lookupAdapter('application'), 'looks up application adapter before RESTAdapter if it exists');

  resetStore();

  registerAdapter('application', DS.RESTSerializer.extend());
  registerAdapter('person', DS.RESTSerializer.extend({ customThingy: true }));

  assert.ok(lookupAdapter('person').get('customThingy'), 'looks up type serializer before application');
});

test('serializer lookup order', (assert) => {
  resetStore();

  let personSerializer = lookupSerializer('person');

  assert.strictEqual(personSerializer, lookupSerializer('-rest'));

  resetStore();

  registerSerializer('application', DS.RESTSerializer.extend());
  personSerializer = lookupSerializer('person');
  assert.strictEqual(personSerializer, lookupSerializer('application'), 'looks up application before default');

  resetStore();
  registerAdapter('person', DS.Adapter.extend({
    defaultSerializer: '-rest'
  }));
  personSerializer = lookupSerializer('person');

  assert.strictEqual(personSerializer, lookupSerializer('-rest'), 'uses defaultSerializer on adapterFor("model") if application not defined');

  resetStore();
  registerAdapter('person', DS.Adapter.extend({
    defaultSerializer: '-rest'
  }));
  registerSerializer('application', DS.RESTSerializer.extend());
  registerSerializer('person', DS.JSONSerializer.extend({ customThingy: true }));
  personSerializer = lookupSerializer('person');

  assert.ok(personSerializer.get('customThingy'), 'uses the person serializer before any fallbacks if it is defined');
});
