import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/deprecations';

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

  class V1CustomRecordData {
    constructor(identifier, storeWrapper) {
      this.type = identifier.type;
      this.id = identifier.id || null;
      this.clientId = identifier.lid;
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
    isEmpty() {
      return false;
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
    isDeleted() {
      return false;
    }
    isDeletionCommitted() {
      return false;
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
    getHasMany() {}
    addToHasMany() {}
    removeFromHasMany() {}
    getBelongsTo() {}
  }
  class V2CustomRecordData {
    version = '2';
    constructor(identifier, storeWrapper) {
      this.type = identifier.type;
      this.id = identifier.id || null;
      this.clientId = identifier.lid;
      this.storeWrapper = storeWrapper;
      this.attributes = null;
      this.relationships = null;
    }

    pushData(identifier, jsonApiResource, shouldCalculateChanges) {
      let oldAttrs = this.attributes;
      let changedKeys;

      this.attributes = jsonApiResource.attributes || null;

      if (shouldCalculateChanges) {
        changedKeys = Object.keys(Object.assign({}, oldAttrs, this.attributes));
      }

      return changedKeys || [];
    }

    getAttr(identifier, member) {
      return this.attributes !== null ? this.attributes[member] : undefined;
    }

    clientDidCreate(options) {
      return options !== undefined ? options : {};
    }
    isEmpty() {
      return false;
    }
    unloadRecord() {
      this.attributes = null;
      this.relationships = null;
    }
    isNew() {
      return this.id === null;
    }
    isDeleted() {
      return false;
    }
    isDeletionCommitted() {
      return false;
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
    update() {}
    getRelationship() {}
  }

  const CustomRecordData = DEPRECATE_V1_RECORD_DATA ? V1CustomRecordData : V2CustomRecordData;

  test(`store.unloadRecord on a record with default RecordData with relationship to a record with custom RecordData does not error`, async function (assert) {
    const originalCreateRecordDataFor = store.createRecordDataFor;
    let customCalled = 0,
      customCalledFor = [],
      originalCalled = 0,
      originalCalledFor = [];
    store.createRecordDataFor = function provideCustomRecordData(identifier, storeWrapper) {
      if (identifier.type === 'pet') {
        customCalled++;
        customCalledFor.push(identifier);
        return new CustomRecordData(identifier, storeWrapper);
      } else {
        originalCalled++;
        originalCalledFor.push(identifier);
        return originalCreateRecordDataFor.call(this, identifier, storeWrapper);
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
    let pets = chris.pets;
    let shen = pets.at(0);

    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 2 });
    }

    assert.strictEqual(shen.name, 'Shen', 'We found Shen');
    assert.strictEqual(customCalled, 2, 'we used the custom record-data for pet');
    assert.deepEqual(
      customCalledFor.map((i) => {
        return { type: i.type, id: i.id };
      }),
      [
        { id: '1', type: 'pet' },
        { id: '2', type: 'pet' },
      ],
      'we used the cutom record-data for the correct pets'
    );
    assert.strictEqual(originalCalled, 1, 'we used the default record-data for person');
    assert.deepEqual(
      originalCalledFor.map((i) => {
        return { type: i.type, id: i.id };
      }),
      [{ id: '1', type: 'person' }],
      'we used the default record-data for the correct person'
    );

    try {
      run(() => chris.unloadRecord());
      assert.ok(true, 'expected `unloadRecord()` not to throw');
    } catch (e) {
      assert.ok(false, 'expected `unloadRecord()` not to throw');
    }
  });

  test(`store.unloadRecord on a record with custom RecordData with relationship to a record with default RecordData does not error`, async function (assert) {
    const originalCreateRecordDataFor = store.createModelDataFor;
    store.createModelDataFor = function provideCustomRecordData(identifier, storeWrapper) {
      if (identifier.type === 'pet') {
        return new CustomRecordData(identifier, storeWrapper);
      } else {
        return originalCreateRecordDataFor.call(this, identifier, storeWrapper);
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
    let pets = chris.pets;
    let shen = pets.at(0);

    assert.strictEqual(shen.name, 'Shen', 'We found Shen');

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

    store.createRecordDataFor = function (identifier, storeWrapper) {
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

    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }

    assert.strictEqual(recordDataInstances, 1, 'record data created after promise fulfills');
  });
});
