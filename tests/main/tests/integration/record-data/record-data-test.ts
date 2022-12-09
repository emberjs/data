import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import type { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import type { Cache, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import type { Dict } from '@ember-data/types/q/utils';

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;
}

class House extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @belongsTo('person', { async: false, inverse: null })
  landlord;

  @hasMany('person', { async: false, inverse: null })
  tenants;
}

// TODO: this should work
// class TestRecordData implements RecordDatav1
class V1TestRecordData {
  _storeWrapper: CacheStoreWrapper;
  _identifier: StableRecordIdentifier;

  constructor(wrapper: CacheStoreWrapper, identifier: StableRecordIdentifier) {
    this._storeWrapper = wrapper;
    this._identifier = identifier;
  }

  pushData(data: object, calculateChange: true): string[];
  pushData(data: object, calculateChange?: false): void;
  pushData(data: object, calculateChange?: boolean): string[] | void {}

  clientDidCreate() {}

  willCommit() {}

  _errors: JsonApiValidationError[] = [];
  getErrors(recordIdentifier: StableRecordIdentifier): JsonApiValidationError[] {
    return this._errors;
  }
  commitWasRejected(identifier: StableRecordIdentifier, errors: JsonApiValidationError[]): void {
    this._errors = errors;
  }

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

  getHasMany(key: string) {
    return {};
  }

  addToHasMany(key: string, recordDatas: this[], idx?: number) {}
  removeFromHasMany(key: string, recordDatas: this[]) {}
  setDirtyHasMany(key: string, recordDatas: this[]) {}

  getBelongsTo(key: string) {}

  setDirtyBelongsTo(name: string, recordData: this | null) {}

  didCommit(data) {}

  isDeletionCommitted() {
    return false;
  }

  _initRecordCreateOptions(options) {}
  isNew() {
    return false;
  }
  isDeleted() {
    return false;
  }
}

class V2TestRecordData implements Cache {
  version: '2' = '2';

  _errors?: JsonApiValidationError[];
  _isNew: boolean = false;
  _storeWrapper: CacheStoreWrapper;
  _identifier: StableRecordIdentifier;

  constructor(wrapper: CacheStoreWrapper, identifier: StableRecordIdentifier) {
    this._storeWrapper = wrapper;
    this._identifier = identifier;
  }
  sync(op: MergeOperation): void {
    throw new Error('Method not implemented.');
  }
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
    return [];
  }
  getRelationship(
    identifier: StableRecordIdentifier,
    propertyName: string
  ): SingleResourceRelationship | CollectionResourceRelationship {
    throw new Error('Method not implemented.');
  }
  update(operation: LocalRelationshipOperation): void {
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

const TestRecordData: typeof V2TestRecordData | typeof V1TestRecordData = !DEPRECATE_V1_RECORD_DATA
  ? V2TestRecordData
  : V1TestRecordData;

class CustomStore extends Store {
  // @ts-expect-error
  createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
    return new TestRecordData(storeWrapper, identifier);
  }
}

let houseHash, davidHash, runspiredHash, igorHash;

module('integration/record-data - Custom RecordData Implementations', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
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
    owner.unregister('service:store');
    owner.register('service:store', CustomStore);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('A RecordData implementation that has the required spec methods should not error out', async function (assert) {
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
    assert.strictEqual(all.length, 2, 'we have 2 records');

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

    assert.strictEqual(all.length, 3, 'we have 3 records');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 3 });
    }
  });

  test('Record Data push, create and save lifecycle', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 20 : 19);
    let called = 0;
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
      pushData(data: object, calculateChange: true): string[];
      pushData(data: object, calculateChange?: false): void;
      pushData(data: object, calculateChange?: boolean): string[] | void {
        calledPush++;
      }

      clientDidCreate() {
        calledClientDidCreate++;
        isNew = true;
      }

      willCommit() {
        calledWillCommit++;
      }

      commitWasRejected(identifier, errors) {
        super.commitWasRejected(identifier, errors);
        calledWasRejected++;
      }

      unloadRecord() {
        calledUnloadRecord++;
      }

      rollbackAttrs() {
        calledRollbackAttributes++;
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

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        return new LifecycleRecordData(storeWrapper, identifier);
      }
    }

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
    assert.strictEqual(calledPush, 1, 'Called pushData');

    let person = store.peekRecord('person', '1');
    person.save();
    assert.strictEqual(calledWillCommit, 1, 'Called willCommit');

    await settled();
    assert.strictEqual(calledDidCommit, 1, 'Called didCommit');

    let promise = person.save();
    assert.strictEqual(calledWillCommit, 2, 'Called willCommit');

    await promise.catch((_e) => assert.ok(true, 'we erred'));

    assert.strictEqual(calledDidCommit, 1, 'Did not call didCommit again');
    assert.strictEqual(calledWasRejected, 1, 'Called commitWasRejected');

    person.rollbackAttributes();
    assert.strictEqual(calledRollbackAttributes, 1, 'Called rollbackAttributes');

    person.unloadRecord();
    assert.strictEqual(calledUnloadRecord, 1, 'Called unloadRecord');

    await settled();
    assert.strictEqual(calledClientDidCreate, 0, 'Did not called clientDidCreate');

    calledPush = 0;
    calledClientDidCreate = 0;
    calledWillCommit = 0;
    calledWasRejected = 0;
    calledUnloadRecord = 0;
    calledRollbackAttributes = 0;
    calledDidCommit = 0;

    let clientPerson = store.createRecord('person', { id: '2' });
    assert.strictEqual(calledClientDidCreate, 1, 'Called clientDidCreate');

    clientPerson.save();
    assert.strictEqual(calledWillCommit, 1, 'Called willCommit');

    await settled();
    assert.strictEqual(calledDidCommit, 1, 'Called didCommit');

    promise = clientPerson.save();
    assert.strictEqual(calledWillCommit, 2, 'Called willCommit');

    await promise.catch((_e) => assert.ok('we erred'));
    assert.strictEqual(calledWasRejected, 1, 'Called commitWasRejected');
    assert.strictEqual(calledDidCommit, 1, 'Did not call didCommit again');

    clientPerson.unloadRecord();
    assert.strictEqual(calledUnloadRecord, 1, 'Called unloadRecord');

    await settled();
    assert.strictEqual(calledPush, 0, 'Did not call pushData');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 2 });
    }
  });

  test('Record Data attribute setting', async function (assert) {
    let expectedCount = DEPRECATE_V1_RECORD_DATA ? 14 : 13;
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

      changedAttrs(): any {
        return { name: ['old', 'new'] };
      }

      hasChangedAttrs(): boolean {
        return false;
      }

      setAttr(identifier: StableRecordIdentifier, key: string, value: any) {
        assert.strictEqual(key, 'name', 'key passed to setDirtyAttribute');
        assert.strictEqual(value, 'new value', 'value passed to setDirtyAttribute');
      }

      setDirtyAttribute(key: string, value: any) {
        assert.strictEqual(key, 'name', 'key passed to setDirtyAttribute');
        assert.strictEqual(value, 'new value', 'value passed to setDirtyAttribute');
      }

      getAttr(identifier: StableRecordIdentifier, key: string): string {
        calledGet++;
        if (!DEPRECATE_V1_RECORD_DATA) {
          assert.strictEqual(key, 'name', 'key passed to getAttr');
        } else {
          assert.strictEqual(identifier as unknown as string, 'name', 'key passed to getAttr');
        }
        return 'new attribute';
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        return new AttributeRecordData(storeWrapper, identifier);
      }
    }

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1');
    assert.strictEqual(person.name, 'new attribute');
    assert.strictEqual(calledGet, 1, 'called getAttr for initial get');
    person.set('name', 'new value');
    assert.strictEqual(calledGet, 2, 'called getAttr during set');
    assert.strictEqual(person.name, 'new value');
    assert.strictEqual(calledGet, 2, 'did not call getAttr after set');
    person.notifyPropertyChange('name');
    assert.strictEqual(person.name, 'new attribute');
    assert.strictEqual(calledGet, 3, 'called getAttr after notifyPropertyChange');
    assert.deepEqual(
      person.changedAttributes(),
      { name: ['old', 'new'] },
      'changed attributes passes through RD value'
    );
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

  test('Record Data controls belongsTo notifications', async function (assert) {
    assert.expect(7);

    let { owner } = this;
    let belongsToReturnValue;

    class RelationshipRecordData extends TestRecordData {
      getBelongsTo(key: string) {
        assert.strictEqual(key, 'landlord', 'Passed correct key to getBelongsTo');
        return belongsToReturnValue;
      }

      getRelationship(identifier: StableRecordIdentifier, key: string) {
        assert.strictEqual(key, 'landlord', 'Passed correct key to getBelongsTo');
        return belongsToReturnValue;
      }

      // Use correct interface once imports have been fix
      setDirtyBelongsTo(key: string, recordData: any) {
        assert.strictEqual(key, 'landlord', 'Passed correct key to setBelongsTo');
        assert.strictEqual(recordData.getResourceIdentifier().id, '2', 'Passed correct RD to setBelongsTo');
      }

      update(operation: LocalRelationshipOperation) {
        assert.strictEqual(operation.op, 'replaceRelatedRecord', 'Passed correct op to update');
        assert.strictEqual(operation.field, 'landlord', 'Passed correct key to update');
        assert.strictEqual(
          operation.value ? (operation.value as StableRecordIdentifier).id : null,
          '2',
          'Passed correct Identifier to update'
        );
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RelationshipRecordData(storeWrapper, identifier);
        } else {
          return super.createRecordDataFor(identifier, storeWrapper);
        }
      }
    }

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');
    belongsToReturnValue = { data: store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' }) };

    store.push({
      data: [davidHash, runspiredHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    let runspired = store.peekRecord('person', '2');
    assert.strictEqual(house.landlord.name, 'David', 'belongsTo get correctly looked up');

    house.set('landlord', runspired);
    assert.strictEqual(house.landlord.name, 'David', 'belongsTo does not change if RD did not notify');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

  test('Record Data custom belongsTo', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 5 : 4);
    let { owner } = this;

    let belongsToReturnValue;

    let RelationshipRecordData;
    if (!DEPRECATE_V1_RECORD_DATA) {
      RelationshipRecordData = class extends TestRecordData {
        getRelationship(identifier: StableRecordIdentifier, key: string) {
          assert.strictEqual(key, 'landlord', 'Passed correct key to getBelongsTo');
          return belongsToReturnValue;
        }

        update(this: V2TestRecordData, operation: LocalRelationshipOperation) {
          belongsToReturnValue = {
            data: store.identifierCache.getOrCreateRecordIdentifier({ id: '3', type: 'person' }),
          };
          this._storeWrapper.notifyChange(this._identifier, 'relationships', 'landlord');
        }
      };
    } else {
      RelationshipRecordData = class extends TestRecordData {
        getBelongsTo(key: string) {
          assert.strictEqual(key, 'landlord', 'Passed correct key to getBelongsTo');
          return belongsToReturnValue;
        }

        setDirtyBelongsTo(this: V1TestRecordData, key: string, recordData: this | null) {
          belongsToReturnValue = {
            data: store.identifierCache.getOrCreateRecordIdentifier({ id: '3', type: 'person' }),
          };
          this._storeWrapper.notifyChange(this._identifier, 'relationships', 'landlord');
        }
      };
    }
    class TestStore extends Store {
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RelationshipRecordData(storeWrapper, identifier);
        } else {
          return super.createRecordDataFor(identifier, storeWrapper);
        }
      }
    }

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');
    belongsToReturnValue = { data: store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' }) };

    store.push({
      data: [davidHash, runspiredHash, igorHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    assert.strictEqual(house.landlord.name, 'David', 'belongsTo get correctly looked up');

    let runspired = store.peekRecord('person', '2');
    house.set('landlord', runspired);

    // This is intentionally !== runspired to test the custom RD implementation
    assert.strictEqual(house.landlord.name, 'Igor', 'RecordData sets the custom belongsTo value');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

  test('Record Data controls hasMany notifications', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 12 : 11);

    let { owner } = this;

    let hasManyReturnValue;
    let notifier, houseIdentifier;
    class RelationshipRecordData extends TestRecordData {
      getHasMany(key: string) {
        return hasManyReturnValue;
      }
      getRelationship() {
        return hasManyReturnValue;
      }
      addToHasMany(key: string, recordDatas: any[], idx?: number) {
        if (!DEPRECATE_V1_RECORD_DATA) {
          throw new Error('should not have called addToHasMany in v2');
        } else {
          assert.strictEqual(key, 'tenants', 'Passed correct key to addToHasMany');
          assert.strictEqual(recordDatas[0].getResourceIdentifier().id, '2', 'Passed correct RD to addToHasMany');
        }
      }
      removeFromHasMany(key: string, recordDatas: any[]) {
        if (!DEPRECATE_V1_RECORD_DATA) {
          throw new Error('should not have called removeFromHasMany in v2');
        } else {
          assert.strictEqual(key, 'tenants', 'Passed correct key to removeFromHasMany');
          assert.strictEqual(recordDatas[0].getResourceIdentifier().id, '1', 'Passed correct RD to removeFromHasMany');
        }
      }
      setDirtyHasMany(key: string, recordDatas: any[]) {
        assert.strictEqual(key, 'tenants', 'Passed correct key to addToHasMany');
        assert.strictEqual(recordDatas[0].getResourceIdentifier().id, '3', 'Passed correct RD to addToHasMany');
      }
      update(operation: LocalRelationshipOperation) {
        if (operation.op === 'addToRelatedRecords') {
          assert.strictEqual(operation.field, 'tenants');
          assert.deepEqual(
            (operation.value as StableRecordIdentifier[]).map((r) => r.id),
            ['2']
          );
        } else if (operation.op === 'removeFromRelatedRecords') {
          assert.strictEqual(operation.field, 'tenants');
          assert.deepEqual(
            (operation.value as StableRecordIdentifier[]).map((r) => r.id),
            ['1']
          );
        } else if (operation.op === 'replaceRelatedRecords') {
          assert.strictEqual(operation.field, 'tenants', 'Passed correct key to addToHasMany');
          assert.strictEqual(operation.value[0].id, '3', 'Passed correct RD to addToHasMany');
        } else {
          throw new Error(`operation ${operation.op} not implemented in test yet`);
        }
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          notifier = storeWrapper;
          houseIdentifier = identifier;
          return new RelationshipRecordData(storeWrapper, identifier);
        } else {
          return super.createRecordDataFor(identifier, storeWrapper);
        }
      }
    }

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');
    hasManyReturnValue = { data: [store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' })] };

    store.push({
      data: [davidHash, runspiredHash, igorHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    let people = house.tenants;
    let david = store.peekRecord('person', '1');
    let runspired = store.peekRecord('person', '2');
    let igor = store.peekRecord('person', '3');

    assert.deepEqual(people.slice(), [david], 'initial lookup is correct');

    people.push(runspired);
    assert.deepEqual(people.slice(), [david, runspired], 'push applies the change locally');

    people.splice(people.indexOf(david), 1);
    assert.deepEqual(people.slice(), [runspired], 'splice applies the change locally');

    house.tenants = [igor];
    assert.deepEqual(people.slice(), [igor], 'replace applies the change locally');

    notifier.notifyChange(houseIdentifier, 'relationships', 'tenants');
    await settled();
    assert.deepEqual(people.slice(), [david], 'final lookup is correct once notified');

    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

  test('Record Data supports custom hasMany handling', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 11 : 10);
    let { owner } = this;

    let hasManyReturnValue;
    class RelationshipRecordData extends TestRecordData {
      getHasMany(key: string) {
        return hasManyReturnValue;
      }
      getRelationship() {
        return hasManyReturnValue;
      }

      addToHasMany(this: V1TestRecordData, key: string, recordDatas: any[], idx?: number) {
        if (!DEPRECATE_V1_RECORD_DATA) {
          throw new Error('should not have called addToHasMany in v2');
        } else {
          assert.strictEqual(key, 'tenants', 'Passed correct key to addToHasMany');
          assert.strictEqual(recordDatas[0].getResourceIdentifier().id, '2', 'Passed correct RD to addToHasMany');
        }

        hasManyReturnValue = {
          data: [
            store.identifierCache.getOrCreateRecordIdentifier({ id: '3', type: 'person' }),
            store.identifierCache.getOrCreateRecordIdentifier({ id: '2', type: 'person' }),
          ],
        };
        this._storeWrapper.notifyChange(this._identifier, 'relationships', 'tenants');
      }

      removeFromHasMany(this: V1TestRecordData, key: string, recordDatas: any[]) {
        if (!DEPRECATE_V1_RECORD_DATA) {
          throw new Error('should not have called removeFromHasMany in v2');
        } else {
          assert.strictEqual(key, 'tenants', 'Passed correct key to removeFromHasMany');
          assert.strictEqual(recordDatas[0].getResourceIdentifier().id, '2', 'Passed correct RD to removeFromHasMany');
        }
        hasManyReturnValue = { data: [store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' })] };
        this._storeWrapper.notifyChange(this._identifier, 'relationships', 'tenants');
      }

      setDirtyHasMany(this: V1TestRecordData, key: string, recordDatas: any[]) {
        assert.strictEqual(key, 'tenants', 'Passed correct key to addToHasMany');
        assert.strictEqual(recordDatas[0].getResourceIdentifier().id, '3', 'Passed correct RD to addToHasMany');
        hasManyReturnValue = {
          data: [
            store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' }),
            store.identifierCache.getOrCreateRecordIdentifier({ id: '2', type: 'person' }),
          ],
        };
        this._storeWrapper.notifyChange(this._identifier, 'relationships', 'tenants');
      }

      update(this: V2TestRecordData, operation: LocalRelationshipOperation) {
        if (operation.op === 'addToRelatedRecords') {
          hasManyReturnValue = {
            data: [
              store.identifierCache.getOrCreateRecordIdentifier({ id: '3', type: 'person' }),
              store.identifierCache.getOrCreateRecordIdentifier({ id: '2', type: 'person' }),
            ],
          };
          assert.strictEqual(operation.field, 'tenants', 'correct field for addToRelatedRecords');
          assert.deepEqual(
            (operation.value as StableRecordIdentifier[]).map((r) => r.id),
            ['2'],
            'correct ids passed'
          );
        } else if (operation.op === 'removeFromRelatedRecords') {
          assert.strictEqual(operation.field, 'tenants', 'correct field for removeFromRelatedRecords');
          assert.deepEqual(
            (operation.value as StableRecordIdentifier[]).map((r) => r.id),
            ['2'],
            'correct ids passed'
          );
          hasManyReturnValue = {
            data: [store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' })],
          };
        } else if (operation.op === 'replaceRelatedRecords') {
          assert.strictEqual(operation.field, 'tenants', 'Passed correct key to addToHasMany');
          assert.strictEqual(operation.value[0].id, '3', 'Passed correct RD to addToHasMany');
          hasManyReturnValue = {
            data: [
              store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' }),
              store.identifierCache.getOrCreateRecordIdentifier({ id: '2', type: 'person' }),
            ],
          };
        } else {
          throw new Error(`operation ${operation.op} not implemented in test yet`);
        }
        this._storeWrapper.notifyChange(this._identifier, 'relationships', 'tenants');
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RelationshipRecordData(storeWrapper, identifier);
        } else {
          return super.createRecordDataFor(identifier, storeWrapper);
        }
      }
    }

    owner.register('service:store', TestStore);

    store = owner.lookup('service:store');
    hasManyReturnValue = { data: [store.identifierCache.getOrCreateRecordIdentifier({ id: '1', type: 'person' })] };

    store.push({
      data: [davidHash, runspiredHash, igorHash],
    });

    store.push({
      data: [houseHash],
    });

    let house = store.peekRecord('house', '1');
    let people = house.tenants;
    let david = store.peekRecord('person', '1');
    let runspired = store.peekRecord('person', '2');
    let igor = store.peekRecord('person', '3');

    assert.deepEqual(people.slice(), [david], 'getHasMany correctly looked up');
    people.push(runspired);

    // This is intentionally !== [david, runspired] to test the custom RD implementation
    assert.deepEqual(people.slice(), [igor, runspired], 'hasMany changes after notifying');

    people.splice(people.indexOf(runspired), 1);
    // This is intentionally !== [igor] to test the custom RD implementation
    assert.deepEqual(people.slice(), [david], 'hasMany removal applies the change when notified');

    house.set('tenants', [igor]);
    // This is intentionally !== [igor] to test the custom RD implementation
    assert.deepEqual(people.slice(), [david, runspired], 'setDirtyHasMany applies changes');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });
});
