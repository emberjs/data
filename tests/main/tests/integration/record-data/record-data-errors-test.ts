import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import { InvalidError } from '@ember-data/adapter/error';
import type { LocalRelationshipOperation } from '@ember-data/graph/-private/-operations';
import Model, { attr } from '@ember-data/model';
import { StructuredDataDocument } from '@ember-data/request/-private/types';
import { recordIdentifierFor } from '@ember-data/store';
import type { ResourceBlob } from '@ember-data/types/cache/aliases';
import type { Change } from '@ember-data/types/cache/change';
import type {
  CollectionResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
  StructuredDocument,
} from '@ember-data/types/cache/document';
import type { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import type { Cache, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';
import type {
  CollectionResourceDocument,
  CollectionResourceRelationship,
  JsonApiDocument,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import type { JsonApiError, JsonApiResource } from '@ember-data/types/q/record-data-json-api';

class Person extends Model {
  @attr declare firstName: string;
  @attr declare lastName: string;
}

class TestRecordData implements Cache {
  wrapper: CacheCapabilitiesManager;
  _data: Map<StableRecordIdentifier, object> = new Map();
  constructor(wrapper: CacheCapabilitiesManager) {
    this.wrapper = wrapper;
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
      const identifier = this.wrapper.identifierCache.getOrCreateRecordIdentifier(doc.content.data as RecordIdentifier);
      this.upsert(identifier, doc.content.data as JsonApiResource, this.wrapper.hasRecord(identifier));
      return { data: identifier } as SingleResourceDataDocument;
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

  mutate(operation: LocalRelationshipOperation): void {
    throw new Error('Method not implemented.');
  }
  version: '2' = '2';

  _errors?: JsonApiError[];
  _isNew: boolean = false;

  upsert(
    identifier: StableRecordIdentifier,
    data: JsonApiResource,
    calculateChanges?: boolean | undefined
  ): void | string[] {
    if (!this._data.has(identifier)) {
      this.wrapper.notifyChange(identifier, 'added');
    }
    this._data.set(identifier, data);
    this.wrapper.notifyChange(identifier, 'attributes');
    this.wrapper.notifyChange(identifier, 'relationships');
  }
  clientDidCreate(
    identifier: StableRecordIdentifier,
    options?: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    this._isNew = true;
    return {};
  }
  willCommit(identifier: StableRecordIdentifier): void {}
  didCommit(
    identifier: StableRecordIdentifier,
    response: StructuredDataDocument<SingleResourceDocument>
  ): SingleResourceDataDocument {
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

module('integration/record-data Custom RecordData (v2) Errors', function (hooks) {
  setupTest(hooks);

  test('RecordData Invalid Errors', async function (assert) {
    assert.expect(3);

    const { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[]) {
        super.commitWasRejected(identifier, errors);
        assert.strictEqual(errors?.[0]?.detail, 'is a generally unsavoury character', 'received the error');
        assert.strictEqual(errors?.[0]?.source?.pointer, '/data/attributes/name', 'pointer is correct');
      }
    }
    class TestStore extends Store {
      createCache(wrapper: CacheCapabilitiesManager) {
        return new LifecycleRecordData(wrapper) as Cache;
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
    } catch (error) {
      assert.ok(true, 'we erred');
    }
  });

  test('RecordData Network Errors', async function (assert) {
    assert.expect(2);

    const { owner } = this;

    class LifecycleRecordData extends TestRecordData {
      commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[]) {
        super.commitWasRejected(identifier, errors);
        assert.strictEqual(errors, undefined, 'Did not pass adapter errors');
      }
    }
    class TestStore extends Store {
      createCache(wrapper: CacheCapabilitiesManager) {
        return new LifecycleRecordData(wrapper) as Cache;
      }
    }
    class TestAdapter extends EmberObject {
      updateRecord() {
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
    } catch (error) {
      assert.ok(true, 'we erred');
    }
  });

  test('RecordData Invalid Errors Can Be Reflected On The Record', async function (assert) {
    const { owner } = this;
    let errorsToReturn: JsonApiError[] | undefined;
    let storeWrapper;

    class LifecycleRecordData extends TestRecordData {
      getErrors(): JsonApiError[] {
        return errorsToReturn || [];
      }
    }

    class TestStore extends Store {
      createCache(wrapper: CacheCapabilitiesManager) {
        storeWrapper = wrapper;
        return new LifecycleRecordData(wrapper) as Cache;
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
    storeWrapper.notifyChange(identifier, 'errors');

    nameError = person.errors.errorsFor('firstName').objectAt(0);
    assert.strictEqual(nameError?.attribute, 'firstName', 'error shows up on name');
    assert.false(person.isValid, 'person is not valid');

    errorsToReturn = [];
    storeWrapper.notifyChange(identifier, 'errors');

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
    storeWrapper.notifyChange(identifier, 'errors');

    assert.false(person.isValid, 'person is not valid');
    assert.strictEqual(person.errors.errorsFor('firstName').length, 0, 'no errors on firstName');
    let lastNameError = person.errors.errorsFor('lastName').objectAt(0);
    assert.strictEqual(lastNameError?.attribute, 'lastName', 'error shows up on lastName');
  });
});
