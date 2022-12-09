import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import Model, { attr } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store, { recordIdentifierFor } from '@ember-data/store';
import type { Cache, CacheV1, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { CollectionResourceRelationship, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import type { NewRecordIdentifier, RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import { Dict } from '@ember-data/types/q/utils';

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

class V1TestRecordData implements CacheV1 {
  setIsDeleted(isDeleted: boolean): void {
    throw new Error('Method not implemented.');
  }
  version?: '1' | undefined;
  isDeletionCommitted(): boolean {
    throw new Error('Method not implemented.');
  }
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

  getHasMany(key: string) {
    return {};
  }

  isNew() {
    return false;
  }

  isDeleted() {
    return false;
  }

  addToHasMany(key: string, recordDatas: Cache[], idx?: number) {}
  removeFromHasMany(key: string, recordDatas: Cache[]) {}
  setDirtyHasMany(key: string, recordDatas: Cache[]) {}

  getBelongsTo(key: string) {
    return {};
  }

  setDirtyBelongsTo(name: string, recordData: Cache | null) {}

  didCommit(data) {}

  _initRecordCreateOptions(options) {
    return {};
  }
}
class V2TestRecordData implements Cache {
  sync(op: MergeOperation): void {
    throw new Error('Method not implemented.');
  }
  update(operation: LocalRelationshipOperation): void {
    throw new Error('Method not implemented.');
  }
  version: '2' = '2';

  _errors?: JsonApiValidationError[];
  _isNew: boolean = false;

  pushData(
    identifier: StableRecordIdentifier,
    data: JsonApiResource,
    calculateChanges?: boolean | undefined
  ): void | string[] {}
  clientDidCreate(identifier: StableRecordIdentifier, options?: Dict<unknown> | undefined): Dict<unknown> {
    this._isNew = true;
    return {};
  }
  willCommit(identifier: StableRecordIdentifier): void {}
  didCommit(identifier: StableRecordIdentifier, data: JsonApiResource | null): void {}
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[] | undefined): void {
    this._errors = errors;
  }
  unloadRecord(identifier: StableRecordIdentifier): void {}
  getAttr(identifier: StableRecordIdentifier, propertyName: string): unknown {
    return '';
  }
  setAttr(identifier: StableRecordIdentifier, propertyName: string, value: unknown): void {
    throw new Error('Method not implemented.');
  }
  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash {
    return {};
  }
  hasChangedAttrs(identifier: StableRecordIdentifier): boolean {
    return false;
  }
  rollbackAttrs(identifier: StableRecordIdentifier): string[] {
    throw new Error('Method not implemented.');
  }
  getRelationship(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): SingleResourceRelationship | CollectionResourceRelationship {
    throw new Error('Method not implemented.');
  }
  addToHasMany(
    identifier: StableRecordIdentifier,
    propertyName: string,
    value: StableRecordIdentifier[],
    idx?: number | undefined
  ): void {
    throw new Error('Method not implemented.');
  }
  removeFromHasMany(identifier: StableRecordIdentifier, propertyName: string, value: StableRecordIdentifier[]): void {
    throw new Error('Method not implemented.');
  }
  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void {
    throw new Error('Method not implemented.');
  }

  getErrors(identifier: StableRecordIdentifier): JsonApiValidationError[] {
    return this._errors || [];
  }
  isEmpty(identifier: StableRecordIdentifier): boolean {
    return false;
  }
  isNew(identifier: StableRecordIdentifier): boolean {
    return this._isNew;
  }
  isDeleted(identifier: StableRecordIdentifier): boolean {
    return false;
  }
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean {
    return false;
  }
}
const TestRecordData = DEPRECATE_V1_RECORD_DATA ? V1TestRecordData : V2TestRecordData;

class CustomStore extends Store {
  createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
    return new TestRecordData();
  }
}

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
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 4 : 3);

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

      setIsDeleted(): void {
        isDeleted = true;
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        return new LifecycleRecordData();
      }
    }

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
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

  test('Record Data state record flags', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 14 : 13);
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

      isEmpty(): boolean {
        return !isNew && isDeletionCommitted;
      }

      isNew(): boolean {
        return isNew;
      }

      isDeleted(): boolean {
        return isDeleted;
      }

      isDeletionCommitted(): boolean {
        return isDeletionCommitted;
      }

      setIsDeleted(value: boolean): void {
        isDeleted = true;
        calledSetIsDeleted = true;
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        return new LifecycleRecordData(wrapper);
      }
    }

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1');
    let personIdentifier = recordIdentifierFor(person);
    let people = store.peekAll('person');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');

    isNew = true;
    storeWrapper.notifyChange(personIdentifier, 'state');
    await settled();
    assert.true(person.isNew, 'person is new');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');

    isNew = false;
    isDeleted = true;
    storeWrapper.notifyChange(personIdentifier, 'state');
    await settled();
    assert.false(person.isNew, 'person is not new');
    assert.true(person.isDeleted, 'person is deleted');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');

    isNew = false;
    isDeleted = false;
    storeWrapper.notifyChange(personIdentifier, 'state');
    await settled();
    assert.false(person.isNew, 'person is not new');
    assert.false(person.isDeleted, 'person is not deleted');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');
    person.deleteRecord();
    await settled();
    assert.strictEqual(people.length, 1, 'live array starting length is 1 after deleteRecord');
    assert.false(person.isDeleted, 'calling deleteRecord does not automatically set isDeleted flag to true');
    assert.true(calledSetIsDeleted, 'called setIsDeleted');

    isDeletionCommitted = true;
    storeWrapper.notifyChange(personIdentifier, 'state');
    await settled();
    assert.strictEqual(people.length, 0, 'commiting a deletion updates the live array');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });
});
