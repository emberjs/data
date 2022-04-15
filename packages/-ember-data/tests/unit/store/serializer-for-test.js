import { module, test } from 'qunit';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

let store, Person;

module('unit/store/serializer_for - DS.Store#serializerFor', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    Person = DS.Model.extend({});

    this.owner.register('model:person', Person);

    store = this.owner.lookup('service:store');
  });

  test('Calling serializerFor looks up `serializer:<type>` from the container', function (assert) {
    const PersonSerializer = DS.JSONSerializer.extend();

    this.owner.register('serializer:person', PersonSerializer);

    assert.ok(
      store.serializerFor('person') instanceof PersonSerializer,
      'serializer returned from serializerFor is an instance of the registered Serializer class'
    );
  });

  test('Calling serializerFor with a type that has not been registered looks up the default ApplicationSerializer', function (assert) {
    const ApplicationSerializer = DS.JSONSerializer.extend();

    this.owner.register('serializer:application', ApplicationSerializer);

    assert.ok(
      store.serializerFor('person') instanceof ApplicationSerializer,
      'serializer returned from serializerFor is an instance of ApplicationSerializer'
    );
  });

  testInDebug('Calling serializerFor with a model class should assert', function (assert) {
    assert.expectAssertion(() => {
      store.serializerFor(Person);
    }, /Passing classes to store.serializerFor has been removed/);
  });
});
