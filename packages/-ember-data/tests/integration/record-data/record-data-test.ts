import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { attr, belongsTo } from '@ember-decorators/data';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;
}

// TODO Make the class implement the RD interface
class TestRecordData {
  pushData(data, calculateChange?: boolean) { }
  clientDidCreate() { }

  willCommit() { }

  commitWasRejected() { }

  unloadRecord() { }
  rollbackAttributes() { }
  changedAttributes(): any { }

  hasChangedAttributes(): boolean {
    return false;
  }

  setDirtyAttribute(key: string, value: any) { }

  getAttr(key: string): string {
    return "test";
  }

  hasAttr(key: string): boolean {
    return false;
  }

  getHasMany(key: string) {
    return {};
  }

  addToHasMany(key: string, recordDatas: this[], idx?: number) { }
  removeFromHasMany(key: string, recordDatas: this[]) { }
  setDirtyHasMany(key: string, recordDatas: this[]) { }

  getBelongsTo(key: string) { }

  setDirtyBelongsTo(name: string, recordData: this | null) { }

  didCommit(data) { }

  isAttrDirty(key: string) { return false; }
  removeFromInverseRelationships(isNew: boolean) { }

  _initRecordCreateOptions(options) { }
}

let CustomStore = Store.extend({
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    return new TestRecordData();
  }
});

module('integration/record-data - Custom RecordData Implementations', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('service:store', CustomStore);
  });

  test("A RecordData implementation that has the required spec methods should not error out", async function (assert) {
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

  test("Record Data push, create and save lifecycle", async function (assert) {
    assert.expect(17);
    let called = 0;
    let createCalled = 0;
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      }
    }
    let { owner } = this;
    let calledPush = 0
    let calledClientDidCreate = 0;
    let calledWillCommit = 0;
    let calledWasRejected = 0;
    let calledUnloadRecord = 0;
    let calledRollbackAttributes = 0;
    let calledDidCommit = 0;

    class LifecycleRecordData extends TestRecordData {
      pushData(data, calculateChange?: boolean) {
        calledPush++;
      }

      clientDidCreate() {
        calledClientDidCreate++;
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
      }
    }


    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData();
      }
    });

    let TestAdapter = Ember.Object.extend({
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
      }
    });

    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store');

    store.push({
      data: [personHash]
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

  test("Record Data attribute settting", async function (assert) {
    assert.expect(11);
    let called = 0;
    let createCalled = 0;
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      }
    }

    let { owner } = this;
    let calledGet = 0

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
        return "new attribute";
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
      }
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [personHash]
    });

    let person = store.peekRecord('person', '1');
    assert.equal(person.get('name'), 'new attribute');
    person.set('name', 'new value');
    person.notifyPropertyChange('name');
    assert.equal(person.get('name'), 'new attribute');
    assert.equal(calledGet, 3, 'called getAttr after notifyPropertyChange');
    assert.deepEqual(person.changedAttributes(), { name: ['old', 'new'] }, 'changed attributes passes through RD value');
  });
});