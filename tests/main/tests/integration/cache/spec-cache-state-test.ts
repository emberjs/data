import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import Store from 'main-test-app/services/store';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';
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

class Person extends Model {
  // TODO fix the typing for naked attrs

  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}

class TestCache implements Cache {
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
          doc.content.data
        ) as PersistedResourceKey;
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
  mutate(operation: LocalRelationshipOperation): void {
    throw new Error('Method not implemented.');
  }
  version = '2' as const;

  _errors?: ApiError[];
  _isNew = false;

  clientDidCreate(identifier: ResourceKey, options?: Record<string, unknown>): Record<string, unknown> {
    this._isNew = true;
    this._storeWrapper.notifyChange(identifier, 'added', null);
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
  ): CollectionResourceDataDocument | SingleResourceDataDocument {
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
    throw new Error('Method not implemented.');
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
  addToHasMany(identifier: ResourceKey, propertyName: string, value: ResourceKey[], idx?: number): void {
    throw new Error('Method not implemented.');
  }
  removeFromHasMany(identifier: ResourceKey, propertyName: string, value: ResourceKey[]): void {
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

module('integration/record-data - Record Data State', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:person', Person);
    // @ts-expect-error missing type
    owner.unregister('service:store');
    owner.register('service:store', Store);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    owner.register('serializer:application', JSONAPISerializer);
  });

  test('Record Data state saving', async function (assert) {
    assert.expect(3);

    let isDeleted: boolean, isNew: boolean;
    const isDeletionCommitted = false;
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
    const { owner } = this;

    class LifecycleCache extends TestCache {
      override isNew(): boolean {
        return isNew;
      }

      override isDeleted(): boolean {
        return isDeleted;
      }

      override isDeletionCommitted(): boolean {
        return isDeletionCommitted;
      }

      override setIsDeleted(): void {
        isDeleted = true;
      }
    }

    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        // @ts-expect-error
        return new LifecycleCache(wrapper) as Cache;
      }
    }

    const TestAdapter = EmberObject.extend({
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

    const store = owner.lookup('service:store') as Store;

    store.push({
      data: [personHash],
    });

    const person = store.peekRecord('person', '1') as Person;
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
    assert.true(calledUpdate, "called update if record isn't deleted or new");
  });

  test('Record Data state record flags', async function (assert) {
    assert.expect(13);
    let isDeleted = false;
    let isNew = false;
    let isDeletionCommitted = false;
    let calledSetIsDeleted = false;
    let storeWrapper!: CacheCapabilitiesManager;

    const personHash = {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Scumbag Dale',
      },
    };
    const { owner } = this;

    class LifecycleCache extends TestCache {
      constructor(sw: CacheCapabilitiesManager, identifier: ResourceKey) {
        super(sw, identifier);
        storeWrapper = sw;
      }

      override isEmpty(): boolean {
        return !isNew && isDeletionCommitted;
      }

      override isNew(): boolean {
        return isNew;
      }

      override isDeleted(): boolean {
        return isDeleted;
      }

      override isDeletionCommitted(): boolean {
        return isDeletionCommitted;
      }

      override setIsDeleted(identifier: ResourceKey, value: boolean): void {
        isDeleted = true;
        calledSetIsDeleted = true;
      }
    }

    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        // @ts-expect-error
        return new LifecycleCache(wrapper) as Cache;
      }
    }

    owner.register('service:store', TestStore);

    const store = owner.lookup('service:store') as Store;

    store.push({
      data: [personHash],
    });

    const person = store.peekRecord('person', '1') as Person;
    const personIdentifier = recordIdentifierFor(person);
    const people = store.peekAll('person');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');

    isNew = true;
    storeWrapper.notifyChange(personIdentifier, 'state', null);
    await settled();
    assert.true(person.isNew, 'person is new');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');

    isNew = false;
    isDeleted = true;
    storeWrapper.notifyChange(personIdentifier, 'state', null);
    await settled();
    assert.false(person.isNew, 'person is not new');
    assert.true(person.isDeleted, 'person is deleted');
    assert.strictEqual(people.length, 1, 'live array starting length is 1');

    isNew = false;
    isDeleted = false;
    storeWrapper.notifyChange(personIdentifier, 'state', null);
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
    storeWrapper.notifyChange(personIdentifier, 'state', null);
    await settled();
    assert.strictEqual(people.length, 0, 'committing a deletion updates the live array');
  });
});
