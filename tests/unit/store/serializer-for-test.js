import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

let container, store, registry, Person;
const { run } = Ember;

module('unit/store/serializer_for - DS.Store#serializerFor', {
  beforeEach() {
    Person = DS.Model.extend({});
    var env = setupStore({ person: Person });
    store = env.store;
    container = env.container;
    registry = env.registry;
  },

  afterEach() {
    run(() => {
      container.destroy();
      store.destroy();
    });
  }
});

test('Calling serializerFor looks up `serializer:<type>` from the container', function(assert) {
  const PersonSerializer = DS.JSONSerializer.extend();

  registry.register('serializer:person', PersonSerializer);

  assert.ok(store.serializerFor('person') instanceof PersonSerializer, 'serializer returned from serializerFor is an instance of the registered Serializer class');
});

test('Calling serializerFor with a type that has not been registered looks up the default ApplicationSerializer', function(assert) {
  const ApplicationSerializer = DS.JSONSerializer.extend();

  registry.register('serializer:application', ApplicationSerializer);

  assert.ok(store.serializerFor('person') instanceof ApplicationSerializer, 'serializer returned from serializerFor is an instance of ApplicationSerializer');
});

test('Calling serializerFor with a type that has not been registered and in an application that does not have an ApplicationSerializer looks up the default Ember Data serializer', function(assert) {
  assert.ok(store.serializerFor('person') instanceof DS.JSONSerializer, 'serializer returned from serializerFor is an instance of DS.JSONSerializer');
});

testInDebug('Calling serializerFor with a model class should assert', function(assert) {
  assert.expectAssertion(() => {
    store.serializerFor(Person);
  }, /Passing classes to store.serializerFor has been removed/);
});
