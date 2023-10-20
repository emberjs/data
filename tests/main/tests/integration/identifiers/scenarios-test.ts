import EmberObject, { set } from '@ember/object';

import type { IdentifierBucket, StableIdentifier, StableRecordIdentifier } from '@warp-drive/core/identifier';
import { module, test } from 'qunit';

import type Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import {
  recordIdentifierFor,
  setIdentifierForgetMethod,
  setIdentifierGenerationMethod,
  setIdentifierResetMethod,
  setIdentifierUpdateMethod,
} from '@ember-data/store';
import type { GenerationMethod, ResourceData } from '@ember-data/store/-types/q/identifier';

function isNonEmptyString(str: any): str is string {
  return typeof str === 'string' && str.length > 0;
}

function isResourceData(resource: object): resource is ResourceData {
  return 'lid' in resource || 'id' in resource || 'attributes' in resource;
}

module('Integration | Identifiers - scenarios', function (hooks) {
  setupTest(hooks);

  module('Secondary Cache based on an attribute', function (innerHooks) {
    let calls;
    let isQuery = false;
    let secondaryCache: {
      id: { [key: string]: string };
      username: { [key: string]: string };
    };
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      shouldBackgroundReloadRecord() {
        return false;
      }
      findRecord() {
        if (isQuery !== true) {
          calls.findRecord++;
        }
        isQuery = false;
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
      queryRecord() {
        calls.queryRecord++;
        isQuery = true;
        return this.findRecord();
      }
    }

    innerHooks.beforeEach(function () {
      const { owner } = this;

      class User extends Model {
        @attr()
        declare firstName: string;
        @attr()
        declare username: string;
        @attr()
        declare age: number;
      }

      owner.register('adapter:application', TestAdapter);
      owner.register('serializer:application', TestSerializer);
      owner.register('model:user', User);

      calls = {
        findRecord: 0,
        queryRecord: 0,
      };

      let localIdInc = 9000;
      secondaryCache = {
        id: Object.create(null),
        username: Object.create(null),
      };
      const generationMethod: GenerationMethod = (resource: unknown, bucket: IdentifierBucket) => {
        if (bucket !== 'record') {
          throw new Error('Test cannot generate an lid for a non-record');
        }
        if (typeof resource !== 'object' || resource === null) {
          throw new Error('Test cannot generate an lid for a non-object');
        }
        if (!('type' in resource) || typeof resource.type !== 'string' || resource.type.length < 1) {
          throw new Error(`Cannot generate an lid for a record without a type`);
        }

        if (resource.type === 'user') {
          if (!isResourceData(resource)) {
            return `local:user:${localIdInc++}`;
          }

          let lid = resource.lid;
          let username = 'attributes' in resource && resource.attributes && resource.attributes.username;

          // try the username cache
          if (!lid && isNonEmptyString(username)) {
            lid = secondaryCache.username[username];
          }

          // try the id cache
          if (!lid && isNonEmptyString(resource.id)) {
            // if no entry, fallback to generation
            lid = secondaryCache.id[resource.id] || `remote:user:${resource.id}`;
          }

          // generate from username if still undefined
          if (!lid && isNonEmptyString(username)) {
            lid = `remote:user:${username}`;
          }

          // generate at random if still undefined
          if (!lid) {
            lid = `local:user:${localIdInc++}`;
          }

          // sync all possible caches
          if (isNonEmptyString(username)) {
            secondaryCache.username[username] = lid;
          }
          if (isNonEmptyString(resource.id)) {
            secondaryCache.id[resource.id] = lid;
          }

          return lid;
        }

        // handle non user cases
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

    innerHooks.afterEach(function () {
      setIdentifierGenerationMethod(null);
      setIdentifierResetMethod(null);
      setIdentifierUpdateMethod(null);
      setIdentifierForgetMethod(null);
    });

    test(`findRecord id then queryRecord with username`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordById = await store.findRecord('user', '1');
      const identifierById = recordIdentifierFor(recordById);
      const recordByUsername = await store.queryRecord('user', { username: '@runspired' });
      const identifierByUsername = recordIdentifierFor(recordByUsername!);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(calls.queryRecord, 1, 'We made one call to Adapter.queryRecord');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });
    test(`queryRecord with username then findRecord with id`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsername = await store.queryRecord('user', { username: '@runspired' });
      const identifierByUsername = recordIdentifierFor(recordByUsername!);
      const recordById = await store.findRecord('user', '1');
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 0, 'We made zero calls to Adapter.findRecord');
      assert.strictEqual(calls.queryRecord, 1, 'We made one call to Adapter.queryRecord');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });
    test(`queryRecord with username and findRecord with id in parallel`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsernamePromise1 = store.queryRecord('user', { username: '@runspired' });
      const recordByIdPromise = store.findRecord('user', '1');
      const recordByUsernamePromise2 = store.queryRecord('user', { username: '@runspired' });

      const recordByUsername1 = await recordByUsernamePromise1;
      const recordById = await recordByIdPromise;
      const recordByUsername2 = await recordByUsernamePromise2;

      const identifierById = recordIdentifierFor(recordById);
      const identifierByUsername1 = recordIdentifierFor(recordByUsername1!);
      const identifierByUsername2 = recordIdentifierFor(recordByUsername2!);

      assert.strictEqual(identifierById, identifierByUsername1, 'The identifiers should be identical');
      assert.strictEqual(identifierById, identifierByUsername2, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername1, 'The records should be identical');
      assert.strictEqual(recordById, recordByUsername2, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(calls.queryRecord, 2, 'We made two calls to Adapter.queryRecord');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername1.lid}' in ['${lids.join("', '")}']`
      );
    });
  });

  module('Secondary Cache using an attribute as an alternate id', function (innerHooks) {
    let calls;
    let isQuery = false;
    let secondaryCache: { [key: string]: string };
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      shouldBackgroundReloadRecord() {
        return false;
      }
      findRecord() {
        if (isQuery !== true) {
          calls.findRecord++;
        }
        isQuery = false;
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
      queryRecord() {
        calls.queryRecord++;
        isQuery = true;
        return this.findRecord();
      }
    }

    class User extends Model {
      @attr()
      declare firstName: string;
      @attr()
      declare username: string;
      @attr()
      declare age: number;
    }

    innerHooks.beforeEach(function () {
      const { owner } = this;

      owner.register('adapter:application', TestAdapter);
      owner.register('serializer:application', TestSerializer);
      owner.register('model:user', User);

      calls = {
        findRecord: 0,
        queryRecord: 0,
      };

      let localIdInc = 9000;
      secondaryCache = Object.create(null);

      function lidForUser(resource: ResourceData | { type: string }): string {
        if ('type' in resource && resource.type === 'user') {
          if (!isResourceData(resource)) {
            return `local:user:${localIdInc++}`;
          }
          let lid = resource.lid;
          let username = 'attributes' in resource && resource.attributes && resource.attributes.username;

          // try the username cache
          if (!lid && isNonEmptyString(username)) {
            lid = secondaryCache[username];
          }

          // try the id cache
          if (!lid && isNonEmptyString(resource.id)) {
            // first treat as id
            // then treat as username
            // if still no entry, fallback to generation
            lid = secondaryCache[resource.id] || `remote:user:${resource.id}:${localIdInc++}`;
          }

          // generate from username if still undefined
          if (!lid && isNonEmptyString(username)) {
            lid = `remote:user:${username}:${localIdInc++}`;
          }

          // generate at random if still undefined
          if (!lid) {
            lid = `local:user:${localIdInc++}`;
          }

          // sync all possible caches
          if (isNonEmptyString(username)) {
            secondaryCache[username] = lid;
          }
          if (isNonEmptyString(resource.id)) {
            secondaryCache[resource.id] = lid;
          }

          return lid;
        }
        throw new Error(`Unexpected resource type ${'type' in resource ? resource.type : 'NO TYPE DECLARED'}`);
      }

      const generationMethod: GenerationMethod = (resource: unknown, bucket: IdentifierBucket): string => {
        if (bucket !== 'record') {
          throw new Error('Test cannot generate an lid for a non-record');
        }
        if (typeof resource !== 'object' || resource === null) {
          throw new Error('Test cannot generate an lid for a non-object');
        }
        if (!('type' in resource) || typeof resource.type !== 'string' || resource.type.length < 1) {
          throw new Error(`Cannot generate an lid for a record without a type`);
        }

        if (resource.type === 'user') {
          if (!isResourceData(resource)) {
            throw new Error(`Invalid resource data for user in test`);
          }
          return lidForUser(resource);
        }

        // handle non user cases
        if ('lid' in resource && typeof resource.lid === 'string' && resource.lid.length > 0) {
          return resource.lid;
        }

        if ('id' in resource && typeof resource.id === 'string' && resource.id.length > 0) {
          return `remote:${resource.type}:${resource.id}`;
        }

        return `local:${resource.type}:${localIdInc++}`;
      };

      const updateMethod = (
        identifier: StableIdentifier | StableRecordIdentifier,
        resource: ResourceData | unknown,
        bucket: 'record' | never
      ) => {
        if (bucket === 'record') {
          (resource as ResourceData).lid = identifier.lid;
          lidForUser(resource as ResourceData);
        } else {
          throw new Error(`Unhandled update for ${bucket}`);
        }
      };

      setIdentifierGenerationMethod(generationMethod);
      setIdentifierUpdateMethod(updateMethod);
    });

    innerHooks.afterEach(function () {
      setIdentifierGenerationMethod(null);
      setIdentifierResetMethod(null);
      setIdentifierUpdateMethod(null);
      setIdentifierForgetMethod(null);
    });

    test(`findRecord by id then by username as id`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordById = (await store.findRecord('user', '1')) as User;
      const identifierById = recordIdentifierFor(recordById);
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made only one call to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`findRecord by username as id then by id`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordById = (await store.findRecord('user', '1')) as User;
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`findRecord username and findRecord id in parallel`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsernamePromise = store.findRecord('user', '@runspired');
      const recordByIdPromise = store.findRecord('user', '1');

      const [recordByUsername, recordById] = (await Promise.all([recordByUsernamePromise, recordByIdPromise])) as [
        User,
        User,
      ];

      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 2, 'We made two calls to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );

      // ensure we still use secondary caching for @runspired post-merging of the identifiers
      const recordByUsernameAgain = (await store.findRecord('user', '@runspired')) as User;
      const identifier = recordIdentifierFor(recordByUsernameAgain);

      assert.strictEqual(identifierById, identifier, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsernameAgain, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 2, 'We made two calls to Adapter.findRecord');
      assert.strictEqual(recordByUsernameAgain.id, '1', 'The record id is correct');
      assert.strictEqual(identifier.id, '1', 'The identifier id is correct');
    });

    test(`findRecord by username and again`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsername = (await store.findRecord('user', '@runspired')) as User;
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordByUsername2 = (await store.findRecord('user', '@runspired')) as User;
      const identifierByUsername2 = recordIdentifierFor(recordByUsername2);

      assert.strictEqual(identifierByUsername2, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordByUsername2, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(recordByUsername.id, '1', 'The record id is correct');
      assert.strictEqual(identifierByUsername.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    /*
      Ideally in the scenario where two cache-keys refer to identical data
      the lid cache would be pre-populated.

      For `queryRecord` `store.push` and most other code-paths this will occur
      naturally.

      However prepopulation is not always possible as unfortunately `findRecord`
      greedily creates the identifier and internalModel using what limited info
      it has.

      In these cases we have the ability to finalize to a clean state:

      - no other request for the record by the other cache-key has occurred
        => single lid, single InternalModel, single Record generated

      - another request for the record by the other cache-key occurs prior
        to a payload having been received and used to populate any secondary
        lid caches
        => two lid's generated, two InternalModel's generated, single Record
            generated. The first payload to resolve should result in a merge
            and then

      Ideally findRecord is eliminated in favor of a form of query with an
        associated `lid`. Users may wish to implement a `findRecord` like
        API with such behavior themselves if they encounter too many edge
        cases with the scenario where records have multiple cache-keys in
        the "id" position.
    */
    test(`findRecord by username and reload`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsername = (await store.findRecord('user', '@runspired')) as User;
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordByUsername2 = (await store.findRecord('user', '@runspired', { reload: true })) as User;
      const identifierByUsername2 = recordIdentifierFor(recordByUsername2);

      assert.strictEqual(identifierByUsername2, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordByUsername2, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 2, 'We made two calls to Adapter.findRecord');
      assert.strictEqual(recordByUsername.id, '1', 'The record id is correct');
      assert.strictEqual(identifierByUsername.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`push id then findRecord username`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordById = store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            username: '@runspired',
            firstName: 'Chris',
            age: 31,
          },
        },
      }) as User;
      const identifierById = recordIdentifierFor(recordById);
      const recordByUsername = (await store.findRecord('user', '@runspired')) as User;
      const identifierByUsername = recordIdentifierFor(recordByUsername);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 0, 'We made zero calls to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`findRecord username then push id`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordById = store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            username: '@runspired',
            firstName: 'Chris',
            age: 31,
          },
        },
      }) as User;
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const lidCache = store.identifierCache._cache.resources;
      const lids = [...lidCache.values()];
      assert.strictEqual(
        lidCache.size,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`secondary-key mutation`, async function (assert) {
      const store = this.owner.lookup('service:store') as unknown as Store;
      const adapter = store.adapterFor('application');
      let hasSaved = false;

      adapter.findRecord = (_, __, id) => {
        if (hasSaved && id === '@runspired') {
          throw new Error(`No record found for the username @runspired`);
        }
        return Promise.resolve({
          data: {
            type: 'user',
            id: '1',
            attributes: {
              username: hasSaved ? '@cthoburn' : '@runspired',
            },
          },
        });
      };

      adapter.updateRecord = () => {
        hasSaved = true;
        return Promise.resolve({
          data: {
            type: 'user',
            id: '1',
            attributes: {
              username: '@cthoburn',
            },
          },
        });
      };

      function updateUsernameCache(identifier, oldUsername, newUsername) {
        if (secondaryCache[oldUsername] !== identifier.lid) {
          throw new Error(`Incorrect username update`);
        }
        if (secondaryCache[newUsername] && secondaryCache[newUsername] !== identifier.lid) {
          throw new Error(`Cannot update username to one used elsewhere`);
        }
        secondaryCache[newUsername] = identifier.lid;
      }
      function commitUsernameUpdate(identifier, oldUsername, newUsername) {
        if (secondaryCache[oldUsername] === identifier.lid) {
          delete secondaryCache[oldUsername];
        }
      }

      const user = (await store.findRecord('user', '@runspired')) as Model;
      const identifier = recordIdentifierFor(user);
      set(user, 'username', '@cthoburn');

      // eagerly update
      updateUsernameCache(identifier, '@runspired', '@cthoburn');

      const cthoburn = await store.findRecord('user', '@cthoburn');
      const runspired = await store.findRecord('user', '@runspired');
      const user1 = await store.findRecord('user', '1');

      assert.strictEqual(cthoburn, user, 'We can find by the new username');
      assert.strictEqual(runspired, user, 'We can find by the old username');
      assert.strictEqual(user1, user, 'We can find by the id');

      await user.save();

      // eliminate the old username
      commitUsernameUpdate(identifier, '@runspired', '@cthoburn');

      const cthoburnAfter = await store.findRecord('user', '@cthoburn');
      const user1After = await store.findRecord('user', '1');

      assert.strictEqual(cthoburnAfter, user, 'We can find by the new username');
      assert.strictEqual(user1After, user, 'We can find by the id');

      try {
        await store.findRecord('user', '@runspired');
        assert.ok(false, 'Expected an error to be thrown');
      } catch (e) {
        assert.strictEqual((e as Error).message, `No record found for the username @runspired`, 'We throw an error');
      }
    });
  });
});
