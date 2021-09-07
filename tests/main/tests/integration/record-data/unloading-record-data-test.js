import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { RecordData } from '@ember-data/record-data/-private';
import { recordDataFor } from '@ember-data/store/-private';

class Person extends Model {
  @hasMany('pet', { inverse: null, async: false })
  pets;
  @attr()
  name;
}

class Pet extends Model {
  @belongsTo('person', { inverse: null, async: false })
  owner;
  @attr()
  name;
}

class CustomRecordData extends RecordData {}

module('RecordData - Unloading', function (hooks) {
  let store, shen, chris;
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');

    const originalCreateRecordDataFor = store.createRecordDataFor;
    store.createRecordDataFor = function provideCustomRecordData(type, id, lid, storeWrapper) {
      if (type === 'pet') {
        const identifier = this.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
        return new CustomRecordData(identifier, storeWrapper);
      } else {
        return originalCreateRecordDataFor.call(this, type, id, lid, storeWrapper);
      }
    };

    chris = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Shen' },
          relationships: {
            owner: { data: { type: 'person', id: '1' } },
          },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Prince' },
          relationships: {
            owner: { data: { type: 'person', id: '1' } },
          },
        },
      ],
    });
    let pets = chris.get('pets');
    shen = pets.objectAt(0);

    assert.equal(shen.get('name'), 'Shen', 'We found Shen');

    assert.equal(recordDataFor(chris).constructor, RecordData, 'We used the default record-data for person');
    assert.equal(recordDataFor(shen).constructor, CustomRecordData, 'We used the custom record-data for pets');
  });

  test(`store.unloadRecord on a record with default RecordData with relationship to a record with custom RecordData does not error`, async function (assert) {
    run(() => chris.unloadRecord());
  });

  test(`store.unloadRecord on a record with custom RecordData with relationship to a record with default RecordData does not error`, async function (assert) {
    run(() => shen.unloadRecord());
  });
});

module('RecordData - Instantiation', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');
  });

  test(`store.findRecord does not eagerly instantiate record data`, async function (assert) {
    let recordDataInstances = 0;
    class TestRecordData extends CustomRecordData {
      constructor() {
        super(...arguments);
        ++recordDataInstances;
      }
    }

    store.createRecordDataFor = function (type, id, lid, storeWrapper) {
      const identifier = this.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
      return new TestRecordData(identifier, storeWrapper);
    };
    this.owner.register(
      'adapter:pet',
      class TestAdapter {
        static create() {
          return new TestAdapter(...arguments);
        }

        findRecord() {
          assert.strictEqual(
            recordDataInstances,
            0,
            'no instance created from findRecord before adapter promise resolves'
          );

          return resolve({
            data: {
              id: '1',
              type: 'pet',
              attributes: {
                name: 'Loki',
              },
            },
          });
        }
      }
    );
    this.owner.register(
      'serializer:pet',
      class TestSerializer {
        static create() {
          return new TestSerializer(...arguments);
        }

        normalizeResponse(store, modelClass, payload) {
          return payload;
        }
      }
    );

    assert.strictEqual(recordDataInstances, 0, 'initially no instances');

    await store.findRecord('pet', '1');

    assert.strictEqual(recordDataInstances, 1, 'record data created after promise fulfills');
  });
});
