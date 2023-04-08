import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';

let store, Person;

module('unit/store/serializer_for - Store#serializerFor', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    Person = Model.extend({});

    this.owner.register('model:person', Person);

    store = this.owner.lookup('service:store');
  });

  test('Calling serializerFor looks up `serializer:<type>` from the container', function (assert) {
    const PersonSerializer = JSONSerializer.extend();

    this.owner.register('serializer:person', PersonSerializer);

    assert.ok(
      store.serializerFor('person') instanceof PersonSerializer,
      'serializer returned from serializerFor is an instance of the registered Serializer class'
    );
  });

  test('Calling serializerFor with a type that has not been registered looks up the default ApplicationSerializer', function (assert) {
    const ApplicationSerializer = JSONSerializer.extend();

    this.owner.register('serializer:application', ApplicationSerializer);

    assert.ok(
      store.serializerFor('person') instanceof ApplicationSerializer,
      'serializer returned from serializerFor is an instance of ApplicationSerializer'
    );
  });
});
