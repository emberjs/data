import EmberObject, { set } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import {
  recordIdentifierFor,
  setIdentifierForgetMethod,
  setIdentifierGenerationMethod,
  setIdentifierResetMethod,
  setIdentifierUpdateMethod,
} from '@ember-data/store';
import type { CacheKeyType, ResourceKey } from '@warp-drive/core-types/identifier';
import type { ExistingResourceObject, ResourceIdentifierObject } from '@warp-drive/core-types/spec/json-api-raw';

type ResourceData = ResourceIdentifierObject | ExistingResourceObject;
type GenerationMethod = Parameters<typeof setIdentifierGenerationMethod>[0];

module('Integration | Identifiers - configuration', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('adapter:application', class extends JSONAPIAdapter {});
    owner.register('serializer:application', class extends JSONAPISerializer {});
    class User extends Model {
      @attr()
      declare firstName: string;
      @attr()
      declare username: string;
      @attr()
      declare age: number;
    }

    owner.register('model:user', User);

    let localIdInc = 9000;
    const generationMethod: GenerationMethod = (resource: unknown, bucket: CacheKeyType) => {
      if (bucket !== 'record') {
        throw new Error('Test cannot generate an lid for a non-record');
      }
      if (typeof resource !== 'object' || resource === null) {
        throw new Error('Test cannot generate an lid for a non-object');
      }
      if (!('type' in resource) || typeof resource.type !== 'string' || resource.type.length < 1) {
        throw new Error(`Cannot generate an lid for a record without a type`);
      }

      if ('lid' in resource && typeof resource.lid === 'string' && resource.lid.length > 0) {
        return resource.lid;
      }

      if ('id' in resource && typeof resource.id === 'string' && resource.id.length > 0) {
        return `remote:${resource.type}:${resource.id}`;
      }

      return `local:${resource.type}:${localIdInc++}`;
    };

    setIdentifierGenerationMethod(generationMethod);
  });

  hooks.afterEach(function () {
    setIdentifierGenerationMethod(null);
    setIdentifierResetMethod(null);
    setIdentifierUpdateMethod(null);
    setIdentifierForgetMethod(null);
  });

  test(`The configured generation method is used for pushed records`, function (assert) {
    const store = this.owner.lookup('service:store') as unknown as Store;
    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          fistName: 'Chris',
          username: '@runspired',
          age: 31,
        },
      },
    });
    const identifier = recordIdentifierFor(record);
    assert.strictEqual(identifier.lid, 'remote:user:1', 'We receive the expected identifier for an existing record');
  });

  test(`The configured generation method is used for newly created records`, function (assert) {
    let localIdInc = 9000;
    const generationMethod: GenerationMethod = (resource: unknown, bucket: CacheKeyType) => {
      if (bucket !== 'record') {
        throw new Error('Test cannot generate an lid for a non-record');
      }
      if (typeof resource !== 'object' || resource === null) {
        throw new Error('Test cannot generate an lid for a non-object');
      }
      if (!('type' in resource) || typeof resource.type !== 'string' || resource.type.length < 1) {
        throw new Error(`Cannot generate an lid for a record without a type`);
      }

      if ('lid' in resource && typeof resource.lid === 'string' && resource.lid.length > 0) {
        return resource.lid;
      }

      if ('id' in resource && typeof resource.id === 'string' && resource.id.length > 0) {
        return `remote:${resource.type}:${resource.id}`;
      }

      return `local:${resource.type}:${localIdInc++}`;
    };

    setIdentifierGenerationMethod(generationMethod);

    const store = this.owner.lookup('service:store') as unknown as Store;
    const newRecord = store.createRecord('user', {
      firstName: 'James',
      username: '@cthoburn',
    });
    const newIdentifier = recordIdentifierFor(newRecord);
    assert.strictEqual(
      newIdentifier.lid,
      'local:user:9000',
      'We receive the expected identifier for a newly created record'
    );
  });

  test(`The configured update method is called when newly created records are committed`, async function (assert) {
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      override createRecord() {
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              firstName: 'James',
              username: '@runspired',
              age: 31,
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);
    this.owner.register('serializer:application', TestSerializer);

    let updateMethodCalls = 0 as number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const
    let updateCallback: (...args: any[]) => void;

    function updateMethod(
      identifier: { lid: string } | ResourceKey,
      data: ResourceData | unknown,
      bucket: CacheKeyType
    ) {
      switch (bucket) {
        case 'record':
          updateMethodCalls++;
          updateCallback!(identifier, data);
          break;
        default:
          throw new Error(`Identifier Updates for ${bucket} have not been implemented`);
      }
    }

    setIdentifierUpdateMethod(updateMethod);

    const store = this.owner.lookup('service:store') as unknown as Store;
    const record = store.createRecord('user', { firstName: 'Chris', username: '@runspired', age: 31 }) as Model;
    const identifier = recordIdentifierFor(record);
    assert.strictEqual(
      identifier.lid,
      'local:user:9000',
      'Precond: We receive the expected identifier for a new record'
    );
    assert.strictEqual(identifier.id, null, 'Precond: We have no id yet');
    assert.strictEqual(updateMethodCalls, 0, 'Precond: We have not updated the identifier yet');
    updateCallback = (updatedIdentifier, resource) => {
      assert.strictEqual(identifier, updatedIdentifier, 'We updated the expected identifier');
      assert.strictEqual(resource.attributes!.firstName, 'James', 'We received the expected resource to update with');
    };

    await record.save();

    assert.strictEqual(updateMethodCalls, 1, 'We made a single call to our update method');
  });

  test(`The configured update method is called when newly created records with an id are committed`, async function (assert) {
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      override createRecord() {
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              firstName: 'James',
              username: '@runspired',
              age: 31,
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);
    this.owner.register('serializer:application', TestSerializer);

    let updateMethodCalls = 0 as number;
    // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
    let updateCallback: (...args: any[]) => void;

    function updateMethod(
      identifier: { lid: string } | ResourceKey,
      data: ResourceData | unknown,
      bucket: CacheKeyType
    ) {
      switch (bucket) {
        case 'record':
          updateMethodCalls++;
          updateCallback!(identifier, data);
          break;
        default:
          throw new Error(`Identifier Updates for ${bucket} have not been implemented`);
      }
    }

    setIdentifierUpdateMethod(updateMethod);

    const store = this.owner.lookup('service:store') as unknown as Store;
    const record = store.createRecord('user', {
      id: '1',
      firstName: 'Chris',
      username: '@runspired',
      age: 31,
    }) as Model;
    const identifier = recordIdentifierFor(record);
    assert.strictEqual(
      identifier.lid,
      'remote:user:1',
      'Precond: We receive the expected identifier for the new record'
    );
    assert.strictEqual(identifier.id, '1', 'Precond: We have an id already');
    assert.strictEqual(updateMethodCalls, 0, 'Precond: We have not updated the identifier yet');
    updateCallback = (updatedIdentifier, resource) => {
      assert.strictEqual(identifier, updatedIdentifier, 'We updated the expected identifier');
      assert.strictEqual(resource.attributes!.firstName, 'James', 'We received the expected resource to update with');
    };

    await record.save();

    assert.strictEqual(updateMethodCalls, 1, 'We made a single call to our update method after save');
  });

  test(`The configured update method is called when existing records are saved successfully`, async function (assert) {
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      override updateRecord() {
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              firstName: 'Chris',
              username: '@runspired',
              age: 23,
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);
    this.owner.register('serializer:application', TestSerializer);

    let updateMethodCalls = 0 as number;
    // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
    let updateCallback: (...args: any[]) => void;

    function updateMethod(
      identifier: { lid: string } | ResourceKey,
      data: ResourceData | unknown,
      bucket: CacheKeyType
    ) {
      switch (bucket) {
        case 'record':
          updateMethodCalls++;
          updateCallback!(identifier, data);
          break;
        default:
          throw new Error(`Identifier Updates for ${bucket} have not been implemented`);
      }
    }

    setIdentifierUpdateMethod(updateMethod);

    const store = this.owner.lookup('service:store') as unknown as Store;
    const record = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          firstName: 'James',
          username: '@runspired',
          age: 22,
        },
      },
    }) as Model;
    const identifier = recordIdentifierFor(record);
    assert.strictEqual(
      identifier.lid,
      'remote:user:1',
      'Precond: We receive the expected identifier for the new record'
    );
    assert.strictEqual(identifier.id, '1', 'Precond: We have an id already');
    assert.strictEqual(updateMethodCalls, 0, 'Precond: We have not updated the identifier yet');
    updateCallback = (updatedIdentifier, resource) => {
      assert.strictEqual(identifier, updatedIdentifier, 'We updated the expected identifier');
      assert.strictEqual(resource.attributes!.firstName, 'Chris', 'We received the expected resource to update with');
    };

    set(record, 'age', 23);

    await record.save();

    assert.strictEqual(updateMethodCalls, 1, 'We made a single call to our update method after save');
  });

  test(`The reset method is called when the application is destroyed`, async function (assert) {
    let resetMethodCalled = false;

    setIdentifierResetMethod(() => {
      resetMethodCalled = true;
    });

    const store = new Store();
    store.destroy();
    await settled();
    assert.ok(resetMethodCalled, 'We called the reset method when the application was torn down');
  });

  test(`The forget method is called when an identifier is "merged" with another`, async function (assert) {
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      override findRecord() {
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              firstName: 'Chris',
              username: '@runspired',
              age: 31,
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);
    this.owner.register('serializer:application', TestSerializer);

    let generateLidCalls = 0;
    setIdentifierGenerationMethod((resource: unknown, bucket: CacheKeyType) => {
      if (bucket !== 'record') {
        throw new Error('Test cannot generate an lid for a non-record');
      }
      if (typeof resource === 'object' && resource !== null && 'lid' in resource && typeof resource.lid === 'string') {
        generateLidCalls++;
        return resource.lid;
      }
      if (typeof resource !== 'object' || resource === null || !('type' in resource)) {
        throw new Error('Test cannot generate an lid for a non-object');
      }
      if (!('id' in resource)) {
        throw new Error(`Unexpected generation of new resource identifier`);
      }
      generateLidCalls++;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `${resource.type}:${resource.id}`;
    });
    let forgetMethodCalls = 0;

    let expectedIdentifier;

    let testMethod = (identifier) => {
      forgetMethodCalls++;
      assert.strictEqual(identifier, expectedIdentifier, `We forgot the expected identifier ${expectedIdentifier}`);
    };

    setIdentifierForgetMethod((identifier) => {
      testMethod(identifier);
    });

    const store = this.owner.lookup('service:store') as unknown as Store;
    const userByUsernamePromise = store.findRecord('user', '@runspired');
    const userByIdPromise = store.findRecord('user', '1');

    assert.strictEqual(generateLidCalls, 2, 'We generated two lids');
    assert.strictEqual(store.cacheKeyManager._cache.resources.size, 2, 'We have 2 identifiers in the cache');
    generateLidCalls = 0;

    const originalUserByUsernameIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      type: 'user',
      id: '@runspired',
    });
    const originalUserByIdIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      type: 'user',
      id: '1',
    });

    assert.strictEqual(generateLidCalls, 2, 'We generated no new lids when we looked up the originals');
    assert.strictEqual(store.cacheKeyManager._cache.resources.size, 2, 'We still have 2 identifiers in the cache');
    generateLidCalls = 0;

    // we expect that the username based identifier will be abandoned
    expectedIdentifier = originalUserByUsernameIdentifier;

    const [userByUsername, userById] = await Promise.all([userByUsernamePromise, userByIdPromise]);
    const finalUserByUsernameIdentifier = recordIdentifierFor(userByUsername);
    const finalUserByIdIdentifier = recordIdentifierFor(userById);

    assert.strictEqual(generateLidCalls, 2, 'We generated no new lids when we looked up the originals');
    assert.strictEqual(
      store.cacheKeyManager._cache.resources.size,
      2,
      'We keep a back reference identifier in the cache'
    );
    assert.strictEqual(forgetMethodCalls, 1, 'We abandoned an identifier');

    assert.notStrictEqual(
      finalUserByUsernameIdentifier,
      originalUserByUsernameIdentifier,
      'We are not using the original identifier by username for the result of findRecord with username'
    );
    assert.strictEqual(
      originalUserByIdIdentifier,
      finalUserByIdIdentifier,
      'We are using the identifier by id for the result of findRecord with id'
    );
    assert.strictEqual(
      finalUserByUsernameIdentifier,
      finalUserByIdIdentifier,
      'We are using the identifier by id for the result of findRecord with username'
    );

    const recordA = store.peekRecord({ lid: finalUserByUsernameIdentifier.lid });
    const recordB = store.peekRecord({ lid: finalUserByIdIdentifier.lid });
    const recordC = store.peekRecord({ lid: originalUserByUsernameIdentifier.lid });
    const recordD = store.peekRecord('user', '@runspired');
    const recordE = store.peekRecord('user', '1');

    assert.strictEqual(recordA, recordB, 'We have a single record for both identifiers');
    assert.strictEqual(recordA, recordC, 'We have a single record for both identifiers');
    assert.strictEqual(recordA, recordD, 'We have a single record for both identifiers');
    assert.strictEqual(recordA, recordE, 'We have a single record for both identifiers');

    const regeneratedIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
      lid: finalUserByUsernameIdentifier.lid,
    });
    const regeneratedIdentifier2 = store.cacheKeyManager.getOrCreateRecordIdentifier({
      id: '@runspired',
      type: 'user',
    });
    assert.strictEqual(regeneratedIdentifier, finalUserByUsernameIdentifier, 'We regenerate the same identifier');
    assert.strictEqual(regeneratedIdentifier2, finalUserByUsernameIdentifier, 'We regenerate the same identifier');

    expectedIdentifier = finalUserByIdIdentifier;
    store.unloadRecord(recordA);
    await settled();
    assert.strictEqual(
      store.cacheKeyManager._cache.resources.size,
      0,
      'We have no identifiers or backreferences in the cache'
    );

    // end test before store teardown
    testMethod = () => {};
  });

  test(`The forget method is called when a record deletion is fully persisted and the record unloaded`, async function (assert) {
    let forgetMethodCalls = 0;
    // eslint-disable-next-line prefer-const
    let expectedIdentifier;

    setIdentifierForgetMethod((identifier) => {
      forgetMethodCalls++;
      assert.strictEqual(expectedIdentifier, identifier, `We forgot the expected identifier ${expectedIdentifier}`);
    });
    const store = this.owner.lookup('service:store') as unknown as Store;
    const adapter = store.adapterFor('application');

    adapter.deleteRecord = () => {
      return Promise.resolve({
        data: null,
      });
    };
    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          username: '@runspired',
          firstName: 'Chris',
        },
      },
    }) as Model;
    const userIdentifier = recordIdentifierFor(user);

    user.deleteRecord();

    assert.strictEqual(forgetMethodCalls, 0, 'We have not called the forget method');
    forgetMethodCalls = 0;

    await user.save();

    assert.strictEqual(forgetMethodCalls, 0, 'We still have not called the forget method');
    forgetMethodCalls = 0;
    expectedIdentifier = userIdentifier;

    user.unloadRecord();
    await settled();

    assert.strictEqual(forgetMethodCalls, 1, 'We called the forget method');
  });

  test(`The forget method is called when a record unload results in full removal`, async function (assert) {
    let forgetMethodCalls = 0;
    const expectedIdentifiers: ResourceKey[] = [];

    class Container extends Model {
      @belongsTo('retainer', { async: false, inverse: 'container' })
      retainer;
      @attr() name;
    }

    class Retainer extends Model {
      @belongsTo('container', { async: false, inverse: 'retainer' })
      container;
      @belongsTo('retained-record', { async: true, inverse: 'retainer' })
      retained;
      @attr() name;
    }

    class RetainedRecord extends Model {
      @belongsTo('retainer', { async: true, inverse: 'retained' })
      retainer;
      @attr() name;
    }

    const { owner } = this;
    owner.register('model:container', Container);
    owner.register('model:retainer', Retainer);
    owner.register('model:retained-record', RetainedRecord);

    setIdentifierForgetMethod((identifier) => {
      forgetMethodCalls++;
      const expectedIdentifier = expectedIdentifiers.shift();
      if (expectedIdentifier) {
        assert.strictEqual(
          expectedIdentifier,
          identifier,
          `We forgot the expected identifier ${expectedIdentifier.lid}`
        );
      } else {
        assert.ok(false, 'Missing expected identifier');
      }
    });

    // no retainers
    const store = this.owner.lookup('service:store') as unknown as Store;
    const freeWillie = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          username: '@runspired',
          firstName: 'Chris',
        },
      },
    }) as Model;
    const freeWillieIdentifier = recordIdentifierFor(freeWillie);
    expectedIdentifiers.push(freeWillieIdentifier);

    freeWillie.unloadRecord();
    await settled();

    assert.strictEqual(forgetMethodCalls, 1, 'We called the forget method once');
    forgetMethodCalls = 0;

    // an async relationship retains
    const jailBird = store.push({
      data: {
        type: 'retained-record',
        id: '1',
        attributes: {
          name: "It's a Trap!",
        },
        relationships: {
          retainer: {
            data: { type: 'retainer', id: '1' },
          },
        },
      },
    }) as Model;

    // the aforementioned async retainer
    const gatekeeper = store.push({
      data: {
        type: 'retainer',
        id: '1',
        attributes: {
          name: 'Imperative Storm Trapper',
        },
        relationships: {
          retained: {
            data: { type: 'retained-record', id: '1' },
          },
          container: {
            data: { type: 'container', id: '1' },
          },
        },
      },
    }) as Model;

    // a sync reference to a record we will unload
    const jailhouse = store.push({
      data: {
        type: 'container',
        id: '1',
        attributes: {
          name: 'callback-hell',
        },
        relationships: {
          retainer: { data: { type: 'retainer', id: '1' } },
        },
      },
    }) as Model;

    const jailBirdIdentifier = recordIdentifierFor(jailBird);
    const gatekeeperIdentifier = recordIdentifierFor(gatekeeper);
    const jailhouseIdentifier = recordIdentifierFor(jailhouse);

    jailBird.unloadRecord();
    await settled();

    assert.strictEqual(forgetMethodCalls, 0, 'We have not yet called the forget method');
    forgetMethodCalls = 0;
    expectedIdentifiers.push(gatekeeperIdentifier, jailBirdIdentifier);

    gatekeeper.unloadRecord();
    await settled();

    assert.strictEqual(forgetMethodCalls, 2, 'We cleaned up both identifiers');
    forgetMethodCalls = 0;
    expectedIdentifiers.push(jailhouseIdentifier);

    jailhouse.unloadRecord();
    await settled();

    assert.strictEqual(forgetMethodCalls, 1, 'We clean up records with sync relationships');
  });
});
