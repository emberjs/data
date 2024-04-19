// Remove once @hasMany is typed
import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/build-config/deprecations';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

import { deprecatedTest } from '../../setup-test';

module('Integration | Graph | Diff Preservation', function (hooks) {
  setupTest(hooks);

  deprecatedTest(
    'updateRelationship operation filters duplicates',
    {
      id: 'ember-data:deprecate-non-unique-relationship-entries',
      until: '6.0.0',
      count: 1,
    },
    function (assert) {
      const { owner } = this;

      class App extends Model {
        @attr declare name: string;
        @hasMany('config', { async: false, inverse: null }) declare configs: Config[];
      }

      class Config extends Model {
        @attr declare name: string;
      }

      owner.register('model:app', App);
      owner.register('model:config', Config);
      const store = owner.lookup('service:store') as unknown as Store;
      const graph = graphFor(store);
      const appIdentifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'app', id: '1' });

      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'configs',
          record: appIdentifier,
          value: {
            data: [
              { type: 'config', id: '1' },
              { type: 'config', id: '1' },
              { type: 'config', id: '1' },
              { type: 'config', id: '2' },
              { type: 'config', id: '3' },
              { type: 'config', id: '4' },
            ],
          },
        });
      });

      const data = graph.getData(appIdentifier, 'configs');
      assert.deepEqual(
        JSON.parse(JSON.stringify(data)),
        {
          data: [
            { type: 'config', id: '1', lid: '@lid:config-1' },
            { type: 'config', id: '2', lid: '@lid:config-2' },
            { type: 'config', id: '3', lid: '@lid:config-3' },
            { type: 'config', id: '4', lid: '@lid:config-4' },
          ],
        },
        'we have the expected data'
      );
    }
  );

  deprecatedTest(
    'replaceRelatedRecords operation filters duplicates in a local replace',
    {
      id: 'ember-data:deprecate-non-unique-relationship-entries',
      until: '6.0.0',
      count: 1,
    },
    function (assert) {
      const { owner } = this;

      class App extends Model {
        @attr declare name: string;
        @hasMany('config', { async: false, inverse: null }) declare configs: Config[];
      }

      class Config extends Model {
        @attr declare name: string;
      }

      owner.register('model:app', App);
      owner.register('model:config', Config);
      const store = owner.lookup('service:store') as unknown as Store;
      const graph = graphFor(store);
      const appIdentifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      const configIdentifier1 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'config', id: '1' });
      const configIdentifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'config', id: '2' });
      const configIdentifier3 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'config', id: '3' });
      const configIdentifier4 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'config', id: '4' });

      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: [
            configIdentifier1,
            configIdentifier1,
            configIdentifier1,
            configIdentifier2,
            configIdentifier3,
            configIdentifier4,
          ],
        });
      });

      const data = graph.getData(appIdentifier, 'configs');
      assert.deepEqual(
        JSON.parse(JSON.stringify(data)),
        {
          data: [
            { type: 'config', id: '1', lid: '@lid:config-1' },
            { type: 'config', id: '2', lid: '@lid:config-2' },
            { type: 'config', id: '3', lid: '@lid:config-3' },
            { type: 'config', id: '4', lid: '@lid:config-4' },
          ],
        },
        'we have the expected data'
      );
    }
  );

  if (!DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
    test('updateRelationship operation from the collection side does not clear local state', function (assert) {
      // tests that Many:Many, Many:One do not clear local state from
      // either side when updating the relationship from the Many side
      const { owner } = this;

      class App extends Model {
        @attr declare name: string;
        @hasMany('config', { async: false, inverse: 'app' }) declare configs: Config[];
        @hasMany('namespace', { async: false, inverse: 'apps' }) declare namespaces: Namespace | null;
      }

      class Namespace extends Model {
        @attr declare name: string;
        @hasMany('app', { async: false, inverse: 'namespaces' }) declare apps: App[];
      }

      class Config extends Model {
        @attr declare name: string;
        @belongsTo('app', { async: false, inverse: 'configs' }) declare app: App | null;
      }

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      owner.register('model:app', App);
      owner.register('model:namespace', Namespace);
      owner.register('model:config', Config);
      const store = owner.lookup('service:store') as unknown as Store;
      const graph = graphFor(store);
      const appIdentifier = identifier('app', '1');

      // set initial state
      // one app, with 4 configs and 4 namespaces
      // each config belongs to the app
      // each namespace has the app and 2 more namespaces
      store._join(() => {
        // setup primary app relationships
        // this also convers the belongsTo side on config
        graph.push({
          op: 'updateRelationship',
          field: 'configs',
          record: appIdentifier,
          value: {
            data: [
              { type: 'config', id: '1' },
              { type: 'config', id: '2' },
              { type: 'config', id: '3' },
              { type: 'config', id: '4' },
            ],
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'namespaces',
          record: appIdentifier,
          value: {
            data: [
              { type: 'namespace', id: '1' },
              { type: 'namespace', id: '2' },
              { type: 'namespace', id: '3' },
              { type: 'namespace', id: '4' },
            ],
          },
        });
        // setup namespace relationships
        ['1', '2', '3', '4'].forEach((id) => {
          graph.push({
            op: 'updateRelationship',
            field: 'apps',
            record: identifier('namespace', id),
            value: {
              data: [
                { type: 'app', id: '1' },
                { type: 'app', id: '2' },
                { type: 'app', id: '3' },
              ],
            },
          });
        });
      });

      // mutate each relationship
      // we change the app for each config to either null or a different app
      // we remove each namespace from the app
      store._join(() => {
        ['1', '2', '3', '4'].forEach((id) => {
          graph.update({
            op: 'replaceRelatedRecord',
            field: 'app',
            record: identifier('config', id),
            value: id === '1' || id === '2' ? null : identifier('app', '2'),
          });
        });
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'namespaces',
          record: appIdentifier,
          value: [],
        });
      });

      // assert app relationships
      let configRelationship = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(configRelationship.data, [], 'configs are correct');

      let namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
      assert.arrayStrictEquals(namespaceRelationship.data, [], 'namespaces are correct');

      // assert config relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const configIdentifier = identifier('config', id);
        const appRelationship = graph.getData(configIdentifier, 'app');
        assert.deepEqual(
          appRelationship.data,
          id === '1' || id === '2' ? null : identifier('app', '2'),
          `config ${id} app relationship is correct`
        );
      });

      // assert namespace relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const namespaceIdentifier = identifier('namespace', id);
        const appRelationship = graph.getData(namespaceIdentifier, 'apps');
        assert.arrayStrictEquals(
          appRelationship.data,
          [identifier('app', '2'), identifier('app', '3')],
          `namespace ${id} apps relationship is correct`
        );
      });

      // updateRelationship from the collection side
      // this should not clear the local state
      // so the configs should still be empty or have the new app
      // and the namespaces should still have the app removed
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'configs',
          record: appIdentifier,
          value: {
            data: [
              { type: 'config', id: '1' },
              { type: 'config', id: '2' },
              { type: 'config', id: '3' },
              { type: 'config', id: '4' },
            ],
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'namespaces',
          record: appIdentifier,
          value: {
            data: [
              { type: 'namespace', id: '1' },
              { type: 'namespace', id: '2' },
              { type: 'namespace', id: '3' },
              { type: 'namespace', id: '4' },
            ],
          },
        });
      });

      // assert app relationships
      configRelationship = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(configRelationship.data, [], 'configs are correct');

      namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
      assert.arrayStrictEquals(namespaceRelationship.data, [], 'namespaces are correct');

      // assert config relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const configIdentifier = identifier('config', id);
        const appRelationship = graph.getData(configIdentifier, 'app');
        assert.deepEqual(
          appRelationship.data,
          id === '1' || id === '2' ? null : identifier('app', '2'),
          `config ${id} app relationship is correct`
        );
      });

      // assert namespace relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const namespaceIdentifier = identifier('namespace', id);
        const appRelationship = graph.getData(namespaceIdentifier, 'apps');
        assert.arrayStrictEquals(
          appRelationship.data,
          [identifier('app', '2'), identifier('app', '3')],
          `namespace ${id} apps relationship is correct`
        );
      });

      // Commit the dirty state
      store._join(() => {
        ['1', '2', '3', '4'].forEach((id) => {
          let record = identifier('config', id);
          graph.push({
            op: 'updateRelationship',
            field: 'app',
            record,
            value: graph.getData(record, 'app'),
          });

          record = identifier('namespace', id);
          graph.push({
            op: 'updateRelationship',
            field: 'apps',
            record,
            value: graph.getData(record, 'apps'),
          });
        });
      });

      // Ensure our state is still the same
      // assert app relationships
      configRelationship = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(configRelationship.data, [], 'configs are correct');

      namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
      assert.arrayStrictEquals(namespaceRelationship.data, [], 'namespaces are correct');

      // assert config relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const configIdentifier = identifier('config', id);
        const appRelationship = graph.getData(configIdentifier, 'app');
        assert.deepEqual(
          appRelationship.data,
          id === '1' || id === '2' ? null : identifier('app', '2'),
          `config ${id} app relationship is correct`
        );
      });

      // assert namespace relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const namespaceIdentifier = identifier('namespace', id);
        const appRelationship = graph.getData(namespaceIdentifier, 'apps');
        assert.arrayStrictEquals(
          appRelationship.data,
          [identifier('app', '2'), identifier('app', '3')],
          `namespace ${id} apps relationship is correct`
        );
      });

      // push a new state from the server
      // there should be no local state left, so this should result
      // in the observable state matching the new remote state
      // however the order of the namespaces should now be different
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'configs',
          record: appIdentifier,
          value: {
            data: [
              { type: 'config', id: '1' },
              { type: 'config', id: '2' },
              { type: 'config', id: '3' },
              { type: 'config', id: '4' },
            ],
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'namespaces',
          record: appIdentifier,
          value: {
            data: [
              { type: 'namespace', id: '1' },
              { type: 'namespace', id: '2' },
              { type: 'namespace', id: '3' },
              { type: 'namespace', id: '4' },
            ],
          },
        });
      });

      // assert app relationships
      configRelationship = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configRelationship.data,
        [identifier('config', '1'), identifier('config', '2'), identifier('config', '3'), identifier('config', '4')],
        'configs are correct'
      );

      namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
      assert.arrayStrictEquals(
        namespaceRelationship.data,
        [
          identifier('namespace', '1'),
          identifier('namespace', '2'),
          identifier('namespace', '3'),
          identifier('namespace', '4'),
        ],
        'namespaces are correct'
      );

      // assert config relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const configIdentifier = identifier('config', id);
        const appRelationship = graph.getData(configIdentifier, 'app');
        assert.deepEqual(appRelationship.data, identifier('app', '1'), `config ${id} app relationship is correct`);
      });

      // assert namespace relationships
      ['1', '2', '3', '4'].forEach((id) => {
        const namespaceIdentifier = identifier('namespace', id);
        const appRelationship = graph.getData(namespaceIdentifier, 'apps');
        assert.arrayStrictEquals(
          appRelationship.data,
          [identifier('app', '2'), identifier('app', '3'), identifier('app', '1')],
          `namespace ${id} apps relationship is correct`
        );
      });
    });

    test('updateRelationship operation from the belongsTo side does not clear local state', function (assert) {
      // tests that One:Many, One:One do not clear local state from
      // either side when updating the relationship from the One side
      const { owner } = this;

      class App extends Model {
        @attr declare name: string;
        @belongsTo('config', { async: false, inverse: 'app' }) declare config: Config[];
        @belongsTo('namespace', { async: false, inverse: 'apps' }) declare namespace: Namespace | null;
        @belongsTo('cluster', { async: false, inverse: 'app' }) declare cluster: Cluster | null;
      }
      class Cluster extends Model {
        @attr declare name: string;
        @belongsTo('app', { async: false, inverse: 'cluster' }) declare app: App | null;
      }

      class Namespace extends Model {
        @attr declare name: string;
        @hasMany('app', { async: false, inverse: 'namespace' }) declare apps: App[];
      }

      class Config extends Model {
        @attr declare name: string;
        @belongsTo('app', { async: false, inverse: 'config' }) declare app: App | null;
      }

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      owner.register('model:app', App);
      owner.register('model:namespace', Namespace);
      owner.register('model:config', Config);
      owner.register('model:cluster', Cluster);
      const store = owner.lookup('service:store') as unknown as Store;
      const graph = graphFor(store);
      const appIdentifier = identifier('app', '1');
      const configIdentifier = identifier('config', '1');
      const clusterIdentifier = identifier('cluster', '1');
      const namespaceIdentifier = identifier('namespace', '1');

      // set initial state
      // one app, with 1 config, 1 cluster and 1 namespace
      // the config belongs to the app
      // the cluster belongs to the app
      // the namespace has the app and 2 more apps
      store._join(() => {
        // setup primary app relationships
        // this also convers the belongsTo side on config
        graph.push({
          op: 'updateRelationship',
          field: 'config',
          record: appIdentifier,
          value: {
            data: { type: 'config', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'cluster',
          record: appIdentifier,
          value: {
            data: { type: 'cluster', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'namespace',
          record: appIdentifier,
          value: {
            data: { type: 'namespace', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record: identifier('namespace', '1'),
          value: {
            data: [
              { type: 'app', id: '1' },
              { type: 'app', id: '2' },
              { type: 'app', id: '3' },
            ],
          },
        });
      });

      // mutate each relationship
      // we change the app for the config null
      // we change the app for the cluster to a different app
      // we remove the app from the namespace
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecord',
          field: 'app',
          record: identifier('config', '1'),
          value: null,
        });
        graph.update({
          op: 'removeFromRelatedRecords',
          field: 'apps',
          record: identifier('namespace', '1'),
          value: appIdentifier,
        });
        graph.update({
          op: 'replaceRelatedRecord',
          field: 'app',
          record: identifier('cluster', '1'),
          value: identifier('app', '3'),
        });
      });

      // assert app relationships
      let configRelationship = graph.getData(appIdentifier, 'config');
      assert.equal(configRelationship.data, null, 'config is correct');
      let clusterRelationship = graph.getData(appIdentifier, 'cluster');
      assert.deepEqual(clusterRelationship.data, null, 'cluster is correct');
      let namespaceRelationship = graph.getData(appIdentifier, 'namespace');
      assert.deepEqual(namespaceRelationship.data, null, 'namespace is correct');

      // assert config relationships
      let appRelationship = graph.getData(configIdentifier, 'app');
      assert.equal(appRelationship.data, null, 'config app relationship is correct');
      let clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
      assert.deepEqual(clusterAppRelationship.data, identifier('app', '3'), 'cluster app relationship is correct');
      let namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        namespaceAppsRelationship.data,
        [identifier('app', '2'), identifier('app', '3')],
        'namespace apps relationship is correct'
      );

      // update the belongsTo side
      // this should not clear the local state
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'config',
          record: appIdentifier,
          value: {
            data: { type: 'config', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'cluster',
          record: appIdentifier,
          value: {
            data: { type: 'cluster', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'namespace',
          record: appIdentifier,
          value: {
            data: { type: 'namespace', id: '1' },
          },
        });
      });

      // assert app relationships
      configRelationship = graph.getData(appIdentifier, 'config');
      assert.equal(configRelationship.data, null, 'config is correct');
      clusterRelationship = graph.getData(appIdentifier, 'cluster');
      assert.deepEqual(clusterRelationship.data, null, 'cluster is correct');
      namespaceRelationship = graph.getData(appIdentifier, 'namespace');
      assert.deepEqual(namespaceRelationship.data, null, 'namespace is correct');

      // assert config relationships
      appRelationship = graph.getData(configIdentifier, 'app');
      assert.equal(appRelationship.data, null, 'config app relationship is correct');
      clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
      assert.deepEqual(clusterAppRelationship.data, identifier('app', '3'), 'cluster app relationship is correct');
      namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        namespaceAppsRelationship.data,
        [identifier('app', '2'), identifier('app', '3')],
        'namespace apps relationship is correct'
      );

      // Commit the dirty state
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'app',
          record: configIdentifier,
          value: graph.getData(configIdentifier, 'app'),
        });
        graph.push({
          op: 'updateRelationship',
          field: 'app',
          record: clusterIdentifier,
          value: graph.getData(clusterIdentifier, 'app'),
        });
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record: namespaceIdentifier,
          value: graph.getData(namespaceIdentifier, 'apps'),
        });
      });

      // Ensure our state is still the same
      // assert app relationships
      configRelationship = graph.getData(appIdentifier, 'config');
      assert.equal(configRelationship.data, null, 'config is correct');
      clusterRelationship = graph.getData(appIdentifier, 'cluster');
      assert.deepEqual(clusterRelationship.data, null, 'cluster is correct');
      namespaceRelationship = graph.getData(appIdentifier, 'namespace');
      assert.deepEqual(namespaceRelationship.data, null, 'namespace is correct');

      // assert config relationships
      appRelationship = graph.getData(configIdentifier, 'app');
      assert.equal(appRelationship.data, null, 'config app relationship is correct');
      clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
      assert.deepEqual(clusterAppRelationship.data, identifier('app', '3'), 'cluster app relationship is correct');
      namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        namespaceAppsRelationship.data,
        [identifier('app', '2'), identifier('app', '3')],
        'namespace apps relationship is correct'
      );

      // push a new state from the server
      // there should be no local state left, so this should result
      // in the observable state matching the new remote state
      // however the order of the namespaces should now be different
      // since we removed the app from the namespace
      // and then readd it
      // without receiving a new ordering for the array from the API
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'config',
          record: appIdentifier,
          value: {
            data: { type: 'config', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'cluster',
          record: appIdentifier,
          value: {
            data: { type: 'cluster', id: '1' },
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'namespace',
          record: appIdentifier,
          value: {
            data: { type: 'namespace', id: '1' },
          },
        });
      });

      // assert app relationships
      configRelationship = graph.getData(appIdentifier, 'config');
      assert.equal(configRelationship.data, configIdentifier, 'config is correct');
      clusterRelationship = graph.getData(appIdentifier, 'cluster');
      assert.deepEqual(clusterRelationship.data, clusterIdentifier, 'cluster is correct');
      namespaceRelationship = graph.getData(appIdentifier, 'namespace');
      assert.deepEqual(namespaceRelationship.data, namespaceIdentifier, 'namespace is correct');

      // assert config relationships
      appRelationship = graph.getData(configIdentifier, 'app');
      assert.equal(appRelationship.data, appIdentifier, 'config app relationship is correct');
      clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
      assert.deepEqual(clusterAppRelationship.data, appIdentifier, 'cluster app relationship is correct');
      namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        namespaceAppsRelationship.data,
        [identifier('app', '2'), identifier('app', '3'), appIdentifier],
        'namespace apps relationship is correct'
      );
    });
  }

  test('updateRelationship operation from the collection side does not clear local state when `resetOnRemoteUpdate: false` is set', function (assert) {
    // tests that Many:Many, Many:One do not clear local state from
    // either side when updating the relationship from the Many side
    // we set the flag on the inverse to ensure that we detect this
    // from either side
    const { owner } = this;

    class App extends Model {
      @attr declare name: string;
      @hasMany('config', { async: false, inverse: 'app' }) declare configs: Config[];
      @hasMany('namespace', { async: false, inverse: 'apps' }) declare namespaces: Namespace | null;
    }

    class Namespace extends Model {
      @attr declare name: string;
      @hasMany('app', { async: false, inverse: 'namespaces', resetOnRemoteUpdate: false }) declare apps: App[];
    }

    class Config extends Model {
      @attr declare name: string;
      @belongsTo('app', { async: false, inverse: 'configs', resetOnRemoteUpdate: false }) declare app: App | null;
    }

    function identifier(type: string, id: string) {
      return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
    }

    owner.register('model:app', App);
    owner.register('model:namespace', Namespace);
    owner.register('model:config', Config);
    const store = owner.lookup('service:store') as unknown as Store;
    const graph = graphFor(store);
    const appIdentifier = identifier('app', '1');

    // set initial state
    // one app, with 4 configs and 4 namespaces
    // each config belongs to the app
    // each namespace has the app and 2 more namespaces
    store._join(() => {
      // setup primary app relationships
      // this also convers the belongsTo side on config
      graph.push({
        op: 'updateRelationship',
        field: 'configs',
        record: appIdentifier,
        value: {
          data: [
            { type: 'config', id: '1' },
            { type: 'config', id: '2' },
            { type: 'config', id: '3' },
            { type: 'config', id: '4' },
          ],
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'namespaces',
        record: appIdentifier,
        value: {
          data: [
            { type: 'namespace', id: '1' },
            { type: 'namespace', id: '2' },
            { type: 'namespace', id: '3' },
            { type: 'namespace', id: '4' },
          ],
        },
      });
      // setup namespace relationships
      ['1', '2', '3', '4'].forEach((id) => {
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record: identifier('namespace', id),
          value: {
            data: [
              { type: 'app', id: '1' },
              { type: 'app', id: '2' },
              { type: 'app', id: '3' },
            ],
          },
        });
      });
    });

    // mutate each relationship
    // we change the app for each config to either null or a different app
    // we remove each namespace from the app
    store._join(() => {
      ['1', '2', '3', '4'].forEach((id) => {
        graph.update({
          op: 'replaceRelatedRecord',
          field: 'app',
          record: identifier('config', id),
          value: id === '1' || id === '2' ? null : identifier('app', '2'),
        });
      });
      graph.update({
        op: 'replaceRelatedRecords',
        field: 'namespaces',
        record: appIdentifier,
        value: [],
      });
    });

    // assert app relationships
    let configRelationship = graph.getData(appIdentifier, 'configs');
    assert.arrayStrictEquals(configRelationship.data, [], 'configs are correct');

    let namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
    assert.arrayStrictEquals(namespaceRelationship.data, [], 'namespaces are correct');

    // assert config relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const configIdentifier = identifier('config', id);
      const appRelationship = graph.getData(configIdentifier, 'app');
      assert.deepEqual(
        appRelationship.data,
        id === '1' || id === '2' ? null : identifier('app', '2'),
        `config ${id} app relationship is correct`
      );
    });

    // assert namespace relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const namespaceIdentifier = identifier('namespace', id);
      const appRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        appRelationship.data,
        [identifier('app', '2'), identifier('app', '3')],
        `namespace ${id} apps relationship is correct`
      );
    });

    // updateRelationship from the collection side
    // this should not clear the local state
    // so the configs should still be empty or have the new app
    // and the namespaces should still have the app removed
    store._join(() => {
      graph.push({
        op: 'updateRelationship',
        field: 'configs',
        record: appIdentifier,
        value: {
          data: [
            { type: 'config', id: '1' },
            { type: 'config', id: '2' },
            { type: 'config', id: '3' },
            { type: 'config', id: '4' },
          ],
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'namespaces',
        record: appIdentifier,
        value: {
          data: [
            { type: 'namespace', id: '1' },
            { type: 'namespace', id: '2' },
            { type: 'namespace', id: '3' },
            { type: 'namespace', id: '4' },
          ],
        },
      });
    });

    // assert app relationships
    configRelationship = graph.getData(appIdentifier, 'configs');
    assert.arrayStrictEquals(configRelationship.data, [], 'configs are correct');

    namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
    assert.arrayStrictEquals(namespaceRelationship.data, [], 'namespaces are correct');

    // assert config relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const configIdentifier = identifier('config', id);
      const appRelationship = graph.getData(configIdentifier, 'app');
      assert.deepEqual(
        appRelationship.data,
        id === '1' || id === '2' ? null : identifier('app', '2'),
        `config ${id} app relationship is correct`
      );
    });

    // assert namespace relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const namespaceIdentifier = identifier('namespace', id);
      const appRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        appRelationship.data,
        [identifier('app', '2'), identifier('app', '3')],
        `namespace ${id} apps relationship is correct`
      );
    });

    // Commit the dirty state
    store._join(() => {
      ['1', '2', '3', '4'].forEach((id) => {
        let record = identifier('config', id);
        graph.push({
          op: 'updateRelationship',
          field: 'app',
          record,
          value: graph.getData(record, 'app'),
        });

        record = identifier('namespace', id);
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record,
          value: graph.getData(record, 'apps'),
        });
      });
    });

    // Ensure our state is still the same
    // assert app relationships
    configRelationship = graph.getData(appIdentifier, 'configs');
    assert.arrayStrictEquals(configRelationship.data, [], 'configs are correct');

    namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
    assert.arrayStrictEquals(namespaceRelationship.data, [], 'namespaces are correct');

    // assert config relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const configIdentifier = identifier('config', id);
      const appRelationship = graph.getData(configIdentifier, 'app');
      assert.deepEqual(
        appRelationship.data,
        id === '1' || id === '2' ? null : identifier('app', '2'),
        `config ${id} app relationship is correct`
      );
    });

    // assert namespace relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const namespaceIdentifier = identifier('namespace', id);
      const appRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        appRelationship.data,
        [identifier('app', '2'), identifier('app', '3')],
        `namespace ${id} apps relationship is correct`
      );
    });

    // push a new state from the server
    // there should be no local state left, so this should result
    // in the observable state matching the new remote state
    // however the order of the namespaces should now be different
    store._join(() => {
      graph.push({
        op: 'updateRelationship',
        field: 'configs',
        record: appIdentifier,
        value: {
          data: [
            { type: 'config', id: '1' },
            { type: 'config', id: '2' },
            { type: 'config', id: '3' },
            { type: 'config', id: '4' },
          ],
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'namespaces',
        record: appIdentifier,
        value: {
          data: [
            { type: 'namespace', id: '1' },
            { type: 'namespace', id: '2' },
            { type: 'namespace', id: '3' },
            { type: 'namespace', id: '4' },
          ],
        },
      });
    });

    // assert app relationships
    configRelationship = graph.getData(appIdentifier, 'configs');
    assert.arrayStrictEquals(
      configRelationship.data,
      [identifier('config', '1'), identifier('config', '2'), identifier('config', '3'), identifier('config', '4')],
      'configs are correct'
    );

    namespaceRelationship = graph.getData(appIdentifier, 'namespaces');
    assert.arrayStrictEquals(
      namespaceRelationship.data,
      [
        identifier('namespace', '1'),
        identifier('namespace', '2'),
        identifier('namespace', '3'),
        identifier('namespace', '4'),
      ],
      'namespaces are correct'
    );

    // assert config relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const configIdentifier = identifier('config', id);
      const appRelationship = graph.getData(configIdentifier, 'app');
      assert.deepEqual(appRelationship.data, identifier('app', '1'), `config ${id} app relationship is correct`);
    });

    // assert namespace relationships
    ['1', '2', '3', '4'].forEach((id) => {
      const namespaceIdentifier = identifier('namespace', id);
      const appRelationship = graph.getData(namespaceIdentifier, 'apps');
      assert.arrayStrictEquals(
        appRelationship.data,
        [identifier('app', '2'), identifier('app', '3'), identifier('app', '1')],
        `namespace ${id} apps relationship is correct`
      );
    });
  });

  test('updateRelationship operation from the belongsTo side does not clear local state when `resetOnRemoteUpdate: false` is set', function (assert) {
    // tests that One:Many, One:One do not clear local state from
    // either side when updating the relationship from the One side
    // we set the flag on the inverse to ensure that we detect this
    // from either side
    const { owner } = this;

    class App extends Model {
      @attr declare name: string;
      @belongsTo('config', { async: false, inverse: 'app' }) declare config: Config[];
      @belongsTo('namespace', { async: false, inverse: 'apps' }) declare namespace: Namespace | null;
      @belongsTo('cluster', { async: false, inverse: 'app' }) declare cluster: Cluster | null;
    }
    class Cluster extends Model {
      @attr declare name: string;
      @belongsTo('app', { async: false, inverse: 'cluster', resetOnRemoteUpdate: false }) declare app: App | null;
    }

    class Namespace extends Model {
      @attr declare name: string;
      @hasMany('app', { async: false, inverse: 'namespace', resetOnRemoteUpdate: false }) declare apps: App[];
    }

    class Config extends Model {
      @attr declare name: string;
      @belongsTo('app', { async: false, inverse: 'config', resetOnRemoteUpdate: false }) declare app: App | null;
    }

    function identifier(type: string, id: string) {
      return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
    }

    owner.register('model:app', App);
    owner.register('model:namespace', Namespace);
    owner.register('model:config', Config);
    owner.register('model:cluster', Cluster);
    const store = owner.lookup('service:store') as unknown as Store;
    const graph = graphFor(store);
    const appIdentifier = identifier('app', '1');
    const configIdentifier = identifier('config', '1');
    const clusterIdentifier = identifier('cluster', '1');
    const namespaceIdentifier = identifier('namespace', '1');

    // set initial state
    // one app, with 1 config, 1 cluster and 1 namespace
    // the config belongs to the app
    // the cluster belongs to the app
    // the namespace has the app and 2 more apps
    store._join(() => {
      // setup primary app relationships
      // this also convers the belongsTo side on config
      graph.push({
        op: 'updateRelationship',
        field: 'config',
        record: appIdentifier,
        value: {
          data: { type: 'config', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'cluster',
        record: appIdentifier,
        value: {
          data: { type: 'cluster', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'namespace',
        record: appIdentifier,
        value: {
          data: { type: 'namespace', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'apps',
        record: identifier('namespace', '1'),
        value: {
          data: [
            { type: 'app', id: '1' },
            { type: 'app', id: '2' },
            { type: 'app', id: '3' },
          ],
        },
      });
    });

    // mutate each relationship
    // we change the app for the config null
    // we change the app for the cluster to a different app
    // we remove the app from the namespace
    store._join(() => {
      graph.update({
        op: 'replaceRelatedRecord',
        field: 'app',
        record: identifier('config', '1'),
        value: null,
      });
      graph.update({
        op: 'removeFromRelatedRecords',
        field: 'apps',
        record: identifier('namespace', '1'),
        value: appIdentifier,
      });
      graph.update({
        op: 'replaceRelatedRecord',
        field: 'app',
        record: identifier('cluster', '1'),
        value: identifier('app', '3'),
      });
    });

    // assert app relationships
    let configRelationship = graph.getData(appIdentifier, 'config');
    assert.equal(configRelationship.data, null, 'config is correct');
    let clusterRelationship = graph.getData(appIdentifier, 'cluster');
    assert.deepEqual(clusterRelationship.data, null, 'cluster is correct');
    let namespaceRelationship = graph.getData(appIdentifier, 'namespace');
    assert.deepEqual(namespaceRelationship.data, null, 'namespace is correct');

    // assert config relationships
    let appRelationship = graph.getData(configIdentifier, 'app');
    assert.equal(appRelationship.data, null, 'config app relationship is correct');
    let clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
    assert.deepEqual(clusterAppRelationship.data, identifier('app', '3'), 'cluster app relationship is correct');
    let namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
    assert.arrayStrictEquals(
      namespaceAppsRelationship.data,
      [identifier('app', '2'), identifier('app', '3')],
      'namespace apps relationship is correct'
    );

    // update the belongsTo side
    // this should not clear the local state
    store._join(() => {
      graph.push({
        op: 'updateRelationship',
        field: 'config',
        record: appIdentifier,
        value: {
          data: { type: 'config', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'cluster',
        record: appIdentifier,
        value: {
          data: { type: 'cluster', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'namespace',
        record: appIdentifier,
        value: {
          data: { type: 'namespace', id: '1' },
        },
      });
    });

    // assert app relationships
    configRelationship = graph.getData(appIdentifier, 'config');
    assert.equal(configRelationship.data, null, 'config is correct');
    clusterRelationship = graph.getData(appIdentifier, 'cluster');
    assert.deepEqual(clusterRelationship.data, null, 'cluster is correct');
    namespaceRelationship = graph.getData(appIdentifier, 'namespace');
    assert.deepEqual(namespaceRelationship.data, null, 'namespace is correct');

    // assert config relationships
    appRelationship = graph.getData(configIdentifier, 'app');
    assert.equal(appRelationship.data, null, 'config app relationship is correct');
    clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
    assert.deepEqual(clusterAppRelationship.data, identifier('app', '3'), 'cluster app relationship is correct');
    namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
    assert.arrayStrictEquals(
      namespaceAppsRelationship.data,
      [identifier('app', '2'), identifier('app', '3')],
      'namespace apps relationship is correct'
    );

    // Commit the dirty state
    store._join(() => {
      graph.push({
        op: 'updateRelationship',
        field: 'app',
        record: configIdentifier,
        value: graph.getData(configIdentifier, 'app'),
      });
      graph.push({
        op: 'updateRelationship',
        field: 'app',
        record: clusterIdentifier,
        value: graph.getData(clusterIdentifier, 'app'),
      });
      graph.push({
        op: 'updateRelationship',
        field: 'apps',
        record: namespaceIdentifier,
        value: graph.getData(namespaceIdentifier, 'apps'),
      });
    });

    // Ensure our state is still the same
    // assert app relationships
    configRelationship = graph.getData(appIdentifier, 'config');
    assert.equal(configRelationship.data, null, 'config is correct');
    clusterRelationship = graph.getData(appIdentifier, 'cluster');
    assert.deepEqual(clusterRelationship.data, null, 'cluster is correct');
    namespaceRelationship = graph.getData(appIdentifier, 'namespace');
    assert.deepEqual(namespaceRelationship.data, null, 'namespace is correct');

    // assert config relationships
    appRelationship = graph.getData(configIdentifier, 'app');
    assert.equal(appRelationship.data, null, 'config app relationship is correct');
    clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
    assert.deepEqual(clusterAppRelationship.data, identifier('app', '3'), 'cluster app relationship is correct');
    namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
    assert.arrayStrictEquals(
      namespaceAppsRelationship.data,
      [identifier('app', '2'), identifier('app', '3')],
      'namespace apps relationship is correct'
    );

    // push a new state from the server
    // there should be no local state left, so this should result
    // in the observable state matching the new remote state
    // however the order of the namespaces should now be different
    // since we removed the app from the namespace
    // and then readd it
    // without receiving a new ordering for the array from the API
    store._join(() => {
      graph.push({
        op: 'updateRelationship',
        field: 'config',
        record: appIdentifier,
        value: {
          data: { type: 'config', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'cluster',
        record: appIdentifier,
        value: {
          data: { type: 'cluster', id: '1' },
        },
      });
      graph.push({
        op: 'updateRelationship',
        field: 'namespace',
        record: appIdentifier,
        value: {
          data: { type: 'namespace', id: '1' },
        },
      });
    });

    // assert app relationships
    configRelationship = graph.getData(appIdentifier, 'config');
    assert.equal(configRelationship.data, configIdentifier, 'config is correct');
    clusterRelationship = graph.getData(appIdentifier, 'cluster');
    assert.deepEqual(clusterRelationship.data, clusterIdentifier, 'cluster is correct');
    namespaceRelationship = graph.getData(appIdentifier, 'namespace');
    assert.deepEqual(namespaceRelationship.data, namespaceIdentifier, 'namespace is correct');

    // assert config relationships
    appRelationship = graph.getData(configIdentifier, 'app');
    assert.equal(appRelationship.data, appIdentifier, 'config app relationship is correct');
    clusterAppRelationship = graph.getData(clusterIdentifier, 'app');
    assert.deepEqual(clusterAppRelationship.data, appIdentifier, 'cluster app relationship is correct');
    namespaceAppsRelationship = graph.getData(namespaceIdentifier, 'apps');
    assert.arrayStrictEquals(
      namespaceAppsRelationship.data,
      [identifier('app', '2'), identifier('app', '3'), appIdentifier],
      'namespace apps relationship is correct'
    );
  });
});
