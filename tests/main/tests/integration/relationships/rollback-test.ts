import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { CollectionEdge } from '@ember-data/graph/-private';
import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo, type HasMany, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { ResourceKey } from '@warp-drive/core-types';
import { Type } from '@warp-drive/core-types/symbols';

class App extends Model {
  declare [Type]: 'app';

  @attr declare name: string;

  @hasMany('config', { async: false, inverse: 'app' }) declare configs: Config[];

  @hasMany('page', { async: false, inverse: 'app' }) declare pages: HasMany<Page>;

  @belongsTo('cluster', { async: false, inverse: 'apps' }) declare cluster: Cluster;
}

class Cluster extends Model {
  @attr declare name: string;

  @hasMany('app', { async: false, inverse: 'cluster' }) declare apps: App[];
}

class Config extends Model {
  @attr declare name: string;

  @belongsTo('app', { async: false, inverse: 'configs' }) declare app: App | null;
}

class Page extends Model {
  @attr declare name: string;

  @belongsTo('app', { async: false, inverse: 'configs' }) declare app: App | null;
}

module('Integration | Relationships | Rollback', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:app', App);
    owner.register('model:cluster', Cluster);
    owner.register('model:config', Config);
    owner.register('model:page', Page);

    // setup some initial state:
    // 1 app with 3 configs, a cluster and no pages (e.g. no permission for the pages field)
    // 1 config with no app
    // 2 apps with no configs and the same cluster
    const store = owner.lookup('service:store') as Store;
    store.push({
      data: [
        {
          id: '1',
          type: 'app',
          attributes: {
            name: 'app1',
          },
          relationships: {
            configs: {
              data: [
                { id: '1', type: 'config' },
                { id: '2', type: 'config' },
                { id: '3', type: 'config' },
              ],
            },
            cluster: {
              data: { id: '1', type: 'cluster' },
            },
          },
        },
        // configs
        {
          id: '1',
          type: 'config',
          attributes: {
            name: 'config1',
          },
          relationships: {
            app: {
              data: { id: '1', type: 'app' },
            },
          },
        },
        {
          id: '2',
          type: 'config',
          attributes: {
            name: 'config2',
          },
          relationships: {
            app: {
              data: { id: '1', type: 'app' },
            },
          },
        },
        {
          id: '3',
          type: 'config',
          attributes: {
            name: 'config3',
          },
          relationships: {
            app: {
              data: { id: '1', type: 'app' },
            },
          },
        },
        // config with no app
        {
          id: '4',
          type: 'config',
          attributes: {
            name: 'config4',
          },
        },
        // the cluster
        {
          id: '1',
          type: 'cluster',
          attributes: {
            name: 'cluster1',
          },
          relationships: {
            apps: {
              data: [
                { id: '1', type: 'app' },
                { id: '2', type: 'app' },
                { id: '3', type: 'app' },
              ],
            },
          },
        },
        // apps with no configs
        {
          id: '2',
          type: 'app',
          attributes: {
            name: 'app2',
          },
          relationships: {
            cluster: {
              data: { id: '1', type: 'cluster' },
            },
          },
        },
        {
          id: '3',
          type: 'app',
          attributes: {
            name: 'app3',
          },
          relationships: {
            cluster: {
              data: { id: '1', type: 'cluster' },
            },
          },
        },
      ],
    });
  });

  module('<cache>.hasChangedRelationships', function () {
    test('it returns false when no changes have occurred', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'no changes have occurred');

      const graph = graphFor(store);
      // (relationships that are not in the graph are not looped over by changedRelationships)
      const appRelationships = graph.identifiers.get(appIdentifier);
      assert.propEqual(
        appRelationships?.['pages'],
        undefined,
        'pages was never accessed and therefore does not exist on the graph'
      );

      /**
       * Pages was accessed (but has no remote state)
       */
      const app = store.peekRecord<App>('app', '1');
      const hasManyPages = graph?.get(appIdentifier, 'pages') as CollectionEdge;
      assert.false(hasManyPages.accessed, 'The `pages` property was not accessed');
      assert.propEqual(app?.pages, [], '(accessing `pages`) app.pages is empty');
      assert.strictEqual(hasManyPages.localState, null, 'localState of `pages` is null');
      assert.propEqual(hasManyPages.remoteState, [], 'remoteState of `pages` is []');
      assert.true((graph?.get(appIdentifier, 'pages') as CollectionEdge).accessed, 'The `pages` property was accessed');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'no changes have occurred');
    });
    test('it returns true when a hasMany has state added', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '4') as Config;
      app.configs.push(config);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state added');
    });
    test('it returns true when a hasMany has state removed', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '2') as Config;
      app.configs.splice(app.configs.indexOf(config), 1);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
    });
    test('it returns true when a hasMany has state re-ordered', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '1') as Config;
      app.configs.splice(app.configs.indexOf(config), 1);
      app.configs.push(config);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
    });
    test('it returns false when a mutated has-many has returned to its initial state', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '1') as Config;
      app.configs.shift();
      app.configs.unshift(config);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
    });
    test('it returns false when a belongsTo has no change', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config4Identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '4' });
      assert.false(store.cache.hasChangedRelationships(config4Identifier), 'a belongsTo has no change (null)');

      const config1Identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.false(store.cache.hasChangedRelationships(config1Identifier), 'a belongsTo has no change (populated)');
    });
    test('it returns true when a belongsTo has state added', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '4') as Config;
      config.app = app;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '4' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state added');
    });
    test('it returns true when a belongsTo has state removed', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = null;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state removed');
    });
    test('it returns true when a belongsTo has state replaced', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = store.peekRecord('app', '2') as App;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
    });
    test('it returns false when state has returned to the initial state', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = null;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
      config.app = store.peekRecord('app', '1') as App;
      assert.false(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
    });
  });

  module('<cache>.rollbackRelationships', function () {
    test('it returns an empty array when no changes have occurred', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });

      let changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, [], 'no changes have occurred');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'hasMany is clean');

      const graph = graphFor(store);
      // (relationships that are not in the graph are not looped over by changedRelationships)
      const appRelationships = graph.identifiers.get(appIdentifier);
      assert.propEqual(
        appRelationships?.['pages'],
        undefined,
        'pages was never accessed and therefore does not exist on the graph'
      );

      /**
       * Pages was accessed (but has no remote state)
       */
      const app = store.peekRecord<App>('app', '1');
      const hasManyPages = graph?.get(appIdentifier, 'pages') as CollectionEdge;
      assert.false(hasManyPages.accessed, 'The `pages` property was not accessed');
      assert.propEqual(app?.pages, [], '(accessing `pages`) app.pages is empty');
      assert.strictEqual(hasManyPages.localState, null, 'localState of `pages` is null');
      assert.propEqual(hasManyPages.remoteState, [], 'remoteState of `pages` is []');
      assert.true((graph?.get(appIdentifier, 'pages') as CollectionEdge).accessed, 'The `pages` property was accessed');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'no changes have occurred');
      changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, [], 'no changes have occurred');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'hasMany is clean');
    });

    test('it returns the correct keys when a hasMany has state added', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config1 = store.peekRecord('config', '1') as Config;
      const config2 = store.peekRecord('config', '2') as Config;
      const config3 = store.peekRecord('config', '3') as Config;
      const config4 = store.peekRecord('config', '4') as Config;
      app.configs.push(config4);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state added');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3, config4], 'hasMany has state added');
      assert.strictEqual(config4.app, app, 'config4 has state added');

      const changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, ['configs'], 'hasMany has rolled back');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany has rolled back');
      assert.strictEqual(config4.app, null, 'config4 has rolled back');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'hasMany is clean');
    });

    test('it returns the correct keys when a hasMany has state removed', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config1 = store.peekRecord('config', '1') as Config;
      const config2 = store.peekRecord('config', '2') as Config;
      const config3 = store.peekRecord('config', '3') as Config;
      app.configs.splice(app.configs.indexOf(config2), 1);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
      assert.arrayStrictEquals(app.configs, [config1, config3], 'hasMany has state added');
      assert.strictEqual(config2.app, null, 'config2 state cleared');

      const changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, ['configs'], 'hasMany has rolled back');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany has rolled back');
      assert.strictEqual(config2.app, app, 'config2 has rolled back');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'hasMany is clean');
    });

    test('it returns the correct keys when a hasMany has state re-ordered (no-initial access)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config1 = store.peekRecord('config', '1') as Config;
      const config2 = store.peekRecord('config', '2') as Config;
      const config3 = store.peekRecord('config', '3') as Config;
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });

      app.configs.splice(app.configs.indexOf(config1), 1);
      app.configs.push(config1);
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
      assert.arrayStrictEquals(app.configs, [config2, config3, config1], 'hasMany reordering has occurred');
      assert.strictEqual(config1.app, app, 'config1 app is correct');

      const changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, ['configs'], 'hasMany has rolled back');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany has restored the initial order');
      assert.strictEqual(config2.app, app, 'config2 has rolled back');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'hasMany is clean');
    });

    test('it returns the correct keys when a hasMany has state re-ordered', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config1 = store.peekRecord('config', '1') as Config;
      const config2 = store.peekRecord('config', '2') as Config;
      const config3 = store.peekRecord('config', '3') as Config;
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });

      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'the hasMany is in a clean state');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany is in the correct starting order');

      app.configs.splice(app.configs.indexOf(config1), 1);
      app.configs.push(config1);
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
      assert.arrayStrictEquals(app.configs, [config2, config3, config1], 'hasMany reordering has occurred');
      assert.strictEqual(config1.app, app, 'config1 app is correct');

      const changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, ['configs'], 'hasMany has rolled back');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany has restored the initial order');
      assert.strictEqual(config2.app, app, 'config2 has rolled back');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'hasMany is clean');
    });

    test('it returns an empty array when a mutated has-many has returned to its initial state', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config1 = store.peekRecord('config', '1') as Config;
      const config2 = store.peekRecord('config', '2') as Config;
      const config3 = store.peekRecord('config', '3') as Config;
      app.configs.shift();
      app.configs.unshift(config1);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany is correct');
      assert.strictEqual(config2.app, app, 'config2 is clean');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');

      const changed = store.cache.rollbackRelationships(appIdentifier);
      assert.arrayStrictEquals(changed, [], 'hasMany is clean');
      assert.arrayStrictEquals(app.configs, [config1, config2, config3], 'hasMany is correct');
      assert.strictEqual(config2.app, app, 'config2 is clean');
    });

    test('it returns an empty array when a belongsTo has no change', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config4Identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '4' });
      assert.false(store.cache.hasChangedRelationships(config4Identifier), 'a belongsTo has no change (null)');

      let changed = store.cache.rollbackRelationships(config4Identifier);
      assert.arrayStrictEquals(changed, [], 'relationship was clean');

      const config1Identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.false(store.cache.hasChangedRelationships(config1Identifier), 'a belongsTo has no change (populated)');

      changed = store.cache.rollbackRelationships(config1Identifier);
      assert.arrayStrictEquals(changed, [], 'relationship was clean');
    });

    test('it returns the correct keys when a belongsTo has state added', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '4') as Config;
      config.app = app;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '4' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state added');

      const changed = store.cache.rollbackRelationships(configIdentifier);
      assert.arrayStrictEquals(changed, ['app'], 'belongsTo has rolled back');
      assert.strictEqual(config.app, null, 'belongsTo has rolled back');
    });

    test('it returns the correct keys when a belongsTo has state removed', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      const app = config.app;
      config.app = null;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state removed');

      const changed = store.cache.rollbackRelationships(configIdentifier);
      assert.arrayStrictEquals(changed, ['app'], 'belongsTo has rolled back');
      assert.strictEqual(config.app, app, 'belongsTo has rolled back');
    });

    test('it returns the correct keys when a belongsTo has state replaced', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config1 = store.peekRecord('config', '1') as Config;
      const config2 = store.peekRecord('config', '2') as Config;
      const config3 = store.peekRecord('config', '3') as Config;

      // app.configs is [1, 2, 3] initially
      const app = config1.app!;

      // we update the config1.app to point at a different app,
      // which will remove config1 from app:1's list of configs
      config1.app = store.peekRecord('app', '2') as App;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });

      // confirm the mutation
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
      assert.arrayStrictEquals(app.configs, [config2, config3], 'inverse has updated');

      const changed = store.cache.rollbackRelationships(configIdentifier);

      assert.arrayStrictEquals(changed, ['app'], 'belongsTo has rolled back');
      assert.strictEqual(config1.app, app, 'belongsTo has rolled back');

      // this is in a different order because we don't rollback the inverse except for the smaller specific change
      // this is a bit of a weird case, but it's the way it works
      // if we were to rollback the inverse, we'd have to rollback the inverse of the inverse, and so on
      // we leave that to the user to do if they want to
      assert.arrayStrictEquals(app.configs, [config2, config3, config1], 'inverse has rolled back');
    });

    test('it returns an empty array when state has returned to the initial state', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = null;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
      config.app = store.peekRecord('app', '1') as App;
      assert.false(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');

      const changed = store.cache.rollbackRelationships(configIdentifier);
      assert.arrayStrictEquals(changed, [], 'belongsTo has rolled back');
      assert.strictEqual(config.app, store.peekRecord('app', '1') as App, 'belongsTo has rolled back');
    });

    test('relationship rollback can be repeated', function (assert) {
      class Message extends Model {
        @attr declare msg: string;
      }
      class Job extends Model {
        @attr declare name: string;
        @hasMany('message', { async: false, inverse: null }) declare messages: Message[];
      }

      this.owner.register('model:job', Job);
      this.owner.register('model:message', Message);
      const store = this.owner.lookup('service:store') as Store;

      const job = store.push({
        data: {
          id: '1',
          type: 'job',
          attributes: {
            name: 'First Job',
          },
        },
      }) as Job;

      const msg1 = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            msg: 'First Message',
          },
        },
      }) as Message;
      assert.strictEqual(job.messages.length, 0, 'job has 0 messages');
      const jobIdentifier = recordIdentifierFor(job);

      // add message, assert state, rollback, assert state is clean
      job.messages.push(msg1);
      assert.strictEqual(job.messages.length, 1, 'job has 1 message');

      const rollbackResult = store.cache.rollbackRelationships(jobIdentifier);
      assert.strictEqual(rollbackResult.length, 1, '1 rollbackRelations');
      assert.strictEqual(job.messages.length, 0, 'job has no message');

      // repeat the scenario to add a message and rollback
      job.messages.push(msg1);
      assert.strictEqual(job.messages.length, 1, 'job has 1 message');

      const rollbackResult2 = store.cache.rollbackRelationships(jobIdentifier);
      assert.strictEqual(rollbackResult2.length, 1, '1 rollbackRelations');
      assert.strictEqual(job.messages.length, 0, 'job has no message');
    });
  });

  module('<cache>.changedRelationships', function () {
    test('it returns an empty map when no changes have occurred', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'no changes have occurred');
      let changed = store.cache.changedRelationships(appIdentifier);
      assert.strictEqual(changed.size, 0, 'no changes have occurred');

      const graph = graphFor(store);
      // (relationships that are not in the graph are not looped over by changedRelationships)
      const appRelationships = graph.identifiers.get(appIdentifier);
      assert.propEqual(
        appRelationships?.['pages'],
        undefined,
        'pages was never accessed and therefore does not exist on the graph'
      );

      /**
       * Pages was accessed (but has no remote state)
       */
      const app = store.peekRecord<App>('app', '1');
      const hasManyPages = graph?.get(appIdentifier, 'pages') as CollectionEdge;
      assert.false(hasManyPages.accessed, 'The `pages` property was not accessed');
      assert.propEqual(app?.pages, [], '(accessing `pages`) app.pages is empty');
      assert.strictEqual(hasManyPages.localState, null, 'localState of `pages` is null');
      assert.propEqual(hasManyPages.remoteState, [], 'remoteState of `pages` is []');
      assert.true((graph?.get(appIdentifier, 'pages') as CollectionEdge).accessed, 'The `pages` property was accessed');
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'no changes have occurred');
      changed = store.cache.changedRelationships(appIdentifier);
      assert.strictEqual(changed.size, 0, 'no changes have occurred');
    });

    test('it returns the correct entries when a hasMany has state added', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      function identifier(type: string, id: string): ResourceKey {
        return store.cacheKeyManager.getOrCreateRecordIdentifier({ type, id });
      }

      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '4') as Config;
      app.configs.push(config);
      const appIdentifier = identifier('app', '1');
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state added');
      const changed = store.cache.changedRelationships(appIdentifier);
      assert.strictEqual(changed.size, 1, 'a hasMany has state added');

      const change = changed.get('configs');
      assert.ok(change, 'a hasMany has state added');

      // ensure the rest of the test runs smoothly with type checking / runtime correctness
      if (change?.kind !== 'collection') {
        throw new Error('expected a collection change');
      }
      assert.strictEqual(change.kind, 'collection', 'kind is collection');
      assert.strictEqual(change.additions.size, 1, 'one entry added');
      assert.strictEqual(change.removals.size, 0, 'no entries removed');
      assert.false(change.reordered, 'no order changes');
      assert.arrayStrictEquals(
        change.remoteState,
        [identifier('config', '1'), identifier('config', '2'), identifier('config', '3')],
        'original state is present'
      );
      assert.arrayStrictEquals(
        change.localState,
        [identifier('config', '1'), identifier('config', '2'), identifier('config', '3'), identifier('config', '4')],
        'config4 was added'
      );
    });

    test('it returns the correct entries when a hasMany has state removed', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      function identifier(type: string, id: string): ResourceKey {
        return store.cacheKeyManager.getOrCreateRecordIdentifier({ type, id });
      }

      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '2') as Config;
      app.configs.splice(app.configs.indexOf(config), 1);
      const appIdentifier = identifier('app', '1');
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');
      const changed = store.cache.changedRelationships(appIdentifier);
      assert.strictEqual(changed.size, 1, 'a hasMany has state added');

      const change = changed.get('configs');
      assert.ok(change, 'a hasMany has state added');

      // ensure the rest of the test runs smoothly with type checking / runtime correctness
      if (change?.kind !== 'collection') {
        throw new Error('expected a collection change');
      }
      assert.strictEqual(change.kind, 'collection', 'kind is collection');
      assert.strictEqual(change.additions.size, 0, 'no entry added');
      assert.strictEqual(change.removals.size, 1, 'one entries removed');
      assert.false(change.reordered, 'no order changes');
      assert.arrayStrictEquals(
        change.remoteState,
        [identifier('config', '1'), identifier('config', '2'), identifier('config', '3')],
        'original state is present'
      );
      assert.arrayStrictEquals(
        change.localState,
        [identifier('config', '1'), identifier('config', '3')],
        'config 2 was removed'
      );
    });

    test('it returns the correct entries when a hasMany has state re-ordered', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      function identifier(type: string, id: string): ResourceKey {
        return store.cacheKeyManager.getOrCreateRecordIdentifier({ type, id });
      }

      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '1') as Config;
      app.configs.splice(app.configs.indexOf(config), 1);
      app.configs.push(config);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.true(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state reordered');

      const changed = store.cache.changedRelationships(appIdentifier);
      assert.strictEqual(changed.size, 1, 'a hasMany has state added');

      const change = changed.get('configs');
      assert.ok(change, 'a hasMany has state added');

      // ensure the rest of the test runs smoothly with type checking / runtime correctness
      if (change?.kind !== 'collection') {
        throw new Error('expected a collection change');
      }
      assert.strictEqual(change.kind, 'collection', 'kind is collection');
      assert.strictEqual(change.additions.size, 0, 'no entry added');
      assert.strictEqual(change.removals.size, 0, 'no entries removed');
      assert.true(change.reordered, 'we detect the order changes');
      assert.arrayStrictEquals(
        change.remoteState,
        [identifier('config', '1'), identifier('config', '2'), identifier('config', '3')],
        'original state is present'
      );
      assert.arrayStrictEquals(
        change.localState,
        [identifier('config', '2'), identifier('config', '3'), identifier('config', '1')],
        'config 1 was moved'
      );
    });

    test('it returns empty when a mutated has-many has returned to its initial state', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '1') as Config;
      app.configs.shift();
      app.configs.unshift(config);
      const appIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      assert.false(store.cache.hasChangedRelationships(appIdentifier), 'a hasMany has state removed');

      const changed = store.cache.changedRelationships(appIdentifier);
      assert.strictEqual(changed.size, 0, 'a hasMany has no state added');
    });

    test('it returns empty when a belongsTo has no change', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      function identifier(type: string, id: string): ResourceKey {
        return store.cacheKeyManager.getOrCreateRecordIdentifier({ type, id });
      }

      const config4Identifier = identifier('config', '4');
      assert.false(store.cache.hasChangedRelationships(config4Identifier), 'a belongsTo has no change (null)');
      let changed = store.cache.changedRelationships(config4Identifier);
      assert.strictEqual(changed.size, 0, 'has no diff');

      const config1Identifier = identifier('config', '1');
      assert.false(store.cache.hasChangedRelationships(config1Identifier), 'a belongsTo has no change (populated)');
      changed = store.cache.changedRelationships(config1Identifier);
      assert.strictEqual(changed.size, 0, 'has no diff');
    });

    test('it returns the correct diff when a belongsTo has state added', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const app = store.peekRecord('app', '1') as App;
      const config = store.peekRecord('config', '4') as Config;
      config.app = app;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '4' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state added');
      const changed = store.cache.changedRelationships(configIdentifier);
      assert.strictEqual(changed.size, 1, 'a belongsTo has state added');

      const change = changed.get('app');
      assert.ok(change, 'a belongsTo has state added');

      // ensure the rest of the test runs smoothly with type checking / runtime correctness
      if (change?.kind !== 'resource') {
        throw new Error('expected a resource change');
      }

      assert.strictEqual(change.kind, 'resource', 'kind is resource');
      assert.strictEqual(change.remoteState, null, 'original state is null');
      assert.strictEqual(
        change.localState,
        store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' }),
        'app was added'
      );
    });

    test('it returns the correct diff when a belongsTo has state removed', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = null;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state removed');

      const changed = store.cache.changedRelationships(configIdentifier);
      assert.strictEqual(changed.size, 1, 'a belongsTo has a diff');

      const change = changed.get('app');
      assert.ok(change, 'the diff is present');

      // ensure the rest of the test runs smoothly with type checking / runtime correctness
      if (change?.kind !== 'resource') {
        throw new Error('expected a resource change');
      }

      assert.strictEqual(change.kind, 'resource', 'kind is resource');
      assert.strictEqual(
        change.remoteState,
        store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' }),
        'remote state is app 1'
      );
      assert.strictEqual(change.localState, null, 'new state is null');
    });

    test('it returns the correct diff when a belongsTo has state replaced', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = store.peekRecord('app', '2') as App;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');

      const changed = store.cache.changedRelationships(configIdentifier);
      assert.strictEqual(changed.size, 1, 'a belongsTo has a diff');

      const change = changed.get('app');
      assert.ok(change, 'the diff is present');

      // ensure the rest of the test runs smoothly with type checking / runtime correctness
      if (change?.kind !== 'resource') {
        throw new Error('expected a resource change');
      }

      assert.strictEqual(change.kind, 'resource', 'kind is resource');
      assert.strictEqual(
        change.remoteState,
        store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '1' }),
        'remote state is app 1'
      );
      assert.strictEqual(
        change.localState,
        store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'app', id: '2' }),
        'new state is app 2'
      );
    });

    test('it returns no diff when state has returned to the initial state', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      config.app = null;
      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      assert.true(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
      config.app = store.peekRecord('app', '1') as App;
      assert.false(store.cache.hasChangedRelationships(configIdentifier), 'a belongsTo has state replaced');
      const changed = store.cache.changedRelationships(configIdentifier);
      assert.strictEqual(changed.size, 0, 'we have no diff');
    });
  });

  module('<cache>.getRemoteRelationship', function () {
    test('it returns the correct remote relationship for a belongsTo', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const config = store.peekRecord('config', '1') as Config;
      const app2 = store.peekRecord('app', '2') as App;

      const configIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      const relationship = store.cache.getRelationship(configIdentifier, 'app');
      config.app = app2;
      const remote = store.cache.getRemoteRelationship(configIdentifier, 'app');
      assert.deepEqual(remote, relationship, 'remote relationship is correct');
    });
  });
});
