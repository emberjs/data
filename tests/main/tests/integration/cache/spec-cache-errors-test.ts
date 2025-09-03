import EmberObject from '@ember/object';

import Store from 'main-test-app/services/store';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import { recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { Cache, ChangedAttributesHash, RelationshipDiff } from '@warp-drive/core-types/cache';
import type { ResourceBlob } from '@warp-drive/core-types/cache/aliases';
import type { Change } from '@warp-drive/core-types/cache/change';
import type { MergeOperation } from '@warp-drive/core-types/cache/operations';
import type { CollectionRelationship, ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type { PersistedResourceKey, RequestKey, ResourceKey } from '@warp-drive/core-types/identifier';
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
  @attr declare firstName: string;
  @attr declare lastName: string;
}

class TestCache implements Cache {
  wrapper: CacheCapabilitiesManager;
  _data: Map<ResourceKey, object> = new Map();
  constructor(wrapper: CacheCapabilitiesManager) {
    this.wrapper = wrapper;
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
  put<T extends SingleResourceDocument>(doc: StructuredDocument<T>): SingleResourceDataDocument;
  put<T extends CollectionResourceDocument>(doc: StructuredDocument<T>): CollectionResourceDataDocument;
  put<T extends ResourceMetaDocument | ResourceErrorDocument>(
    doc: StructuredDocument<T>
  ): ResourceMetaDocument | ResourceErrorDocument;
  put(doc: StructuredDocument<JsonApiDocument>): ResourceDocument {
    if ('content' in doc && !('error' in doc)) {
      const identifier = this.wrapper.cacheKeyManager.getOrCreateRecordIdentifier(
        doc.content.data as ExistingResourceObject
      );
      this.upsert(identifier, doc.content.data as ExistingResourceObject, this.wrapper.hasRecord(identifier));
      return { data: identifier } as SingleResourceDataDocument;
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

  mutate(operation: LocalRelationshipOperation): void {
    throw new Error('Method not implemented.');
  }
  version = '2' as const;

  _errors?: ApiError[];
  _isNew = false;

  upsert(identifier: ResourceKey, data: ExistingResourceObject, calculateChanges?: boolean): void | string[] {
    if (!this._data.has(identifier)) {
      this.wrapper.notifyChange(identifier, 'added', null);
    }
    this._data.set(identifier, data);
    this.wrapper.notifyChange(identifier, 'attributes', null);
    this.wrapper.notifyChange(identifier, 'relationships', null);
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
  getRemoteAttr(identifier: ResourceKey, propertyName: string): string {
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

module('integration/record-data Custom Cache (v2) Errors', function (hooks) {
  setupTest(hooks);

  test('Cache Invalid Errors', async function (assert) {
    assert.expect(3);

    const { owner } = this;

    class LifecycleCache extends TestCache {
      override commitWasRejected(identifier: ResourceKey, errors?: ApiError[]) {
        super.commitWasRejected(identifier, errors);
        assert.strictEqual(errors?.[0]?.detail, 'is a generally unsavoury character', 'received the error');
        assert.strictEqual(errors?.[0]?.source?.pointer, '/data/attributes/name', 'pointer is correct');
      }
    }
    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        return new LifecycleCache(wrapper) as Cache;
      }
    }
    class TestAdapter extends EmberObject {
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
      }

      createRecord() {
        return Promise.resolve();
      }
    }

    owner.register('model:person', Person);
    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter);

    const store = owner.lookup('service:store') as unknown as Store;

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom',
        },
      },
    }) as Model;

    try {
      await person.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.ok(true, 'we erred');
    }
  });

  test('Cache Network Errors', async function (assert) {
    assert.expect(2);

    const { owner } = this;

    class LifecycleCache extends TestCache {
      override commitWasRejected(identifier: ResourceKey, errors?: ApiError[]) {
        super.commitWasRejected(identifier, errors);
        assert.strictEqual(errors, undefined, 'Did not pass adapter errors');
      }
    }
    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        return new LifecycleCache(wrapper) as Cache;
      }
    }
    class TestAdapter extends EmberObject {
      updateRecord() {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject();
      }

      createRecord() {
        return Promise.resolve();
      }
    }

    owner.register('model:person', Person);
    owner.register('service:store', TestStore);
    owner.register('adapter:application', TestAdapter);

    const store = owner.lookup('service:store') as unknown as Store;

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom',
        },
      },
    }) as Model;

    try {
      await person.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.ok(true, 'we erred');
    }
  });

  test('Cache Invalid Errors Can Be Reflected On The Record', function (assert) {
    const { owner } = this;
    let errorsToReturn: ApiError[] | undefined;
    let storeWrapper!: CacheCapabilitiesManager;

    class LifecycleCache extends TestCache {
      override getErrors(): ApiError[] {
        return errorsToReturn || [];
      }
    }

    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        storeWrapper = wrapper;
        return new LifecycleCache(wrapper) as Cache;
      }
    }

    owner.register('model:person', Person);
    owner.register('service:store', TestStore);

    const store = owner.lookup('service:store') as unknown as Store;

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale',
        },
      },
    }) as Model;

    const identifier = recordIdentifierFor(person);

    let nameError = person.errors.errorsFor('firstName').objectAt(0);
    assert.strictEqual(nameError, undefined, 'no error shows up on firstName initially');
    assert.true(person.isValid, 'person is initially valid');

    errorsToReturn = [
      {
        title: 'Invalid Attribute',
        detail: '',
        source: {
          pointer: '/data/attributes/firstName',
        },
      },
    ];
    storeWrapper.notifyChange(identifier, 'errors', null);

    nameError = person.errors.errorsFor('firstName').objectAt(0);

    assert.strictEqual(nameError?.attribute, 'firstName', 'error shows up on name');
    assert.false(person.isValid, 'person is not valid');

    errorsToReturn = [];
    storeWrapper.notifyChange(identifier, 'errors', null);

    assert.strictEqual(person.errors.errorsFor('firstName').length, 0, 'no errors on name');
    assert.true(person.isValid, 'person is valid');

    errorsToReturn = [
      {
        title: 'Invalid Attribute',
        detail: '',
        source: {
          pointer: '/data/attributes/lastName',
        },
      },
    ];
    storeWrapper.notifyChange(identifier, 'errors', null);

    assert.false(person.isValid, 'person is not valid');

    assert.strictEqual(person.errors.errorsFor('firstName').length, 0, 'no errors on firstName');

    const lastNameError = person.errors.errorsFor('lastName').objectAt(0);

    assert.strictEqual(lastNameError?.attribute, 'lastName', 'error shows up on lastName');
  });
});
