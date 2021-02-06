import { set } from '@ember/object';

import { module, test } from 'qunit';
import { all, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import Store, {
  recordIdentifierFor,
  setIdentifierForgetMethod,
  setIdentifierGenerationMethod,
  setIdentifierResetMethod,
  setIdentifierUpdateMethod,
} from '@ember-data/store';
import { identifierCacheFor } from '@ember-data/store/-private';

type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type ConfidentDict<T> = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<T>;
type ExistingResourceObject = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').ExistingResourceObject;

function isNonEmptyString(str: any): str is string {
  return typeof str === 'string' && str.length > 0;
}

module('Integration | Identifiers - scenarios', function(hooks) {
  setupTest(hooks);

  module('Secondary Cache based on an attribute', function(hooks) {
    let store;
    let calls;
    let isQuery = false;
    let secondaryCache: {
      id: ConfidentDict<string>;
      username: ConfidentDict<string>;
    };
    class TestSerializer extends Serializer {
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
        return resolve({
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

    hooks.beforeEach(function() {
      const { owner } = this;

      class User extends Model {
        @attr() firstName: string;
        @attr() username: string;
        @attr() age: number;
      }

      owner.register('adapter:application', TestAdapter);
      owner.register('serializer:application', TestSerializer);
      owner.register('model:user', User);
      owner.register('service:store', Store);

      store = owner.lookup('service:store');
      calls = {
        findRecord: 0,
        queryRecord: 0,
      };

      let localIdInc = 9000;
      secondaryCache = {
        id: Object.create(null),
        username: Object.create(null),
      };
      const generationMethod = (resource: ExistingResourceObject) => {
        if (typeof resource.type !== 'string' || resource.type.length < 1) {
          throw new Error(`Cannot generate an lid for a record without a type`);
        }

        if (resource.type === 'user') {
          let lid = resource.lid;
          let username = resource.attributes && resource.attributes.username;

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
        if (typeof resource.lid === 'string' && resource.lid.length > 0) {
          return resource.lid;
        }

        if (typeof resource.id === 'string' && resource.id.length > 0) {
          return `remote:${resource.type}:${resource.id}`;
        }

        return `local:${resource.type}:${localIdInc++}`;
      };

      setIdentifierGenerationMethod(generationMethod);
    });

    hooks.afterEach(function() {
      setIdentifierGenerationMethod(null);
      setIdentifierResetMethod(null);
      setIdentifierUpdateMethod(null);
      setIdentifierForgetMethod(null);
    });

    test(`findRecord id then queryRecord with username`, async function(assert) {
      const recordById = await store.findRecord('user', '1');
      const identifierById = recordIdentifierFor(recordById);
      const recordByUsername = await store.queryRecord('user', { username: '@runspired' });
      const identifierByUsername = recordIdentifierFor(recordByUsername);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(calls.queryRecord, 1, 'We made one call to Adapter.queryRecord');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });
    test(`queryRecord with username then findRecord with id`, async function(assert) {
      const recordByUsername = await store.queryRecord('user', { username: '@runspired' });
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordById = await store.findRecord('user', '1');
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 0, 'We made zero calls to Adapter.findRecord');
      assert.strictEqual(calls.queryRecord, 1, 'We made one call to Adapter.queryRecord');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });
    test(`queryRecord with username and findRecord with id in parallel`, async function(assert) {
      const recordByUsernamePromise1 = store.queryRecord('user', { username: '@runspired' });
      const recordByIdPromise = store.findRecord('user', '1');
      const recordByUsernamePromise2 = store.queryRecord('user', { username: '@runspired' });

      const recordByUsername1 = await recordByUsernamePromise1;
      const recordById = await recordByIdPromise;
      const recordByUsername2 = await recordByUsernamePromise2;

      const identifierById = recordIdentifierFor(recordById);
      const identifierByUsername1 = recordIdentifierFor(recordByUsername1);
      const identifierByUsername2 = recordIdentifierFor(recordByUsername2);

      assert.strictEqual(identifierById, identifierByUsername1, 'The identifiers should be identical');
      assert.strictEqual(identifierById, identifierByUsername2, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername1, 'The records should be identical');
      assert.strictEqual(recordById, recordByUsername2, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(calls.queryRecord, 2, 'We made two calls to Adapter.queryRecord');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername1.lid}' in ['${lids.join("', '")}']`
      );
    });
  });

  module('Secondary Cache using an attribute as an alternate id', function(hooks) {
    let store;
    let calls;
    let isQuery = false;
    let secondaryCache: ConfidentDict<string>;
    class TestSerializer extends Serializer {
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
        return resolve({
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

    hooks.beforeEach(function() {
      const { owner } = this;

      class User extends Model {
        @attr() firstName: string;
        @attr() username: string;
        @attr() age: number;
      }

      owner.register('adapter:application', TestAdapter);
      owner.register('serializer:application', TestSerializer);
      owner.register('model:user', User);
      owner.register('service:store', Store);

      store = owner.lookup('service:store');
      calls = {
        findRecord: 0,
        queryRecord: 0,
      };

      let localIdInc = 9000;
      secondaryCache = Object.create(null);

      function lidForUser(resource) {
        if (resource.type === 'user') {
          let lid = resource.lid;
          let username = resource.attributes && resource.attributes.username;

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
      }

      const generationMethod = (resource: ExistingResourceObject) => {
        if (typeof resource.type !== 'string' || resource.type.length < 1) {
          throw new Error(`Cannot generate an lid for a record without a type`);
        }

        if (resource.type === 'user') {
          return lidForUser(resource);
        }

        // handle non user cases
        if (typeof resource.lid === 'string' && resource.lid.length > 0) {
          return resource.lid;
        }

        if (typeof resource.id === 'string' && resource.id.length > 0) {
          return `remote:${resource.type}:${resource.id}`;
        }

        return `local:${resource.type}:${localIdInc++}`;
      };

      const updateMethod = (identifier: StableRecordIdentifier, resource: ExistingResourceObject) => {
        resource.lid = identifier.lid;
        lidForUser(resource);
      };

      setIdentifierGenerationMethod(generationMethod);
      setIdentifierUpdateMethod(updateMethod);
    });

    hooks.afterEach(function() {
      setIdentifierGenerationMethod(null);
      setIdentifierResetMethod(null);
      setIdentifierUpdateMethod(null);
      setIdentifierForgetMethod(null);
    });

    test(`findRecord by id then by username as id`, async function(assert) {
      const recordById = await store.findRecord('user', '1');
      const identifierById = recordIdentifierFor(recordById);
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made only one call to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`findRecord by username as id then by id`, async function(assert) {
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordById = await store.findRecord('user', '1');
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`findRecord username and findRecord id in parallel`, async function(assert) {
      const recordByUsernamePromise = store.findRecord('user', '@runspired');
      const recordByIdPromise = store.findRecord('user', '1');

      const [recordByUsername, recordById] = await all([recordByUsernamePromise, recordByIdPromise]);

      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 2, 'We made two calls to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );

      // ensure we still use secondary caching for @runspired post-merging of the identifiers
      const recordByUsernameAgain = await store.findRecord('user', '@runspired');
      const identifier = recordIdentifierFor(recordByUsernameAgain);

      assert.strictEqual(identifierById, identifier, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsernameAgain, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 2, 'We made two calls to Adapter.findRecord');
      assert.strictEqual(recordByUsernameAgain.id, '1', 'The record id is correct');
      assert.strictEqual(identifier.id, '1', 'The identifier id is correct');
    });

    test(`findRecord by username and again`, async function(assert) {
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordByUsername2 = await store.findRecord('user', '@runspired');
      const identifierByUsername2 = recordIdentifierFor(recordByUsername2);

      assert.strictEqual(identifierByUsername2, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordByUsername2, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 1, 'We made one call to Adapter.findRecord');
      assert.strictEqual(recordByUsername.id, '1', 'The record id is correct');
      assert.strictEqual(identifierByUsername.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
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
    test(`findRecord by username and reload`, async function(assert) {
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);
      const recordByUsername2 = await store.findRecord('user', '@runspired', { reload: true });
      const identifierByUsername2 = recordIdentifierFor(recordByUsername2);

      assert.strictEqual(identifierByUsername2, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordByUsername2, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 2, 'We made two calls to Adapter.findRecord');
      assert.strictEqual(recordByUsername.id, '1', 'The record id is correct');
      assert.strictEqual(identifierByUsername.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`push id then findRecord username`, async function(assert) {
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
      });
      const identifierById = recordIdentifierFor(recordById);
      const recordByUsername = await store.findRecord('user', '@runspired');
      const identifierByUsername = recordIdentifierFor(recordByUsername);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(calls.findRecord, 0, 'We made zero calls to Adapter.findRecord');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`findRecord username then push id`, async function(assert) {
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
      });
      const identifierById = recordIdentifierFor(recordById);

      assert.strictEqual(identifierById, identifierByUsername, 'The identifiers should be identical');
      assert.strictEqual(recordById, recordByUsername, 'The records should be identical');
      assert.strictEqual(recordById.id, '1', 'The record id is correct');
      assert.strictEqual(identifierById.id, '1', 'The identifier id is correct');

      // ensure we truly are in a good state internally
      const internalModels = store._internalModelsFor('user')._models;
      assert.strictEqual(internalModels.length, 1, 'Once settled there is only a single internal-model');
      const lidCache = identifierCacheFor(store)._cache.lids;
      const lids = Object.keys(lidCache);
      assert.strictEqual(
        lids.length,
        1,
        `We only have the lid '${identifierByUsername.lid}' in ['${lids.join("', '")}']`
      );
    });

    test(`secondary-key mutation`, async function(assert) {
      const adapter = store.adapterFor('application');
      let hasSaved = false;

      adapter.findRecord = (_, __, id) => {
        if (hasSaved && id === '@runspired') {
          throw new Error(`No record found for the username @runspired`);
        }
        return resolve({
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
        return resolve({
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

      const user = await store.findRecord('user', '@runspired');
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
        assert.strictEqual(e.message, `No record found for the username @runspired`, 'We throw an error');
      }
    });
  });
});
