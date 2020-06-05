import EmberObject from '@ember/object';
import Ember from 'ember';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import { RECORD_DATA_STATE } from '@ember-data/canary-features';
import { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

type RecordData = import('@ember-data/store/-private/ts-interfaces/record-data').RecordData;
type NewRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').NewRecordIdentifier;

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}

class TestRecordIdentifier implements NewRecordIdentifier {
  constructor(public id: string | null, public lid: string, public type: string) {}
}

class TestRecordData implements RecordData {
  id: string | null = '1';
  clientId: string | null = 'test-record-data-1';
  modelName = 'tst';

  getResourceIdentifier() {
    if (this.clientId !== null) {
      return new TestRecordIdentifier(this.id, this.clientId, this.modelName);
    }
  }

  commitWasRejected(): void {}

  // Use correct interface once imports have been fix
  _storeWrapper: any;

  pushData(data, calculateChange?: boolean) {}
  clientDidCreate() {}

  willCommit() {}

  isRecordInUse() {
    return false;
  }
  unloadRecord() {}
  rollbackAttributes() {
    return [];
  }
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

  isNew() {
    return false;
  }

  isDeleted() {
    return false;
  }

  addToHasMany(key: string, recordDatas: RecordData[], idx?: number) {}
  removeFromHasMany(key: string, recordDatas: RecordData[]) {}
  setDirtyHasMany(key: string, recordDatas: RecordData[]) {}

  getBelongsTo(key: string) {
    return {};
  }

  setDirtyBelongsTo(name: string, recordData: RecordData | null) {}

  didCommit(data) {}

  isAttrDirty(key: string) {
    return false;
  }
  removeFromInverseRelationships(isNew: boolean) {}

  _initRecordCreateOptions(options) {
    return {};
  }
}

let CustomStore = Store.extend({
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    return new TestRecordData();
  },
});

module('integration/record-data - Record Data State', function(hooks) {
  if (!RECORD_DATA_STATE) {
    return;
  }
  setupTest(hooks);

  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.unregister('service:store');
    owner.register('service:store', CustomStore);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test('Record Data state saving', async function(assert) {
    assert.expect(3);

    let isDeleted, isNew, isDeletionCommitted;
    let calledDelete = false;
    let calledUpdate = false;
    let calledCreate = false;

    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    let { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      isNew(): boolean {
        return isNew;
      }

      isDeleted(): boolean {
        return isDeleted;
      }

      isDeletionCommitted(): boolean {
        return isDeletionCommitted;
      }

      setIsDeleted(identifier, isDeleted): void {}
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData();
      },
    });

    let TestAdapter = EmberObject.extend({
      deleteRecord() {
        calledDelete = true;
        return Promise.resolve();
      },

      updateRecord() {
        calledUpdate = true;
        return Promise.resolve();
      },

      createRecord() {
        calledCreate = true;
        return Promise.resolve();
      },
    });

    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1');
    isNew = true;
    await person.save();
    assert.equal(calledCreate, true, 'called create if record isNew');

    isNew = false;
    isDeleted = true;
    await person.save();
    assert.equal(calledDelete, true, 'called delete if record isDeleted');

    isNew = false;
    isDeleted = false;

    await person.save();
    assert.equal(calledUpdate, true, 'called update if record isnt deleted or new');
  });

  test('Record Data state record flags', async function(assert) {
    assert.expect(9);
    let isDeleted, isNew, isDeletionCommitted;
    let calledSetIsDeleted = false;
    let storeWrapper;

    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    let { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      constructor(sw) {
        super();
        storeWrapper = sw;
      }

      isNew(): boolean {
        return isNew;
      }

      isDeleted(): boolean {
        return isDeleted;
      }

      isDeletionCommitted(identifier): boolean {
        return isDeletionCommitted;
      }

      setIsDeleted(identifier, isDeleted: boolean): void {
        calledSetIsDeleted = true;
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData(storeWrapper);
      },
    });

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1');
    let people = store.peekAll('person');
    isNew = true;

    storeWrapper.notifyStateChange('person', '1', null, 'isNew');
    assert.equal(person.get('isNew'), true, 'person is new');

    isNew = false;
    isDeleted = true;
    storeWrapper.notifyStateChange('person', '1', null, 'isDeleted');
    storeWrapper.notifyStateChange('person', '1', null, 'isNew');

    assert.equal(person.get('isNew'), false, 'person is not new');
    assert.equal(person.get('isDeleted'), true, 'person is deleted');

    isNew = false;
    isDeleted = false;
    storeWrapper.notifyStateChange('person', '1', null, 'isDeleted');
    assert.equal(person.get('isNew'), false, 'person is not new');
    assert.equal(person.get('isDeleted'), false, 'person is not deleted');

    person.deleteRecord();
    assert.equal(
      person.get('isDeleted'),
      false,
      'calling deleteRecord does not automatically set isDeleted flag to true'
    );
    assert.equal(calledSetIsDeleted, true, 'called setIsDeleted');

    assert.equal(people.get('length'), 1, 'live array starting length is 1');
    isDeletionCommitted = true;
    Ember.run(() => {
      storeWrapper.notifyStateChange('person', '1', null, 'isDeletionCommitted');
    });
    assert.equal(people.get('length'), 0, 'commiting a deletion updates the live array');
  });
});
