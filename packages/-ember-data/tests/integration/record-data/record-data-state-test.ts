import EmberObject from '@ember/object';
import Ember from 'ember';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import type { NewRecordIdentifier, RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import { JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';

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
  _errors: JsonApiValidationError[] = [];
  getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[] {
    return this._errors;
  }
  commitWasRejected(identifier: StableRecordIdentifier, errors: JsonApiValidationError[]): void {
    this._errors = errors;
  }

  getResourceIdentifier() {
    if (this.clientId !== null) {
      return new TestRecordIdentifier(this.id, this.clientId, this.modelName);
    }
  }

  // Use correct interface once imports have been fix
  _storeWrapper: any;

  pushData(data: object, calculateChange: true): string[];
  pushData(data: object, calculateChange?: false): void;
  pushData(data: object, calculateChange?: boolean): string[] | void {}

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
  removeFromInverseRelationships() {}

  _initRecordCreateOptions(options) {
    return {};
  }
}

let CustomStore = Store.extend({
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    return new TestRecordData();
  },
});

module('integration/record-data - Record Data State', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.unregister('service:store');
    owner.register('service:store', CustomStore);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test('Record Data state saving', async function (assert) {
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
    assert.true(calledCreate, 'called create if record isNew');

    isNew = false;
    isDeleted = true;
    await person.save();
    assert.true(calledDelete, 'called delete if record isDeleted');

    isNew = false;
    isDeleted = false;

    await person.save();
    assert.true(calledUpdate, 'called update if record isnt deleted or new');
  });

  test('Record Data state record flags', async function (assert) {
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
    assert.true(person.get('isNew'), 'person is new');

    isNew = false;
    isDeleted = true;
    storeWrapper.notifyStateChange('person', '1', null, 'isDeleted');
    storeWrapper.notifyStateChange('person', '1', null, 'isNew');

    assert.false(person.get('isNew'), 'person is not new');
    assert.true(person.get('isDeleted'), 'person is deleted');

    isNew = false;
    isDeleted = false;
    storeWrapper.notifyStateChange('person', '1', null, 'isDeleted');
    assert.false(person.get('isNew'), 'person is not new');
    assert.false(person.get('isDeleted'), 'person is not deleted');

    person.deleteRecord();
    assert.false(person.get('isDeleted'), 'calling deleteRecord does not automatically set isDeleted flag to true');
    assert.true(calledSetIsDeleted, 'called setIsDeleted');

    assert.strictEqual(people.get('length'), 1, 'live array starting length is 1');
    isDeletionCommitted = true;
    Ember.run(() => {
      storeWrapper.notifyStateChange('person', '1', null, 'isDeletionCommitted');
    });
    assert.strictEqual(people.get('length'), 0, 'commiting a deletion updates the live array');
  });
});
