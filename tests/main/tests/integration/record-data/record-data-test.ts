import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import type { LocalRelationshipOperation } from '@ember-data/graph/-private/-operations';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { ResourceBlob } from '@ember-data/store/-types/cache/aliases';
import type { RelationshipDiff } from '@ember-data/store/-types/cache/cache';
import { Change } from '@ember-data/store/-types/cache/change';
import {
  CollectionResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
} from '@ember-data/store/-types/cache/document';
import { StableDocumentIdentifier } from '@ember-data/store/-types/cache/identifier';
import type { Cache, ChangedAttributesHash, MergeOperation } from '@ember-data/store/-types/q/cache';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';
import type {
  CollectionResourceDocument,
  CollectionResourceRelationship,
  JsonApiDocument,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@ember-data/store/-types/q/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/store/-types/q/identifier';
import type { JsonApiError, JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';

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

class TestRecordData implements Cache {
  version = '2' as const;

  _errors?: JsonApiError[];
  _isNew: boolean = false;
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
          doc.content.data as RecordIdentifier
        );
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

  clientDidCreate(
    identifier: StableRecordIdentifier,
    options?: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    this._isNew = true;
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

module('integration/record-data - Custom RecordData Implementations', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:house', House);
    // @ts-expect-error missing type
    owner.unregister('service:store');
    owner.register('service:store', Store);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('A RecordData implementation that has the required spec methods should not error out', async function (assert) {
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
      upsert() {
        calledUpsert++;
      }

      clientDidCreate(
        identifier: StableRecordIdentifier,
        options?: Record<string, unknown> | undefined
      ): Record<string, unknown> {
        calledClientDidCreate++;
        isNew = true;
        return {};
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
        return [];
      }
      rollbackAttributes() {
        calledRollbackAttributes++;
      }

      didCommit(identifier, result) {
        calledDidCommit++;
        isNew = false;
        return { data: identifier };
      }

      isNew() {
        return isNew;
      }
    }

    class TestStore extends Store {
      createCache(storeWrapper: CacheCapabilitiesManager) {
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

    const store = owner.lookup('service:store') as unknown as Store;

    store.push({
      data: [personHash],
    });
    assert.strictEqual(calledUpsert, 1, 'Called upsert');

    let person = store.peekRecord('person', '1') as Model;
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

    let clientPerson = store.createRecord('person', { id: '2' }) as Model;
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
  });

  test('Record Data attribute setting', async function (assert) {
    let expectedCount = 13;
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
        assert.strictEqual(key, 'name', 'key passed to getAttr');

        return 'new attribute';
      }
    }

    class TestStore extends Store {
      createCache(storeWrapper: CacheCapabilitiesManager) {
        // @ts-expect-error
        return new AttributeRecordData(storeWrapper) as Cache;
      }
    }

    owner.register('service:store', TestStore);

    const store = owner.lookup('service:store') as unknown as Store;

    store.push({
      data: [personHash],
    });

    let person = store.peekRecord('person', '1') as Model;
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
