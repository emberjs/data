import { A } from '@ember/array';
import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';

let store, Record, Storage;

module('unit/store/createRecord - Store creating records', {
  beforeEach() {
    Record = DS.Model.extend({
      title: DS.attr('string')
    });

    Storage = DS.Model.extend({
      name: DS.attr('name'),
      records: DS.hasMany('record', { async: false })
    });

    store = createStore({
      adapter: DS.Adapter.extend(),
      record: Record,
      storage: Storage
    });
  }
});

test(`doesn't modify passed in properties hash`, function(assert) {
  let attributes = { foo: 'bar' };

  run(() => {
    store.createRecord('record', attributes);
    store.createRecord('record', attributes);
  });

  assert.deepEqual(attributes, { foo: 'bar' }, 'The properties hash is not modified');
});

test('allow passing relationships as well as attributes', function(assert) {
  let records, storage;

  run(() => {
    store.push({
      data: [
        {
          type: 'record',
          id: '1',
          attributes: {
            title: "it's a beautiful day"
          }
        },
        {
          type: 'record',
          id: '2',
          attributes: {
            title: "it's a beautiful day"
          }
        }
      ]
    });

    records = store.peekAll('record');
    storage = store.createRecord('storage', { name: 'Great store', records: records });
  });

  assert.equal(storage.get('name'), 'Great store', 'The attribute is well defined');
  assert.equal(storage.get('records').findBy('id', '1'), A(records).findBy('id', '1'), 'Defined relationships are allowed in createRecord');
  assert.equal(storage.get('records').findBy('id', '2'), A(records).findBy('id', '2'), 'Defined relationships are allowed in createRecord');
});

module('unit/store/createRecord - Store with models by dash', {
  beforeEach() {
    let env = setupStore({
      someThing: DS.Model.extend({
        foo: DS.attr('string')
      })
    });
    store = env.store;
  }
});

test('creating a record by dasherize string finds the model', function(assert) {
  let attributes = { foo: 'bar' };

  let record = run(() => store.createRecord('some-thing', attributes));

  assert.equal(record.get('foo'), attributes.foo, 'The record is created');
  assert.equal(store.modelFor('some-thing').modelName, 'some-thing');
});
