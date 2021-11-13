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

module('RecordData Compatibility', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');
  });

  class CustomRecordData {
    constructor(modelName, id, clientId, storeWrapper) {
      this.type = modelName;
      this.id = id || null;
      this.clientId = clientId;
      this.storeWrapper = storeWrapper;
      this.attributes = null;
      this.relationships = null;
    }

    pushData(jsonApiResource, shouldCalculateChanges) {
      let oldAttrs = this.attributes;
      let changedKeys;

      this.attributes = jsonApiResource.attributes || null;

      if (shouldCalculateChanges) {
        changedKeys = Object.keys(Object.assign({}, oldAttrs, this.attributes));
      }

      return changedKeys || [];
    }

    getAttr(member) {
      return this.attributes !== null ? this.attributes[member] : undefined;
    }

    hasAttr(key) {
      return key in this.attributes;
    }

    // TODO missing from RFC but required to implement
    _initRecordCreateOptions(options) {
      return options !== undefined ? options : {};
    }
    // TODO missing from RFC but required to implement
    getResourceIdentifier() {
      return {
        id: this.id,
        type: this.type,
        clientId: this.clientId,
      };
    }
    // TODO missing from RFC but required to implement
    unloadRecord() {
      this.attributes = null;
      this.relationships = null;
    }
    // TODO missing from RFC but required to implement
    isNew() {
      return this.id === null;
    }

    adapterDidCommit() {}
    didCreateLocally() {}
    adapterWillCommit() {}
    saveWasRejected() {}
    adapterDidDelete() {}
    recordUnloaded() {}
    rollbackAttributes() {}
    rollbackAttribute() {}
    changedAttributes() {}
    hasChangedAttributes() {}
    setAttr() {}
    setHasMany() {}
    getHasMany() {}
    addToHasMany() {}
    removeFromHasMany() {}
    setBelongsTo() {}
    getBelongsTo() {}
  }

  test(`store.unloadRecord on a record with default RecordData with relationship to a record with custom RecordData does not error`, async function (assert) {
    const originalCreateRecordDataFor = store.createRecordDataFor;
    store.createRecordDataFor = function provideCustomRecordData(modelName, id, lid, storeWrapper) {
      if (modelName === 'pet') {
        return new CustomRecordData(modelName, id, lid, storeWrapper);
      } else {
        return originalCreateRecordDataFor.call(this, modelName, id, lid, storeWrapper);
      }
    };

    let chris = store.push({
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
    let shen = pets.objectAt(0);

    assert.strictEqual(shen.get('name'), 'Shen', 'We found Shen');
    assert.ok(recordDataFor(chris) instanceof RecordData, 'We used the default record-data for person');
    assert.ok(recordDataFor(shen) instanceof CustomRecordData, 'We used the custom record-data for pets');

    try {
      run(() => chris.unloadRecord());
      assert.ok(true, 'expected `unloadRecord()` not to throw');
    } catch (e) {
      assert.ok(false, 'expected `unloadRecord()` not to throw');
    }
  });

  test(`store.unloadRecord on a record with custom RecordData with relationship to a record with default RecordData does not error`, async function (assert) {
    const originalCreateRecordDataFor = store.createModelDataFor;
    store.createModelDataFor = function provideCustomRecordData(modelName, id, lid, storeWrapper) {
      if (modelName === 'pet') {
        return new CustomRecordData(modelName, id, lid, storeWrapper);
      } else {
        return originalCreateRecordDataFor.call(this, modelName, id, lid, storeWrapper);
      }
    };

    let chris = store.push({
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
    let shen = pets.objectAt(0);

    assert.strictEqual(shen.get('name'), 'Shen', 'We found Shen');

    try {
      run(() => shen.unloadRecord());
      assert.ok(true, 'expected `unloadRecord()` not to throw');
    } catch (e) {
      assert.ok(false, 'expected `unloadRecord()` not to throw');
    }
  });

  test(`store.findRecord does not eagerly instantiate record data`, async function (assert) {
    let recordDataInstances = 0;
    class TestRecordData extends CustomRecordData {
      constructor() {
        super(...arguments);
        ++recordDataInstances;
      }
    }

    store.createRecordDataFor = function (modelName, id, lid, storeWrapper) {
      return new TestRecordData(modelName, id, lid, storeWrapper);
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
