import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store, { recordIdentifierFor } from '@ember-data/store';
import type { NewRecordIdentifier, RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordData, RecordDataV1 } from '@ember-data/types/q/record-data';
import type { JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import type { RecordDataStoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';

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

class TestRecordData implements RecordDataV1 {
  setIsDeleted(isDeleted: boolean): void {
    throw new Error('Method not implemented.');
  }
  version?: '1' | undefined = '1';
  isDeletionCommitted(): boolean {
    return false;
  }
  id: string | null = '1';
  clientId: string | null = 'test-record-data-1';
  modelName = 'tst';

  getResourceIdentifier() {
    if (this.clientId !== null) {
      return new TestRecordIdentifier(this.id, this.clientId, this.modelName);
    }
  }

  _errors: JsonApiValidationError[] = [];
  getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[] {
    return this._errors;
  }
  commitWasRejected(identifier: StableRecordIdentifier, errors: JsonApiValidationError[]): void {
    this._errors = errors;
  }

  // Use correct interface once imports have been fix
  _storeWrapper: any;

  pushData(data: object, calculateChange: true): string[];
  pushData(data: object, calculateChange?: false): void;
  pushData(data: object, calculateChange?: boolean): string[] | void {}

  clientDidCreate() {}

  willCommit() {}

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

  getHasMany(key: string) {
    return {};
  }

  isRecordInUse(): boolean {
    return true;
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

  _initRecordCreateOptions(options) {
    return {};
  }
}

let CustomStore = Store.extend({
  createRecordDataFor(identifier: StableRecordIdentifier, wrapper: RecordDataStoreWrapper) {
    return new TestRecordData();
  },
});

module('integration/record-data - Custom RecordData Errors', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.unregister('service:store');
    owner.register('service:store', CustomStore);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test('Record Data invalid errors', async function (assert) {
    assert.expect(2);

    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    let { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      commitWasRejected(recordIdentifier, errors) {
        super.commitWasRejected(recordIdentifier, errors);
        assert.strictEqual(errors[0].detail, 'is a generally unsavoury character', 'received the error');
        assert.strictEqual(errors[0].source.pointer, '/data/attributes/name', 'pointer is correct');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: RecordDataStoreWrapper) {
        return new LifecycleRecordData();
      },
    });

    let TestAdapter = EmberObject.extend({
      updateRecord() {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'is a generally unsavoury character',
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
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
    let person = store.peekRecord('person', '1');
    person.save().then(
      () => {},
      (err) => {}
    );
  });

  test('Record Data adapter errors', async function (assert) {
    assert.expect(1);
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    let { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      commitWasRejected(recordIdentifier, errors) {
        super.commitWasRejected(recordIdentifier, errors);
        assert.strictEqual(errors, undefined, 'Did not pass adapter errors');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: RecordDataStoreWrapper) {
        return new LifecycleRecordData();
      },
    });

    let TestAdapter = EmberObject.extend({
      updateRecord() {
        return Promise.reject();
      },
    });

    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });
    let person = store.peekRecord('person', '1');
    await person.save().then(
      () => {},
      (err) => {}
    );
  });

  test('Getting errors from Record Data shows up on the record', async function (assert) {
    assert.expect(7);
    let storeWrapper;
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
        lastName: 'something',
      },
    };
    let { owner } = this;
    let errorsToReturn = [
      {
        title: 'Invalid Attribute',
        detail: '',
        source: {
          pointer: '/data/attributes/name',
        },
      },
    ];

    class LifecycleRecordData extends TestRecordData {
      constructor(sw) {
        super();
        storeWrapper = sw;
      }

      getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[] {
        return errorsToReturn;
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: RecordDataStoreWrapper) {
        return new LifecycleRecordData(wrapper);
      },
    });

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });
    let person = store.peekRecord('person', '1');
    const identifier = recordIdentifierFor(person);
    let nameError = person.errors.errorsFor('name').firstObject;
    assert.strictEqual(nameError.attribute, 'name', 'error shows up on name');
    assert.false(person.isValid, 'person is not valid');
    errorsToReturn = [];
    storeWrapper.notifyChange(identifier, 'errors');
    assert.true(person.isValid, 'person is valid');
    assert.strictEqual(person.errors.errorsFor('name').length, 0, 'no errors on name');
    errorsToReturn = [
      {
        title: 'Invalid Attribute',
        detail: '',
        source: {
          pointer: '/data/attributes/lastName',
        },
      },
    ];
    storeWrapper.notifyChange(identifier, 'errors');
    assert.false(person.isValid, 'person is valid');
    assert.strictEqual(person.errors.errorsFor('name').length, 0, 'no errors on name');
    let lastNameError = person.errors.errorsFor('lastName').firstObject;
    assert.strictEqual(lastNameError.attribute, 'lastName', 'error shows up on lastName');
  });
});
