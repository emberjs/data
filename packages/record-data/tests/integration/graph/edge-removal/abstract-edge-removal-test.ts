import { settled } from '@ember/test-helpers';

import { module, test as runTest } from 'qunit';

import type { TestConfig } from './helpers';
import { setInitialState, testFinalState } from './helpers';
import type { Context } from './setup';
import { setupGraphTest } from './setup';

/**
 * qunit-console-grouper groups by test but includes setup/teardown
 * and in-test as all one block. Adding this grouping allows us to
 * clearly notice when a log came during the test vs during setup/teardown.
 *
 * We should upstream this behavior to qunit-console-grouper
 */
async function test(name: string, callback) {
  const fn = async function (this: Context, ...args) {
    console.groupCollapsed(name); // eslint-disable-line no-console
    try {
      await callback.call(this, ...args);
    } finally {
      console.groupEnd(); // eslint-disable-line no-console
      console.log(`====(Begin Test Teardown)====`); // eslint-disable-line no-console
    }
  };
  return runTest(name, fn);
}

module('Integration | Graph | Edge Removal', function (hooks) {
  setupGraphTest(hooks);

  /**
   * These are the various configurations we run tests for on the graph
   * to ensure things are working.
   *
   * We don't currently test 1:many or many:1 relationships. It's unclear
   * if the semantics of these are different enough to require additional
   * scenarios.
   *
   * name: the name of the test
   * async: whether the relationship should be async or sync (both sides will conform to this)
   * relType: whether the relationship should be belongsTo (1:1) or hasMany (many:many)
   * inverseNull: whether the relationships should specify inverse: null instead of an explicit inverse.
   */
  const TestScenarios: TestConfig[] = [
    {
      name: 'sync belongsTo',
      async: false,
      relType: 'belongsTo',
      inverseNull: false,
    },
    {
      name: 'async belongsTo',
      async: true,
      relType: 'belongsTo',
      inverseNull: false,
    },
    {
      name: 'sync implicit belongsTo',
      async: false,
      relType: 'belongsTo',
      inverseNull: true,
    },
    {
      name: 'async implicit belongsTo',
      async: true,
      relType: 'belongsTo',
      inverseNull: true,
    },
    {
      name: 'sync hasMany',
      async: false,
      relType: 'hasMany',
      inverseNull: false,
    },
    {
      name: 'async hasMany',
      async: true,
      relType: 'hasMany',
      inverseNull: false,
    },
    {
      name: 'sync implicit hasMany',
      async: false,
      relType: 'hasMany',
      inverseNull: true,
    },
    {
      name: 'async implicit hasMany',
      async: true,
      relType: 'hasMany',
      inverseNull: true,
    },
  ].map((v) => (Object.freeze ? Object.freeze(v) : v) as TestConfig);

  module('Unpersisted Deletion of Record does not remove it from the graph', function () {
    function unpersistedDeletionTest(config: TestConfig) {
      test(config.name, async function (this: Context, assert) {
        const testState = await setInitialState(this, config, assert);
        const { john } = testState;

        // now we delete
        john.deleteRecord();

        // just in case there is a backburner flush
        await settled();

        /**
         * For deletions, since no state change has been persisted, we expect the cache to still
         * reflect the same state of the relationship as prior to the call to deleteRecord.
         *
         * Ergo we expect no entries removed (`removed: false`) and for no caches
         * to have been deleted (`cleared: false`)
         *
         * However: for a newly created record any form of rollback, unload or persisted delete
         * will result in it being destroyed and cleared
         */
        await testFinalState(
          this,
          testState,
          config,
          { removed: !!config.useCreate, cleared: !!config.useCreate, implicitCleared: !!config.useCreate },
          assert
        );
      });
    }

    TestScenarios.forEach(unpersistedDeletionTest);
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[Newly Created] ${testConfig.name}`, useCreate: true });
      unpersistedDeletionTest(config);
    });
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[LOCAL STATE] ${testConfig.name}`, dirtyLocal: true });
      unpersistedDeletionTest(config);
    });
  });

  module('Unload of a Record does not remove it from the graph', function () {
    function unloadTest(_config: TestConfig) {
      test(_config.name, async function (this: Context, assert) {
        const config = Object.assign({}, _config, { isUnloadAsDelete: true });
        const testState = await setInitialState(this, config, assert);
        const { john } = testState;

        // now we unload
        john.unloadRecord();

        // just in case there is a backburner flush
        await settled();

        /**
         * For unload, we treat it as a persisted deletion for new records and for sync relationships and
         * as no-change for async relationships.
         *
         * For local-changes of implicit hasMany relationships we expect the relationships to be cleared as well,
         * this special case is handled within ./helpers.ts and is something we can ideally delete as a behavior
         * in the future.
         *
         * For newly created records we expect the inverse to be cleaned up (chris) but for the relationships
         * for the newly created record to be fully intact. There's no particularly good reason for this other than
         * we've counted on the record's destroyed state removing these objects from the graph. The inverse relationship
         * state containers will have removed any retained info about the newly created record.
         *
         * Finally, we expect that even though the relationships on `john` could have been removed in the `sync` case
         * that they won't be removed in either case from local and only if from remote if dirtyLocal or useCreate is true.
         * The relationships in this case will still be removed from chris. We are possibly retaining these relationships
         * despite transitioning the record to an `empty` state in the off chance we need to rematerialize the record.
         * Likely for most cases this is just a bug.
         *
         * If this is confusing that's exactly why we've now added this test suite. People depend on this weirdly
         * observable behavior, so we want to know when it changes.
         */

        // we remove if the record was new or if the relationship was sync (client side delete semantics)
        let removed = config.useCreate || !config.async;
        // we clear sync non-implicit relationships (client side delete semantics)
        let cleared = !config.async && !config.inverseNull;

        await testFinalState(this, testState, config, { removed, cleared, implicitCleared: true }, assert);
      });
    }

    TestScenarios.forEach(unloadTest);
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[Newly Created] ${testConfig.name}`, useCreate: true });
      unloadTest(config);
    });
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[LOCAL STATE] ${testConfig.name}`, dirtyLocal: true });
      unloadTest(config);
    });
  });

  module('Persisted Deletion w/o dematerialization of Record removes it from the graph', function (hooks) {
    function persistedDeletionTest(config: TestConfig) {
      test(config.name, async function (this: Context, assert) {
        const testState = await setInitialState(this, config, assert);
        const { john } = testState;

        // now we delete
        john.deleteRecord();

        // persist the deletion (but note no call to unloadRecord)
        await john.save();

        /**
         * For persisted deletions, we expect the cache to have removed all entries for
         * the deleted record from both explicit and implicit inverses.
         *
         * Ergo we expect entries removed (`removed: true`) and for all caches
         * to have been deleted (`cleared: true`)
         *
         * For unclear reasons, currently sync hasMany relationships are emptied
         * but not cleared prior to dematerialization after a persisted delete
         * only when there is dirty local state. (`cleared: false`) while the
         * implicit caches are still cleared.
         *
         * This could be either an intentional or unintentional bug caused by the need
         * to be able to sometimes resurrect a many array during unload.
         */
        let cleared = true;
        if (config.relType === 'hasMany' && !config.async && config.dirtyLocal) {
          cleared = false;
        }
        await testFinalState(this, testState, config, { removed: true, cleared, implicitCleared: true }, assert);
      });
    }

    TestScenarios.forEach(persistedDeletionTest);
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[Newly Created] ${testConfig.name}`, useCreate: true });
      persistedDeletionTest(config);
    });
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[LOCAL STATE] ${testConfig.name}`, dirtyLocal: true });
      persistedDeletionTest(config);
    });
  });

  module('Persisted Deletion + dematerialization of Record removes it from the graph and cleans up', function (hooks) {
    function persistedDeletionUnloadedTest(config: TestConfig) {
      test(config.name, async function (this: Context, assert) {
        const testState = await setInitialState(this, config, assert);
        const { john } = testState;

        // now we delete
        john.deleteRecord();
        await john.save();
        john.unloadRecord();

        await settled();

        await testFinalState(this, testState, config, { removed: true, cleared: true }, assert);
      });
    }

    TestScenarios.forEach(persistedDeletionUnloadedTest);
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[Newly Created] ${testConfig.name}`, useCreate: true });
      persistedDeletionUnloadedTest(config);
    });
    TestScenarios.forEach((testConfig) => {
      const config = Object.assign({}, testConfig, { name: `[LOCAL STATE] ${testConfig.name}`, dirtyLocal: true });
      persistedDeletionUnloadedTest(config);
    });
  });
});
