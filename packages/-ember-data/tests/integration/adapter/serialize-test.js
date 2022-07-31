import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/adapter/serialize - DS.Adapter integration test', function (hooks) {
  setupTest(hooks);

  test('serialize() is delegated to the serializer', function (assert) {
    assert.expect(1);

    class Person extends Model {}

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let serializer = store.serializerFor('application');

    serializer.serialize = function (snapshot, options) {
      assert.deepEqual(options, { foo: 'bar' });
    };

    let person = store.createRecord('person');

    adapter.serialize(person._createSnapshot(), { foo: 'bar' });
  });
});
