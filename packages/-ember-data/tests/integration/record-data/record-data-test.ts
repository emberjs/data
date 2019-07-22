import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import EmberObject from '@ember/object';
import { attr, hasMany, belongsTo } from '@ember-data/model';
import { RECORD_DATA_ERRORS } from '@ember-data/canary-features';

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;
}

class House extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @belongsTo('person', { async: false })
  landlord;

  @hasMany('person', { async: false })
  tenants;
}

// TODO: this should work
// class TestRecordData implements RecordData
class TestRecordData {
  // Use correct interface once imports have been fix
  _storeWrapper: any;

  pushData(data, calculateChange?: boolean) {}
  clientDidCreate() {}

  willCommit() {}

  commitWasRejected() {}

  unloadRecord() {}
  rollbackAttributes() {}
  changedAttributes(): any {}

  hasChangedAttributes(): boolean {
    return false;
  }

  setDirtyAttribute(key: string, value: any) {}

  getAttr(key: string): string {
    return 'test';
  }

  hasAttr(key: string): boolean {
    return false;
  }

  getHasMany(key: string) {
    return {};
  }

  addToHasMany(key: string, recordDatas: this[], idx?: number) {}
  removeFromHasMany(key: string, recordDatas: this[]) {}
  setDirtyHasMany(key: string, recordDatas: this[]) {}

  getBelongsTo(key: string) {}

  setDirtyBelongsTo(name: string, recordData: this | null) {}

  didCommit(data) {}

  isAttrDirty(key: string) {
    return false;
  }
  removeFromInverseRelationships(isNew: boolean) {}

  _initRecordCreateOptions(options) {}
  isNew() {
    return false;
  }
  isDeleted() {
    return false;
  }
}

let CustomStore = Store.extend({
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    return new TestRecordData();
  },
});

let houseHash, davidHash, runspiredHash, igorHash;

module('integration/record-data - Custom RecordData Implementations', function(hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    houseHash = {
      type: 'house',
      id: '1',
      attributes: {
        name: 'Moomin',
      },
    };

    davidHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'David',
      },
    };

    runspiredHash = {
      type: 'person',
      id: '2',
      attributes: {
        name: 'Runspired',
      },
    };

    igorHash = {
      type: 'person',
      id: '3',
      attributes: {
        name: 'Igor',
      },
    };

    owner.register('model:person', Person);
    owner.register('model:house', House);
    owner.register('service:store', CustomStore);
  });

  test('A RecordData implementation that has the required spec methods should not error out', async function(assert) {
    let { owner } = this;
    store = owner.lookup('service:store');

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
      ],
    });

    let all = store.peekAll('person');
    assert.equal(get(all, 'length'), 2);

    store.push({
      data: [
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    });

    await settled();

    assert.equal(get(all, 'length'), 3);
  });

  test('Record Data push, create and save lifecycle', async function(assert) {
    assert.expect(17);
    let called = 0;
    let createCalled = 0;
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    let { owner } = this;
    let calledPush = 0;
    let calledClientDidCreate = 0;
    let calledWillCommit = 0;
    let calledWasRejected = 0;
    let calledUnloadRecord = 0;
    let calledRollbackAttributes = 0;
    let calledDidCommit = 0;
    let isNew = false;

    class LifecycleRecordData extends TestRecordData {
      pushData(data, calculateChange?: boolean) {
        calledPush++;
      }

      clientDidCreate() {
        calledClientDidCreate++;
        isNew = true;
      }

      willCommit() {
        calledWillCommit++;
      }

      commitWasRejected() {
        calledWasRejected++;
      }

      unloadRecord() {
        calledUnloadRecord++;
      }

      rollbackAttributes() {
        calledRollbackAttributes++;
      }

      didCommit(data) {
        calledDidCommit++;
        isNew = false;
      }

      isNew() {
        return isNew;
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData();
      },
    });

    let TestAdapter = EmberObject.extend({
      updateRecord() {
        called++;
        if (called === 1) {
          return Promise.resolve();
        } else if (called > 1) {
          return Promise.reject();
        }
      },

      createRecord() {
        return Promise.resolve();
      },
    });

    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });
    assert.equal(calledPush, 1, 'Called pushData');

    let person = store.peekRecord('person', '1');
    person.save();
    assert.equal(calledWillCommit, 1, 'Called willCommit');

    await settled();
    assert.equal(calledDidCommit, 1, 'Called didCommit');

    person.save();
    assert.equal(calledWillCommit, 2, 'Called willCommit');

    await settled();
    assert.equal(calledDidCommit, 1, 'Did not call didCommit again');
    assert.equal(calledWasRejected, 1, 'Called commitWasRejected');

    person.rollbackAttributes();
    assert.equal(calledRollbackAttributes, 1, 'Called rollbackAttributes');

    person.unloadRecord();
    assert.equal(calledUnloadRecord, 1, 'Called unloadRecord');

    await settled();
    assert.equal(calledClientDidCreate, 0, 'Did not called clientDidCreate');

    calledPush = 0;
    calledClientDidCreate = 0;
    calledWillCommit = 0;
    calledWasRejected = 0;
    calledUnloadRecord = 0;
    calledRollbackAttributes = 0;
    calledDidCommit = 0;

    let clientPerson = store.createRecord('person', { id: 2 });
    assert.equal(calledClientDidCreate, 1, 'Called clientDidCreate');

    clientPerson.save();
    assert.equal(calledWillCommit, 1, 'Called willCommit');

    await settled();
    assert.equal(calledDidCommit, 1, 'Called didCommit');

    clientPerson.save();
    assert.equal(calledWillCommit, 2, 'Called willCommit');

    await settled();
    assert.equal(calledWasRejected, 1, 'Called commitWasRejected');
    assert.equal(calledDidCommit, 1, 'Did not call didCommit again');

    clientPerson.unloadRecord();
    assert.equal(calledUnloadRecord, 1, 'Called unloadRecord');

    await settled();
    assert.equal(calledPush, 0, 'Did not call pushData');
  });

  test('Record Data attribute settting', async function(assert) {
    let expectedCount = 11;
    if (RECORD_DATA_ERRORS) {
      expectedCount = 12;
    }
    assert.expect(expectedCount);
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };

    let { owner } = this;
    let calledGet = 0;

    class AttributeRecordData extends TestRecordData {
      changedAttributes(): any {
        return { name: ['old', 'new'] };
      }

      hasChangedAttributes(): boolean {
        return false;
      }

      setDirtyAttribute(key: string, value: any) {
        assert.equal(key, 'name', 'key passed to setDirtyAttribute');
        assert.equal(value, 'new value', 'value passed to setDirtyAttribute');
      }

      getAttr(key: string): string {
        calledGet++;
        assert.equal(key, 'name', 'key passed to getAttr');
        return 'new attribute';
      }

      hasAttr(key: string): boolean {
        assert.equal(key, 'name', 'key passed to hasAttr');
        return true;
      }

      isAttrDirty(key: string) {
        return false;
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new AttributeRecordData();
      },
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1');
    assert.equal(person.get('name'), 'new attribute');
    person.set('name', 'new value');
    person.notifyPropertyChange('name');
    assert.equal(person.get('name'), 'new attribute');
    let expectedTimesToCallGet = 3;
    if (RECORD_DATA_ERRORS) {
      expectedTimesToCallGet = 4;
    }
    assert.equal(calledGet, expectedTimesToCallGet, 'called getAttr after notifyPropertyChange');
    assert.deepEqual(
      person.changedAttributes(),
      { name: ['old', 'new'] },
      'changed attributes passes through RD value'
    );
  });

  test('Record Data controls belongsTo notifications', async function(assert) {
    assert.expect(6);
    let called = 0;
    let createCalled = 0;

    let { owner } = this;
    let belongsToReturnValue = { data: { id: '1', type: 'person' } };

    class RelationshipRecordData extends TestRecordData {
      constructor(storeWrapper) {
        super();
        this._storeWrapper = storeWrapper;
      }

      getBelongsTo(key: string) {
        assert.equal(key, 'landlord', 'Passed correct key to getBelongsTo');
        return belongsToReturnValue;
      }

      // Use correct interface once imports have been fix
      setDirtyBelongsTo(key: string, recordData: any) {
        assert.equal(key, 'landlord', 'Passed correct key to setBelongsTo');
        assert.equal(recordData.id, '2', 'Passed correct RD to setBelongsTo');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RelationshipRecordData(storeWrapper);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [davidHash, runspiredHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    let runspired = store.peekRecord('person', '2');
    assert.equal(house.get('landlord.name'), 'David', 'belongsTo get correctly looked up');

    house.set('landlord', runspired);
    assert.equal(
      house.get('landlord.name'),
      'David',
      'belongsTo does not change if RD did not notify'
    );
  });

  test('Record Data custom belongsTo', async function(assert) {
    assert.expect(4);
    let { owner } = this;

    let belongsToReturnValue = { data: { id: '1', type: 'person' } };

    class RelationshipRecordData extends TestRecordData {
      constructor(storeWrapper) {
        super();
        this._storeWrapper = storeWrapper;
      }

      getBelongsTo(key: string) {
        assert.equal(key, 'landlord', 'Passed correct key to getBelongsTo');
        return belongsToReturnValue;
      }

      setDirtyBelongsTo(key: string, recordData: this | null) {
        belongsToReturnValue = { data: { id: '3', type: 'person' } };
        this._storeWrapper.notifyBelongsToChange('house', '1', null, 'landlord');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RelationshipRecordData(storeWrapper);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [davidHash, runspiredHash, igorHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    assert.equal(house.get('landlord.name'), 'David', 'belongsTo get correctly looked up');

    let runspired = store.peekRecord('person', '2');
    house.set('landlord', runspired);

    // This is intentionally !== runspired to test the custom RD implementation
    assert.equal(house.get('landlord.name'), 'Igor', 'RecordData sets the custom belongsTo value');
  });

  test('Record Data controls hasMany notifications', async function(assert) {
    assert.expect(10);
    let called = 0;
    let createCalled = 0;

    let { owner } = this;

    let calledAddToHasMany = 0;
    let calledRemoveFromHasMany = 0;
    let hasManyReturnValue = { data: [{ id: '1', type: 'person' }] };

    class RelationshipRecordData extends TestRecordData {
      constructor(storeWrapper) {
        super();
        this._storeWrapper = storeWrapper;
      }

      getHasMany(key: string) {
        return hasManyReturnValue;
      }

      // TODO: investigate addToHasMany being called during unloading
      // Use correct interface once imports have been fix
      addToHasMany(key: string, recordDatas: any[], idx?: number) {
        // dealing with getting called during unload
        if (calledAddToHasMany === 1) {
          return;
        }
        assert.equal(key, 'tenants', 'Passed correct key to addToHasMany');
        assert.equal(recordDatas[0].id, '2', 'Passed correct RD to addToHasMany');
        calledAddToHasMany++;
      }

      removeFromHasMany(key: string, recordDatas: any[]) {
        // dealing with getting called during unload
        if (calledRemoveFromHasMany === 1) {
          return;
        }
        assert.equal(key, 'tenants', 'Passed correct key to removeFromHasMany');
        assert.equal(recordDatas[0].id, '1', 'Passed correct RD to removeFromHasMany');
        calledRemoveFromHasMany++;
      }

      setDirtyHasMany(key: string, recordDatas: any[]) {
        assert.equal(key, 'tenants', 'Passed correct key to addToHasMany');
        assert.equal(recordDatas[0].id, '3', 'Passed correct RD to addToHasMany');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RelationshipRecordData(storeWrapper);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [davidHash, runspiredHash, igorHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    let people = house.get('tenants');
    let david = store.peekRecord('person', '1');
    let runspired = store.peekRecord('person', '2');
    let igor = store.peekRecord('person', '3');

    assert.deepEqual(people.toArray(), [david], 'getHasMany correctly looked up');

    people.pushObject(runspired);
    assert.deepEqual(people.toArray(), [david], 'has many doesnt change if RD did not notify');

    people.removeObject(david);
    assert.deepEqual(
      people.toArray(),
      [david],
      'hasMany removal doesnt apply the change unless notified'
    );

    house.set('tenants', [igor]);
    assert.deepEqual(people.toArray(), [david], 'setDirtyHasMany doesnt apply unless notified');
  });

  test('Record Data supports custom hasMany handling', async function(assert) {
    assert.expect(10);
    let { owner } = this;

    let calledAddToHasMany = 0;
    let calledRemoveFromHasMany = 0;
    let calledSetDirtyHasMany = 0;
    let hasManyReturnValue = { data: [{ id: '1', type: 'person' }] };

    class RelationshipRecordData extends TestRecordData {
      constructor(storeWrapper) {
        super();
        this._storeWrapper = storeWrapper;
      }

      getHasMany(key: string) {
        return hasManyReturnValue;
      }

      // TODO: investigate addToHasMany being called during unloading
      addToHasMany(key: string, recordDatas: any[], idx?: number) {
        // dealing with getting called during unload
        if (calledAddToHasMany === 1) {
          return;
        }
        assert.equal(key, 'tenants', 'Passed correct key to addToHasMany');
        assert.equal(recordDatas[0].id, '2', 'Passed correct RD to addToHasMany');
        calledAddToHasMany++;

        hasManyReturnValue = { data: [{ id: '3', type: 'person' }, { id: '2', type: 'person' }] };
        this._storeWrapper.notifyHasManyChange('house', '1', null, 'tenants');
      }

      removeFromHasMany(key: string, recordDatas: any[]) {
        // dealing with getting called during unload
        if (calledRemoveFromHasMany === 1) {
          return;
        }
        assert.equal(key, 'tenants', 'Passed correct key to removeFromHasMany');
        assert.equal(recordDatas[0].id, '2', 'Passed correct RD to removeFromHasMany');
        calledRemoveFromHasMany++;
        hasManyReturnValue = { data: [{ id: '1', type: 'person' }] };
        this._storeWrapper.notifyHasManyChange('house', '1', null, 'tenants');
      }

      setDirtyHasMany(key: string, recordDatas: any[]) {
        assert.equal(key, 'tenants', 'Passed correct key to addToHasMany');
        assert.equal(recordDatas[0].id, '3', 'Passed correct RD to addToHasMany');
        hasManyReturnValue = { data: [{ id: '1', type: 'person' }, { id: '2', type: 'person' }] };
        this._storeWrapper.notifyHasManyChange('house', '1', null, 'tenants');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RelationshipRecordData(storeWrapper);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [davidHash, runspiredHash, igorHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    let people = house.get('tenants');
    let david = store.peekRecord('person', '1');
    let runspired = store.peekRecord('person', '2');
    let igor = store.peekRecord('person', '3');

    assert.deepEqual(people.toArray(), [david], 'getHasMany correctly looked up');
    people.pushObject(runspired);

    // This is intentionally !== [david, runspired] to test the custom RD implementation
    assert.deepEqual(people.toArray(), [igor, runspired], 'hasMany changes after notifying');

    people.removeObject(runspired);
    // This is intentionally !== [igor] to test the custom RD implementation
    assert.deepEqual(people.toArray(), [david], 'hasMany removal applies the change when notified');

    house.set('tenants', [igor]);
    // This is intentionally !== [igor] to test the custom RD implementation
    assert.deepEqual(people.toArray(), [david, runspired], 'setDirtyHasMany applies changes');
  });
});
