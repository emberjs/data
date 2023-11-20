import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';
import type { Cache, MergeOperation } from '@ember-data/store/-types/q/cache';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';
import type { JsonApiError, JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { ChangedAttributesHash, RelationshipDiff } from '@warp-drive/core-types/cache';
import type { ResourceBlob } from '@warp-drive/core-types/cache/aliases';
import type { Change } from '@warp-drive/core-types/cache/change';
import type { CollectionRelationship, ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type {
  StableDocumentIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';
import type {
  CollectionResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
} from '@warp-drive/core-types/spec/document';
import type {
  CollectionResourceDocument,
  JsonApiDocument,
  SingleResourceDocument,
} from '@warp-drive/core-types/spec/raw';

class Person extends Model {
  // TODO fix the typing for naked attrs

  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}

class TestRecordData implements Cache {
  _storeWrapper: CacheCapabilitiesManager;
  _identifier: StableRecordIdentifier;

  constructor(wrapper: CacheCapabilitiesManager, identifier: StableRecordIdentifier) {
    this._storeWrapper = wrapper;
    this._identifier = identifier;
  }

  changedRelationships(identifier: StableRecordIdentifier): Map<string, RelationshipDiff> {
    throw new Error('Method not implemented.');
  }
  hasChangedRelationships(identifier: StableRecordIdentifier): boolean {
    throw new Error('Method not implemented.');
  }
  rollbackRelationships(identifier: StableRecordIdentifier): string[] {
    throw new Error('Method not implemented.');
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
        const data = doc.content.data.map((resource) => {
          const identifier = this._storeWrapper.identifierCache.getOrCreateRecordIdentifier(
            resource
          ) as StableExistingRecordIdentifier;
          this.upsert(identifier, resource, this._storeWrapper.hasRecord(identifier));
          return identifier;
        });
        return { data };
      } else {
        const identifier = this._storeWrapper.identifierCache.getOrCreateRecordIdentifier(
          doc.content.data
        ) as StableExistingRecordIdentifier;
        this.upsert(identifier, doc.content.data as JsonApiResource, this._storeWrapper.hasRecord(identifier));
        return { data: identifier } as SingleResourceDataDocument;
      }
    } else if ('error' in doc) {
      throw typeof doc.error === 'string' ? new Error(doc.error) : (doc.error as Error);
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
  mutate(operation: LocalRelationshipOperation): void {
    throw new Error('Method not implemented.');
  }
  version = '2' as const;

  _errors?: JsonApiError[];
  _isNew = false;

  clientDidCreate(
    identifier: StableRecordIdentifier,
    options?: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    this._isNew = true;
    this._storeWrapper.notifyChange(identifier, 'added');
    return {};
  }
  willCommit(identifier: StableRecordIdentifier): void {}
  didCommit(identifier: StableRecordIdentifier, result: StructuredDataDocument<unknown>): SingleResourceDataDocument {
    return { data: identifier as StableExistingRecordIdentifier };
  }
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[] | undefined): void {
    this._errors = errors;
  }
  unloadRecord(identifier: StableRecordIdentifier): void {}
  getAttr(identifier: StableRecordIdentifier, propertyName: string): string {
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
  ): ResourceRelationship | CollectionRelationship {
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

  getErrors(identifier: StableRecordIdentifier): JsonApiError[] {
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

module('integration/record-data - Record Data State', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:person', Person);
    // @ts-expect-error missing type

    owner.unregister('service:store');
    owner.register('service:store', Store);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test('Record Data state saving', async function (assert) {
    assert.expect(3);

    let isDeleted: boolean, isNew: boolean, isDeletionCommitted: boolean;
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

    class LifecycleRecordData extends TestRecordData {
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
        return new LifecycleRecordData(wrapper) as Cache;
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

    class LifecycleRecordData extends TestRecordData {
      constructor(sw: CacheCapabilitiesManager, identifier: StableRecordIdentifier) {
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

      override setIsDeleted(identifier: StableRecordIdentifier, value: boolean): void {
        isDeleted = true;
        calledSetIsDeleted = true;
      }
    }

    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        // @ts-expect-error
        return new LifecycleRecordData(wrapper) as Cache;
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
    assert.strictEqual(people.length, 0, 'committing a deletion updates the live array');
  });
});
