import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import { InvalidError } from '@ember-data/adapter/error';
import { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import Model, { attr } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store, { recordIdentifierFor } from '@ember-data/store';
import type { Cache, CacheV1, ChangedAttributesHash, MergeOperation } from '@ember-data/types/q/cache';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { DSModel } from '@ember-data/types/q/ds-model';
import { CollectionResourceRelationship, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import type { NewRecordIdentifier, RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import { Dict } from '@ember-data/types/q/utils';

if (!DEPRECATE_V1_RECORD_DATA) {
  class Person extends Model {
    @attr declare firstName: string;
    @attr declare lastName: string;
  }

  class TestRecordData implements Cache {
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

  module('integration/record-data Custom RecordData (v2) Errors', function (hooks) {
    setupTest(hooks);

    test('RecordData Invalid Errors', async function (assert) {
      assert.expect(3);

      const { owner } = this;

      class LifecycleRecordData extends TestRecordData {
        commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]) {
          super.commitWasRejected(identifier, errors);
          assert.strictEqual(errors?.[0]?.detail, 'is a generally unsavoury character', 'received the error');
          assert.strictEqual(errors?.[0]?.source.pointer, '/data/attributes/name', 'pointer is correct');
        }
      }
      class TestStore extends Store {
        createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
          return new LifecycleRecordData();
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

      const store = owner.lookup('service:store') as Store;

      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom',
          },
        },
      });

      try {
        await (person as DSModel).save();
        assert.ok(false, 'we should error');
      } catch (error) {
        assert.ok(true, 'we erred');
      }
    });

    test('RecordData Network Errors', async function (assert) {
      assert.expect(2);

      const { owner } = this;

      class LifecycleRecordData extends TestRecordData {
        commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiValidationError[]) {
          super.commitWasRejected(identifier, errors);
          assert.strictEqual(errors, undefined, 'Did not pass adapter errors');
        }
      }
      class TestStore extends Store {
        createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
          return new LifecycleRecordData();
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

      const store = owner.lookup('service:store') as Store;

      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom',
          },
        },
      });

      try {
        await (person as DSModel).save();
        assert.ok(false, 'we should error');
      } catch (error) {
        assert.ok(true, 'we erred');
      }
    });

    test('RecordData Invalid Errors Can Be Reflected On The Record', async function (assert) {
      const { owner } = this;
      let errorsToReturn: JsonApiValidationError[] | undefined;
      let storeWrapper;

      class LifecycleRecordData extends TestRecordData {
        getErrors(): JsonApiValidationError[] {
          return errorsToReturn || [];
        }
      }

      class TestStore extends Store {
        createRecordDataFor(identifier: StableRecordIdentifier, sw: CacheStoreWrapper): Cache {
          storeWrapper = sw;
          return new LifecycleRecordData();
        }
      }

      owner.register('model:person', Person);
      owner.register('service:store', TestStore);

      const store = owner.lookup('service:store') as Store;

      const person: DSModel = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      }) as DSModel;

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
} else {
  module('integration/record-data - Custom RecordData (v1) Errors', function (hooks) {
    setupTest(hooks);

    let store;

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

    class TestRecordData implements CacheV1 {
      setIsDeleted(isDeleted: boolean): void {
        throw new Error('Method not implemented.');
      }
      version?: '1' | undefined = '1';
      isDeletionCommitted(): boolean {
        return false;
      }
      id: string | null = '1';
      clientId: string | null = 'test-record-data-1';
      modelName = 'tst';

      getResourceIdentifier() {
        if (this.clientId !== null) {
          return new TestRecordIdentifier(this.id, this.clientId, this.modelName);
        }
      }

      _errors: JsonApiValidationError[] = [];
      getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[] {
        return this._errors;
      }
      commitWasRejected(identifier: StableRecordIdentifier, errors: JsonApiValidationError[]): void {
        this._errors = errors;
      }

      // Use correct interface once imports have been fix
      _storeWrapper: any;

      pushData(data: object, calculateChange: true): string[];
      pushData(data: object, calculateChange?: false): void;
      pushData(data: object, calculateChange?: boolean): string[] | void {}

      clientDidCreate() {}

      willCommit() {}

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

      isRecordInUse(): boolean {
        return true;
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

    class CustomStore extends Store {
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        return new TestRecordData();
      }
    }

    hooks.beforeEach(function () {
      let { owner } = this;

      owner.register('model:person', Person);
      owner.unregister('service:store');
      owner.register('service:store', CustomStore);
      owner.register('serializer:application', JSONAPISerializer);
    });

    test('Record Data invalid errors', async function (assert) {
      assert.expect(3);

      const personHash = {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale',
        },
      };
      let { owner } = this;

      class LifecycleRecordData extends TestRecordData {
        commitWasRejected(recordIdentifier, errors) {
          super.commitWasRejected(recordIdentifier, errors);
          assert.strictEqual(errors[0].detail, 'is a generally unsavoury character', 'received the error');
          assert.strictEqual(errors[0].source.pointer, '/data/attributes/name', 'pointer is correct');
        }
      }

      class TestStore extends Store {
        createRecordDataFor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
          return new LifecycleRecordData();
        }
      }

      let TestAdapter = EmberObject.extend({
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
      let person = store.peekRecord('person', '1');
      await person.save().then(
        () => {},
        (err) => {}
      );
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    });

    test('Record Data adapter errors', async function (assert) {
      assert.expect(2);
      const personHash = {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale',
        },
      };
      let { owner } = this;

      class LifecycleRecordData extends TestRecordData {
        commitWasRejected(recordIdentifier, errors) {
          super.commitWasRejected(recordIdentifier, errors);
          assert.strictEqual(errors, undefined, 'Did not pass adapter errors');
        }
      }

      class TestStore extends Store {
        createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
          return new LifecycleRecordData();
        }
      }

      let TestAdapter = EmberObject.extend({
        updateRecord() {
          return Promise.reject();
        },
      });

      owner.register('service:store', TestStore);
      owner.register('adapter:application', TestAdapter, { singleton: false });

      store = owner.lookup('service:store');

      store.push({
        data: [personHash],
      });
      let person = store.peekRecord('person', '1');
      await person.save().then(
        () => {},
        (err) => {}
      );
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    });

    test('Getting errors from Record Data shows up on the record', async function (assert) {
      assert.expect(8);
      let storeWrapper;
      const personHash = {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale',
          lastName: 'something',
        },
      };
      let { owner } = this;
      let errorsToReturn = [
        {
          title: 'Invalid Attribute',
          detail: '',
          source: {
            pointer: '/data/attributes/name',
          },
        },
      ];

      class LifecycleRecordData extends TestRecordData {
        constructor(sw) {
          super();
          storeWrapper = sw;
        }

        getErrors(recordIdentifier: RecordIdentifier): JsonApiValidationError[] {
          return errorsToReturn;
        }
      }

      class TestStore extends Store {
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
      const identifier = recordIdentifierFor(person);
      let nameError = person.errors.errorsFor('name').at(0);
      assert.strictEqual(nameError.attribute, 'name', 'error shows up on name');
      assert.false(person.isValid, 'person is not valid');
      errorsToReturn = [];
      storeWrapper.notifyChange(identifier, 'errors');
      assert.true(person.isValid, 'person is valid');
      assert.strictEqual(person.errors.errorsFor('name').length, 0, 'no errors on name');
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
      assert.false(person.isValid, 'person is valid');
      assert.strictEqual(person.errors.errorsFor('name').length, 0, 'no errors on name');
      let lastNameError = person.errors.errorsFor('lastName').at(0);
      assert.strictEqual(lastNameError.attribute, 'lastName', 'error shows up on lastName');
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    });
  });
}
