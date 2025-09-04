import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import Store from 'main-test-app/services/store';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { Cache, ChangedAttributesHash, RelationshipDiff } from '@warp-drive/core-types/cache';
import type { ResourceBlob } from '@warp-drive/core-types/cache/aliases';
import type { Change } from '@warp-drive/core-types/cache/change';
import type { MergeOperation } from '@warp-drive/core-types/cache/operations';
import type { CollectionRelationship, ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type { PersistedResourceKey, RequestKey, ResourceKey } from '@warp-drive/core-types/identifier';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { TypeFromInstanceOrString } from '@warp-drive/core-types/record';
import type {
  CollectionResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
} from '@warp-drive/core-types/spec/document';
import type { ApiError } from '@warp-drive/core-types/spec/error';
import type {
  CollectionResourceDocument,
  ExistingResourceObject,
  JsonApiDocument,
  SingleResourceDocument,
} from '@warp-drive/core-types/spec/json-api-raw';
import { Type } from '@warp-drive/core-types/symbols';

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  declare [Type]: 'person';
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

class TestCache implements Cache {
  version = '2' as const;

  _errors?: ApiError[];
  _isNew = false;
  _storeWrapper: CacheCapabilitiesManager;
  _identifier: ResourceKey;

  constructor(wrapper: CacheCapabilitiesManager, identifier: ResourceKey) {
    this._storeWrapper = wrapper;
    this._identifier = identifier;
  }
  changedRelationships(identifier: ResourceKey): Map<string, RelationshipDiff> {
    throw new Error('Method not implemented.');
  }
  hasChangedRelationships(identifier: ResourceKey): boolean {
    throw new Error('Method not implemented.');
  }
  rollbackRelationships(identifier: ResourceKey): string[] {
    throw new Error('Method not implemented.');
  }
  patch(op: MergeOperation): void {
    throw new Error('Method not implemented.');
  }
  _data: Map<ResourceKey, object> = new Map();
  put<T extends SingleResourceDocument>(doc: StructuredDocument<T>): SingleResourceDataDocument;
  put<T extends CollectionResourceDocument>(doc: StructuredDocument<T>): CollectionResourceDataDocument;
  put<T extends ResourceMetaDocument | ResourceErrorDocument>(
    doc: StructuredDocument<T>
  ): ResourceMetaDocument | ResourceErrorDocument;
  put(doc: StructuredDocument<JsonApiDocument>): ResourceDocument {
    if ('content' in doc && !('error' in doc)) {
      if (Array.isArray(doc.content.data)) {
        const data = doc.content.data.map((resource) => {
          const identifier = this._storeWrapper.cacheKeyManager.getOrCreateRecordIdentifier(
            resource
          ) as PersistedResourceKey;
          this.upsert(identifier, resource, this._storeWrapper.hasRecord(identifier));
          return identifier;
        });
        return { data };
      } else {
        const identifier = this._storeWrapper.cacheKeyManager.getOrCreateRecordIdentifier(
          doc.content.data as ExistingResourceObject
        );
        this.upsert(identifier, doc.content.data!, this._storeWrapper.hasRecord(identifier));
        return { data: identifier } as SingleResourceDataDocument;
      }
    } else if ('error' in doc) {
      throw typeof doc.error === 'string' ? new Error(doc.error) : (doc.error as Error);
    }
    throw new Error('Not Implemented');
  }

  peek(identifier: ResourceKey): ResourceBlob | null;
  peek(identifier: RequestKey): ResourceDocument | null;
  peek(identifier: RequestKey | ResourceKey): ResourceBlob | ResourceDocument | null {
    throw new Error(`Not Implemented`);
  }
  peekRemoteState<T = unknown>(identifier: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peekRemoteState(identifier: RequestKey): ResourceDocument | null;
  peekRemoteState<T = unknown>(identifier: unknown): T | ResourceDocument | null {
    throw new Error(`Not Implemented`);
  }
  peekRequest<T>(identifier: RequestKey): StructuredDocument<T> | null {
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

  upsert(identifier: ResourceKey, data: ExistingResourceObject, calculateChanges?: boolean): void | string[] {
    if (!this._data.has(identifier)) {
      this._storeWrapper.notifyChange(identifier, 'added', null);
    }
    this._data.set(identifier, data);
    this._storeWrapper.notifyChange(identifier, 'attributes', null);
    this._storeWrapper.notifyChange(identifier, 'relationships', null);
  }

  clientDidCreate(identifier: ResourceKey, options?: Record<string, unknown>): Record<string, unknown> {
    this._isNew = true;
    return {};
  }
  willCommit(identifier: ResourceKey): void {}

  didCommit(
    cacheKey: ResourceKey,
    result: StructuredDataDocument<SingleResourceDataDocument> | null
  ): SingleResourceDataDocument;
  didCommit(
    cacheKey: ResourceKey[],
    result: StructuredDataDocument<SingleResourceDataDocument> | null
  ): SingleResourceDataDocument;
  didCommit(
    cacheKey: ResourceKey[],
    result: StructuredDataDocument<CollectionResourceDataDocument> | null
  ): CollectionResourceDataDocument;
  didCommit(
    cacheKey: ResourceKey | ResourceKey[],
    result: StructuredDataDocument<SingleResourceDataDocument | CollectionResourceDataDocument> | null
  ): SingleResourceDataDocument | CollectionResourceDataDocument {
    return { data: cacheKey as PersistedResourceKey };
  }
  commitWasRejected(identifier: ResourceKey, errors?: ApiError[]): void {
    this._errors = errors;
  }
  unloadRecord(identifier: ResourceKey): void {}
  getAttr(identifier: ResourceKey, propertyName: string): string {
    return '';
  }
  getRemoteAttr(identifier: ResourceKey, field: string | string[]): Value | undefined {
    return '';
  }
  setAttr(identifier: ResourceKey, propertyName: string, value: unknown): void {
    throw new Error('Method not implemented.');
  }
  changedAttrs(identifier: ResourceKey): ChangedAttributesHash {
    return {};
  }
  hasChangedAttrs(identifier: ResourceKey): boolean {
    return false;
  }
  rollbackAttrs(identifier: ResourceKey): string[] {
    return [];
  }
  getRelationship(identifier: ResourceKey, propertyName: string): ResourceRelationship | CollectionRelationship {
    throw new Error('Method not implemented.');
  }
  getRemoteRelationship(
    identifier: ResourceKey,
    field: string,
    isCollection?: boolean
  ): ResourceRelationship | CollectionRelationship {
    throw new Error('Method not implemented.');
  }
  mutate(operation: LocalRelationshipOperation): void {
    throw new Error('Method not implemented.');
  }
  setIsDeleted(identifier: ResourceKey, isDeleted: boolean): void {
    throw new Error('Method not implemented.');
  }

  getErrors(identifier: ResourceKey): ApiError[] {
    return this._errors || [];
  }
  isEmpty(identifier: ResourceKey): boolean {
    return false;
  }
  isNew(identifier: ResourceKey): boolean {
    return this._isNew;
  }
  isDeleted(identifier: ResourceKey): boolean {
    return false;
  }
  isDeletionCommitted(identifier: ResourceKey): boolean {
    return false;
  }
}

module('integration/record-data - Custom Cache Implementations', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:house', House);
    // @ts-expect-error missing type

    owner.unregister('service:store');
    owner.register('service:store', Store);
    owner.register('adapter:application', class extends JSONAPIAdapter {});
    owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('A Cache implementation that has the required spec methods should not error out', async function (assert) {
    const { owner } = this;
    const store: Store = owner.lookup('service:store') as unknown as Store;

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

    const all = store.peekAll('person');
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
  });

  test('Record Data push, create and save lifecycle', async function (assert) {
    assert.expect(19);
    let called = 0;
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    const { owner } = this;
    let calledUpsert = 0;
    let calledClientDidCreate = 0;
    let calledWillCommit = 0;
    let calledWasRejected = 0;
    let calledUnloadRecord = 0;
    let calledRollbackAttributes = 0;
    let calledDidCommit = 0;
    let isNew = false;

    class LifecycleCache extends TestCache {
      override upsert() {
        calledUpsert++;
      }

      override clientDidCreate(identifier: ResourceKey, options?: Record<string, unknown>): Record<string, unknown> {
        calledClientDidCreate++;
        isNew = true;
        return {};
      }

      override willCommit() {
        calledWillCommit++;
      }

      override commitWasRejected(identifier: ResourceKey, errors: ApiError[] | undefined) {
        super.commitWasRejected(identifier, errors);
        calledWasRejected++;
      }

      override unloadRecord() {
        calledUnloadRecord++;
      }

      override rollbackAttrs() {
        calledRollbackAttributes++;
        return [];
      }
      rollbackAttributes() {
        calledRollbackAttributes++;
      }

      didCommit(
        cacheKey: ResourceKey,
        result: StructuredDataDocument<SingleResourceDataDocument> | null
      ): SingleResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey[],
        result: StructuredDataDocument<SingleResourceDataDocument> | null
      ): SingleResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey[],
        result: StructuredDataDocument<CollectionResourceDataDocument> | null
      ): CollectionResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey | ResourceKey[],
        result: StructuredDataDocument<CollectionResourceDataDocument | SingleResourceDataDocument> | null
      ): CollectionResourceDataDocument | SingleResourceDataDocument {
        calledDidCommit++;
        isNew = false;
        return { data: cacheKey as PersistedResourceKey };
      }

      override isNew() {
        return isNew;
      }
    }

    class TestStore extends Store {
      override createCache(storeWrapper: CacheCapabilitiesManager) {
        // @ts-expect-error
        return new LifecycleCache(storeWrapper) as Cache;
      }
    }

    const TestAdapter = EmberObject.extend({
      updateRecord() {
        called++;
        if (called === 1) {
          return Promise.resolve();
        } else if (called > 1) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject();
        }
      },

      createRecord() {
        return Promise.resolve();
      },
    });

    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter, { singleton: false });

    const store = owner.lookup('service:store') as unknown as Store;

    store.push({
      data: [personHash],
    });
    assert.strictEqual(calledUpsert, 1, 'Called upsert');

    const person = store.peekRecord('person', '1') as Model;
    void person.save();
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

    const clientPerson = store.createRecord('person', { id: '2' }) as Model;
    assert.strictEqual(calledClientDidCreate, 1, 'Called clientDidCreate');

    void clientPerson.save();
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
  });

  test('Record Data attribute setting', function (assert) {
    const expectedCount = 13;
    assert.expect(expectedCount);
    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };

    const { owner } = this;
    let calledGet = 0;

    class AttributeCache extends TestCache {
      changedAttributes() {
        return { name: ['old', 'new'] as [string, string] };
      }

      hasChangedAttributes(): boolean {
        return false;
      }

      override changedAttrs() {
        return { name: ['old', 'new'] as [string, string] };
      }

      override hasChangedAttrs(): boolean {
        return false;
      }

      override setAttr(identifier: ResourceKey, key: string, value: unknown) {
        assert.strictEqual(key, 'name', 'key passed to setDirtyAttribute');
        assert.strictEqual(value, 'new value', 'value passed to setDirtyAttribute');
      }

      setDirtyAttribute(key: string, value: unknown) {
        assert.strictEqual(key, 'name', 'key passed to setDirtyAttribute');
        assert.strictEqual(value, 'new value', 'value passed to setDirtyAttribute');
      }

      override getAttr(identifier: ResourceKey, key: string): string {
        calledGet++;
        assert.strictEqual(key, 'name', 'key passed to getAttr');

        return 'new attribute';
      }
    }

    class TestStore extends Store {
      override createCache(storeWrapper: CacheCapabilitiesManager) {
        // @ts-expect-error
        return new AttributeCache(storeWrapper) as Cache;
      }
    }

    owner.register('service:store', TestStore);

    const store = owner.lookup('service:store') as unknown as Store;

    store.push({
      data: [personHash],
    });

    const person = store.peekRecord<Person>('person', '1')!;
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
  });
});
