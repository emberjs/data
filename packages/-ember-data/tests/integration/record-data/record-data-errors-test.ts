import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import EmberObject from '@ember/object';
import { attr, hasMany, belongsTo } from '@ember-data/model';
import { InvalidError, ServerError } from '@ember-data/adapter/error';

interface RecordIdentifier {
  id?: string;
  type: string;
  lid: string;
}

interface JsonApiValidationError {
  title: string;
  detail: string;
  source: {
    pointer: string;
  }
}

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}

// TODO: this should work
// class TestRecordData implements RecordData
class TestRecordData {

  commitWasRejected(recordIdentifier: RecordIdentifier, errors?: JsonApiValidationError[]): void {

  }

  getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[] {
    return [];
  }

  // Use correct interface once imports have been fix
  _storeWrapper: any;

  pushData(data, calculateChange?: boolean) { }
  clientDidCreate() { }

  willCommit() { }

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

  isNew() {
    return false;
  }

  isDeleted() {
    return false;
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

module('integration/record-data - Custom RecordData Errors', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('service:store', CustomStore);
  });

  test("Record Data invalid errors", async function (assert) {
    assert.expect(2);
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

    class LifecycleRecordData extends TestRecordData {
      commitWasRejected(recordIdentifier, errors) {
        assert.equal(errors[0].detail, 'is a generally unsavoury character', 'received the error');
        assert.equal(errors[0].source.pointer, '/data/attributes/name', 'pointer is correct');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData();
      }
    });

    let TestAdapter = EmberObject.extend({
      updateRecord() {
        return Promise.reject(new InvalidError([
          {
            title: 'Invalid Attribute',
            detail: 'is a generally unsavoury character',
            source: {
              pointer: '/data/attributes/name',
            },
          },
        ]));
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
    let person = store.peekRecord('person', '1');
    person.save().then(() => { }, (err) => {
    });
  });

  test("Record Data adapter errors", async function (assert) {
    assert.expect(1);
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      }
    }
    let { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      commitWasRejected(recordIdentifier, errors) {
        assert.equal(errors, undefined, 'Did not pass adapter errors');
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData();
      }
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
      data: [personHash]
    });
    let person = store.peekRecord('person', '1');
    await person.save().then(() => { }, (err) => {
    });
  });

  test("Getting errors from Record Data shows up on the record igor4", async function (assert) {
    assert.expect(7);
    let storeWrapper;
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
        lastName: 'something',
      }
    }
    let { owner } = this;
    let errorsToReturn = [{
      title: 'Invalid Attribute',
      detail: '',
      source: {
        pointer: '/data/attributes/name',
      },
    }];

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
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        return new LifecycleRecordData(storeWrapper);
      }
    });

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [personHash]
    });
    let person = store.peekRecord('person', '1');
    let nameError = person.get('errors').errorsFor('name').get('firstObject');
    assert.equal(nameError.attribute, 'name', 'error shows up on name');
    assert.equal(person.get('isValid'), false, 'person is not valid');
    errorsToReturn = []; 
    storeWrapper.notifyErrorsChange('person', '1');
    assert.equal(person.get('isValid'), true, 'person is valid');
    assert.equal(person.get('errors').errorsFor('name').length, 0, 'no errors on name');
    errorsToReturn =  [{
      title: 'Invalid Attribute',
      detail: '',
      source: {
        pointer: '/data/attributes/lastName',
      },
    }]; 
    storeWrapper.notifyErrorsChange('person', '1');
    assert.equal(person.get('isValid'), false, 'person is valid');
    assert.equal(person.get('errors').errorsFor('name').length, 0, 'no errors on name');
    let lastNameError = person.get('errors').errorsFor('lastName').get('firstObject');
    assert.equal(lastNameError.attribute, 'lastName', 'error shows up on lastName');
  });
});
