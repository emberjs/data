import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import type { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/current-deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { ResourceBlob } from '@ember-data/types/cache/aliases';
import { Change } from '@ember-data/types/cache/change';
import {
  CollectionResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
  StructuredDocument,
} from '@ember-data/types/cache/document';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import type { Cache, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { DSModel } from '@ember-data/types/q/ds-model';
import type {
  CollectionResourceDocument,
  CollectionResourceRelationship,
  JsonApiDocument,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
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
  pushData(data: object, calculateChange?: boolean): string[] | void {
    this._storeWrapper.notifyChange(this._identifier, 'added');
  }

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
  patch(op: MergeOperation): void {
    throw new Error('Method not implemented.');
  }
  _data: Map<StableRecordIdentifier, object> = new Map();
  put<T extends SingleResourceDocument>(doc: StructuredDocument<T>): SingleResourceDataDocument;
  put<T extends CollectionResourceDocument>(doc: StructuredDocument<T>): CollectionResourceDataDocument;
  put<T extends ResourceMetaDocument | ResourceErrorDocument>(
    doc: StructuredDocument<T>
  ): ResourceMetaDocument | ResourceErrorDocument;
  put(doc: StructuredDocument<JsonApiDocument>): ResourceDocument {
    if ('content' in doc && !('error' in doc)) {
      if (Array.isArray(doc.content.data)) {
        const data = doc.content.data.map((data) => {
          const identifier = this._storeWrapper.identifierCache.getOrCreateRecordIdentifier(data);
          this.upsert(identifier, data, this._storeWrapper.hasRecord(identifier));
          return identifier;
        });
        return { data };
      } else {
        const identifier = this._storeWrapper.identifierCache.getOrCreateRecordIdentifier(
          doc.content.data as RecordIdentifier
        );
        this.upsert(identifier, doc.content.data as JsonApiResource, this._storeWrapper.hasRecord(identifier));
        return { data: identifier } as SingleResourceDataDocument;
      }
    } else if ('error' in doc) {
      throw typeof doc.error === 'string' ? new Error(doc.error) : doc.error;
    }
    throw new Error('Not Implemented');
  }

  peek(identifier: StableRecordIdentifier): ResourceBlob | null;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;
  peek(identifier: StableDocumentIdentifier | StableRecordIdentifier): ResourceBlob | ResourceDocument | null {
    throw new Error(`Not Implemented`);
  }
  peekRequest<T>(identifier: StableDocumentIdentifier): StructuredDocument<T> | null {
    throw new Error(`Not Implemented`);
  }
  fork(): Promise<Cache> {
    throw new Error(`Not Implemented`);
  }
  merge(cache: Cache): Promise<void> {
    throw new Error(`Not Implemented`);
  }
  diff(): Promise<Change[]> {
    throw new Error(`Not Implemented`);
  }
  dump(): Promise<ReadableStream<unknown>> {
    throw new Error(`Not Implemented`);
  }
  hydrate(stream: ReadableStream<unknown>): Promise<void> {
    throw new Error('Not Implemented');
  }

  upsert(
    identifier: StableRecordIdentifier,
    data: JsonApiResource,
    calculateChanges?: boolean | undefined
  ): void | string[] {
    if (!this._data.has(identifier)) {
      this._storeWrapper.notifyChange(identifier, 'added');
    }
    this._data.set(identifier, data);
    this._storeWrapper.notifyChange(identifier, 'attributes');
    this._storeWrapper.notifyChange(identifier, 'relationships');
  }

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
  mutate(operation: LocalRelationshipOperation): void {
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

module('integration/record-data - Custom RecordData Implementations', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:house', House);
    owner.unregister('service:store');
    owner.register('service:store', CustomStore);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('A RecordData implementation that has the required spec methods should not error out', async function (assert) {
    const { owner } = this;
    const store: Store = owner.lookup('service:store') as Store;

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
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 6 });
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
    let calledUpsert = 0;
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
        if (DEPRECATE_V1_RECORD_DATA) {
          calledUpsert++;
        } else {
          throw new Error(`Unexpected pushData call`);
        }
      }

      upsert() {
        if (DEPRECATE_V1_RECORD_DATA) {
          throw new Error(`Unexpected upsert call`);
        }
        calledUpsert++;
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
      createCache(storeWrapper: CacheStoreWrapper) {
        // @ts-expect-error
        return new LifecycleRecordData(storeWrapper) as Cache;
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

    const store = owner.lookup('service:store') as Store;

    store.push({
      data: [personHash],
    });
    assert.strictEqual(calledUpsert, 1, 'Called upsert');

    let person = store.peekRecord('person', '1') as DSModel;
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

    calledUpsert = 0;
    calledClientDidCreate = 0;
    calledWillCommit = 0;
    calledWasRejected = 0;
    calledUnloadRecord = 0;
    calledRollbackAttributes = 0;
    calledDidCommit = 0;

    let clientPerson: DSModel = store.createRecord('person', { id: '2' }) as DSModel;
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
    assert.strictEqual(calledUpsert, 0, 'Did not call pushData');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 4 });
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

      createCache(storeWrapper: CacheStoreWrapper) {
        // @ts-expect-error
        return new AttributeRecordData(storeWrapper) as Cache;
      }
    }

    owner.register('service:store', TestStore);

    const store = owner.lookup('service:store') as Store;

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1') as DSModel;
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
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 2 });
    }
  });
});
