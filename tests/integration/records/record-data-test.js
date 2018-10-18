import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import { run } from '@ember/runloop';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';
import { assign } from '@ember/polyfills';
import { RecordData } from 'ember-data/-private';

class Person extends Model {
  @hasMany('pet', { inverse: null, async: false })
  pets;
  @attr
  name;
}

class Pet extends Model {
  @belongsTo('person', { inverse: null, async: false })
  owner;
  @attr
  name;
}

function recordDataForRecord(record) {
  return record._internalModel._recordData;
}

module('RecordData Compatibility', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
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
        changedKeys = Object.keys(assign({}, oldAttrs, this.attributes));
      }

      return changedKeys || [];
    }

    adapterDidCommit(jsonAPiData) {}
    didCreateLocally(properties) {}
    adapterWillCommit() {}
    saveWasRejected() {}
    adapterDidDelete() {}
    recordUnloaded() {}
    rollbackAttributes() {}
    rollbackAttribute() {}
    changedAttributes() {}
    hasChangedAttributes() {}
    setAttr() {}
    getAttr(member) {
      return this.attributes !== null ? this.attributes[member] : undefined;
    }
    hasAttr(key) {
      return key in this.attributes;
    }
    setHasMany() {}
    getHasMany() {}
    addToHasMany() {}
    removeFromHasMany() {}
    setBelongsTo() {}
    getBelongsTo() {}

    // missing from RFC
    _initRecordCreateOptions(options) {
      return options !== undefined ? options : {};
    }

    getResourceIdentifier() {
      return {
        id: this.id,
        type: this.type,
        clientId: this.clientId,
      };
    }
    unloadRecord() {
      this.attributes = null;
      this.relationships = null;
    }
    isNew() {
      return this.id === null;
    }
  }

  test(`store.unloadRecord on a record with default RecordData with relationship to a record with custom RecordData does not error`, async function(assert) {
    const originalCreateRecordDataFor = store.createRecordDataFor;
    store.createRecordDataFor = function provideCustomRecordData(
      modelName,
      id,
      clientId,
      storeWrapper
    ) {
      if (modelName === 'pet') {
        return new CustomRecordData(modelName, id, clientId, storeWrapper);
      } else {
        return originalCreateRecordDataFor.call(this, modelName, id, clientId, storeWrapper);
      }
    };

    let chris = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          pets: {
            data: [{ type: 'pet', id: '1' }, { type: 'pet', id: '2' }],
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

    assert.equal(shen.get('name'), 'Shen', 'We found Shen');
    assert.ok(
      recordDataForRecord(chris) instanceof RecordData,
      'We used the default record-data for person'
    );
    assert.ok(
      recordDataForRecord(shen) instanceof CustomRecordData,
      'We used the custom record-data for pets'
    );

    try {
      run(() => chris.unloadRecord());
      assert.ok(true, 'expected `unloadRecord()` not to throw');
    } catch (e) {
      assert.ok(false, 'expected `unloadRecord()` not to throw');
    }
  });

  test(`store.unloadRecord on a record with custom RecordData with relationship to a record with default RecordData does not error`, async function(assert) {
    const originalCreateRecordDataFor = store.createModelDataFor;
    store.createModelDataFor = function provideCustomRecordData(
      modelName,
      id,
      clientId,
      storeWrapper
    ) {
      if (modelName === 'pet') {
        return new CustomRecordData(modelName, id, clientId, storeWrapper);
      } else {
        return originalCreateRecordDataFor.call(this, modelName, id, clientId, storeWrapper);
      }
    };

    let chris = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          pets: {
            data: [{ type: 'pet', id: '1' }, { type: 'pet', id: '2' }],
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

    assert.equal(shen.get('name'), 'Shen', 'We found Shen');

    try {
      run(() => shen.unloadRecord());
      assert.ok(true, 'expected `unloadRecord()` not to throw');
    } catch (e) {
      assert.ok(false, 'expected `unloadRecord()` not to throw');
    }
  });
});
