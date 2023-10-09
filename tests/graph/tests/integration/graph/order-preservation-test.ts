import { module, test } from '@warp-drive/diagnostic';

import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';
import { setupTest } from '@ember-data/unpublished-test-infra/test-support/test-helpers';

class App extends Model {
  @attr declare name: string;
  @hasMany('config', { async: false, inverse: 'app' }) declare configs: Config[];
  @belongsTo('cluster', { async: false, inverse: 'apps' }) declare cluster: Cluster | null;
  @hasMany('group', { async: false, inverse: 'apps' }) declare groups: Groups[];
}

class Config extends Model {
  @attr declare name: string;
  @belongsTo('app', { async: false, inverse: 'configs' }) declare app: App | null;
}

class Cluster extends Model {
  @attr declare name: string;
  @hasMany('app', { async: false, inverse: 'cluster' }) declare apps: App[];
}

class Groups extends Model {
  @attr declare name: string;
  @hasMany('app', { async: false, inverse: 'groups' }) declare apps: App[];
}

module('Graph | Order Preservation', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:app', App);
    owner.register('model:config', Config);
    owner.register('model:cluster', Cluster);
    owner.register('model:group', Groups);
  });

  module('during local mutation', function (innerHooks) {
    innerHooks.beforeEach(function (assert: Assert) {
      const { owner } = this;

      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      const appIdentifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'app', id: '1' });
      const clusterIdentifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'cluster', id: '1' });

      // setup initial state
      // app 1 has configs 1, 2, 3
      // app 1 is in cluster 1
      // cluster 1 has apps 1, 2, 3
      // app 1 is in groups 1, 2, 3
      // each group has apps 1, 2, 3
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
            ],
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
          field: 'apps',
          record: clusterIdentifier,
          value: {
            data: [
              { type: 'app', id: '1' },
              { type: 'app', id: '2' },
              { type: 'app', id: '3' },
            ],
          },
        });
        graph.push({
          op: 'updateRelationship',
          field: 'groups',
          record: appIdentifier,
          value: {
            data: [
              { type: 'group', id: '1' },
              { type: 'group', id: '2' },
              { type: 'group', id: '3' },
            ],
          },
        });
        ['1', '2', '3'].forEach((id) => {
          const groupIdentifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'group', id });
          graph.push({
            op: 'updateRelationship',
            field: 'apps',
            record: groupIdentifier,
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

      // flush initial state to localState
      graph.getData(appIdentifier, 'configs');
      graph.getData(appIdentifier, 'cluster');
      graph.getData(clusterIdentifier, 'apps');
      graph.getData(appIdentifier, 'groups');
      ['1', '2', '3'].forEach((id) => {
        const groupIdentifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'group', id });
        graph.getData(groupIdentifier, 'apps');
      });

      assert.watchNotifications();
    });

    test('order is preserved when doing a full replace of a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');

      // change the order of configs
      // from '1', '2', '3'
      // to '3', '1', '2'
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: [identifier('config', '3'), identifier('config', '1'), identifier('config', '2')],
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '1'), 'relationships', 'app', 0);
      assert.notified(identifier('config', '2'), 'relationships', 'app', 0);
      assert.notified(identifier('config', '3'), 'relationships', 'app', 0);

      const configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '3'), identifier('config', '1'), identifier('config', '2')],
        'we have the expected order'
      );

      // change the order of groups
      // from '1', '2', '3'
      // to '3', '1', '2'
      // this should not affect ordering within the groups
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'groups',
          record: appIdentifier,
          value: [identifier('group', '3'), identifier('group', '1'), identifier('group', '2')],
        });
      });

      assert.notified(appIdentifier, 'relationships', 'groups', 1);
      assert.notified(identifier('group', '1'), 'relationships', 'app', 0);
      assert.notified(identifier('group', '2'), 'relationships', 'app', 0);
      assert.notified(identifier('group', '3'), 'relationships', 'app', 0);

      const groupState = graph.getData(appIdentifier, 'groups');
      assert.arrayStrictEquals(
        groupState.data,
        [identifier('group', '3'), identifier('group', '1'), identifier('group', '2')],
        'we have the expected order'
      );
      ['1', '2', '3'].forEach((id) => {
        const groupIdentifier = identifier('group', id);
        const groupAppsState = graph.getData(groupIdentifier, 'apps');
        assert.arrayStrictEquals(
          groupAppsState.data,
          [identifier('app', '1'), identifier('app', '2'), identifier('app', '3')],
          `group ${id} has the expected order`
        );
      });
    });

    test('order is preserved when adding to a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');

      // add a new config '4' without an index
      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: identifier('config', '4'),
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '4'), 'relationships', 'app', 1);

      let configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '1'), identifier('config', '2'), identifier('config', '3'), identifier('config', '4')],
        'we have the expected order'
      );

      // add a new config '5' with an index
      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: identifier('config', '5'),
          index: 1,
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '5'), 'relationships', 'app', 1);

      configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [
          identifier('config', '1'),
          identifier('config', '5'),
          identifier('config', '2'),
          identifier('config', '3'),
          identifier('config', '4'),
        ],
        'we have the expected order'
      );

      // setup group 4 with apps 2, 3, 4
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record: identifier('group', '4'),
          value: {
            data: [identifier('app', '2'), identifier('app', '3'), identifier('app', '4')],
          },
        });
      });

      assert.notified(identifier('group', '4'), 'relationships', 'apps', 1);

      // assert starting state
      let appsState = graph.getData(identifier('group', '4'), 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '2'), identifier('app', '3'), identifier('app', '4')],
        'we have the expected order'
      );

      // mutate group 4 order to 3, 4, 2
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'apps',
          record: identifier('group', '4'),
          value: [identifier('app', '3'), identifier('app', '4'), identifier('app', '2')],
        });
      });

      assert.notified(identifier('group', '4'), 'relationships', 'apps', 1);

      // assert mutated state
      appsState = graph.getData(identifier('group', '4'), 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '3'), identifier('app', '4'), identifier('app', '2')],
        'we have the expected order'
      );

      // add a group '4' to app '1'
      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          field: 'groups',
          record: appIdentifier,
          value: identifier('group', '4'),
        });
      });

      assert.notified(appIdentifier, 'relationships', 'groups', 1);
      assert.notified(identifier('group', '4'), 'relationships', 'apps', 1);

      // assert mutated state
      const groupsState = graph.getData(appIdentifier, 'groups');
      assert.arrayStrictEquals(
        groupsState.data,
        [identifier('group', '1'), identifier('group', '2'), identifier('group', '3'), identifier('group', '4')],
        'we have the expected order'
      );

      // assert group 4 has the expected order
      appsState = graph.getData(identifier('group', '4'), 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '3'), identifier('app', '4'), identifier('app', '2'), identifier('app', '1')],
        'we have the expected order'
      );
    });

    test('order is preserved when removing from a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');

      // remove config '2'
      store._join(() => {
        graph.update({
          op: 'removeFromRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: identifier('config', '2'),
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '2'), 'relationships', 'app', 1);

      let configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '1'), identifier('config', '3')],
        'we have the expected order'
      );

      // add config '2' back to the end
      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: identifier('config', '2'),
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '2'), 'relationships', 'app', 1);

      configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '1'), identifier('config', '3'), identifier('config', '2')],
        'we have the expected order'
      );

      // remove config '3' with an index
      store._join(() => {
        graph.update({
          op: 'removeFromRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: identifier('config', '3'),
          index: 1,
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '3'), 'relationships', 'app', 1);

      configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '1'), identifier('config', '2')],
        'we have the expected order'
      );
    });

    test('order is preserved when adding via the inverse hasMany of a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');

      // setup group 4 with apps 2, 3, 4
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record: identifier('group', '4'),
          value: {
            data: [identifier('app', '2'), identifier('app', '3'), identifier('app', '4')],
          },
        });
      });

      assert.notified(identifier('group', '4'), 'relationships', 'apps', 1);
      assert.notified(identifier('app', '2'), 'relationships', 'groups', 1);
      assert.notified(identifier('app', '3'), 'relationships', 'groups', 1);
      assert.notified(identifier('app', '4'), 'relationships', 'groups', 1);

      // assert starting state
      let appsState = graph.getData(identifier('group', '4'), 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '2'), identifier('app', '3'), identifier('app', '4')],
        'we have the expected order'
      );

      // mutate group 4 order to 3, 4, 2
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'apps',
          record: identifier('group', '4'),
          value: [identifier('app', '3'), identifier('app', '4'), identifier('app', '2')],
        });
      });

      assert.notified(identifier('group', '4'), 'relationships', 'apps', 1);
      assert.notified(identifier('app', '2'), 'relationships', 'groups', 0);
      assert.notified(identifier('app', '3'), 'relationships', 'groups', 0);
      assert.notified(identifier('app', '4'), 'relationships', 'groups', 0);

      // assert mutated state
      appsState = graph.getData(identifier('group', '4'), 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '3'), identifier('app', '4'), identifier('app', '2')],
        'we have the expected order'
      );

      // add a group '4' to app '1'
      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          field: 'groups',
          record: appIdentifier,
          value: identifier('group', '4'),
        });
      });

      assert.notified(appIdentifier, 'relationships', 'groups', 1);
      assert.notified(identifier('group', '4'), 'relationships', 'apps', 1);

      // assert mutated state
      const groupsState = graph.getData(appIdentifier, 'groups');
      assert.arrayStrictEquals(
        groupsState.data,
        [identifier('group', '1'), identifier('group', '2'), identifier('group', '3'), identifier('group', '4')],
        'we have the expected order'
      );

      // assert group 4 has the expected order
      appsState = graph.getData(identifier('group', '4'), 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '3'), identifier('app', '4'), identifier('app', '2'), identifier('app', '1')],
        'we have the expected order'
      );
    });

    test('order is preserved when removing via the inverse hasMany of a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');
      const groupIdentifier = identifier('group', '3');

      // setup group 3 with apps 2, 1, 3, 4
      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          field: 'apps',
          record: groupIdentifier,
          value: {
            data: [identifier('app', '2'), appIdentifier, identifier('app', '3'), identifier('app', '4')],
          },
        });
      });

      assert.notified(groupIdentifier, 'relationships', 'apps', 1);
      assert.notified(appIdentifier, 'relationships', 'groups', 0);
      assert.notified(identifier('app', '2'), 'relationships', 'groups', 0);
      assert.notified(identifier('app', '3'), 'relationships', 'groups', 0);
      assert.notified(identifier('app', '4'), 'relationships', 'groups', 1);

      // assert starting state
      let appsState = graph.getData(groupIdentifier, 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '2'), appIdentifier, identifier('app', '3'), identifier('app', '4')],
        'we have the expected order'
      );

      // mutate group 3 order to 3, 1, 4, 2
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'apps',
          record: groupIdentifier,
          value: [identifier('app', '3'), appIdentifier, identifier('app', '4'), identifier('app', '2')],
        });
      });

      assert.notified(groupIdentifier, 'relationships', 'apps', 1);
      assert.notified(appIdentifier, 'relationships', 'groups', 0);
      assert.notified(identifier('app', '2'), 'relationships', 'groups', 0);
      assert.notified(identifier('app', '3'), 'relationships', 'groups', 0);
      assert.notified(identifier('app', '4'), 'relationships', 'groups', 0);

      // assert mutated state
      appsState = graph.getData(groupIdentifier, 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '3'), appIdentifier, identifier('app', '4'), identifier('app', '2')],
        'we have the expected order'
      );

      // now, remove group 3 from app 1
      store._join(() => {
        graph.update({
          op: 'removeFromRelatedRecords',
          field: 'groups',
          record: appIdentifier,
          value: groupIdentifier,
        });
      });

      assert.notified(appIdentifier, 'relationships', 'groups', 1);
      assert.notified(groupIdentifier, 'relationships', 'apps', 1);

      // assert mutated state
      const groupsState = graph.getData(appIdentifier, 'groups');
      assert.arrayStrictEquals(
        groupsState.data,
        [identifier('group', '1'), identifier('group', '2')],
        'we have the expected order'
      );

      // assert group 3 has the expected order
      appsState = graph.getData(groupIdentifier, 'apps');
      assert.arrayStrictEquals(
        appsState.data,
        [identifier('app', '3'), identifier('app', '4'), identifier('app', '2')],
        'we have the expected order'
      );
    });

    test('order is preserved when adding via the inverse belongsTo of a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');

      // change the order of configs
      // from '1', '2', '3'
      // to '3', '1', '2'
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: [identifier('config', '3'), identifier('config', '1'), identifier('config', '2')],
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '1'), 'relationships', 'app', 0);
      assert.notified(identifier('config', '2'), 'relationships', 'app', 0);
      assert.notified(identifier('config', '3'), 'relationships', 'app', 0);

      const configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '3'), identifier('config', '1'), identifier('config', '2')],
        'we have the expected order'
      );

      // add a new config '4'
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecord',
          field: 'app',
          record: identifier('config', '4'),
          value: appIdentifier,
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '4'), 'relationships', 'app', 1);

      // assert mutated state
      const config4State = graph.getData(identifier('config', '4'), 'app');
      assert.equal(config4State.data, appIdentifier, 'config 4 has the expected app');

      const configState2 = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState2.data,
        [identifier('config', '3'), identifier('config', '1'), identifier('config', '2'), identifier('config', '4')],
        'we have the expected order'
      );
    });

    test('order is preserved when removing via the inverse belongsTo of a hasMany', function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as Store;
      const graph = graphFor(store);

      function identifier(type: string, id: string) {
        return store.identifierCache.getOrCreateRecordIdentifier({ type, id });
      }

      const appIdentifier = identifier('app', '1');

      // change the order of configs
      // from '1', '2', '3'
      // to '3', '1', '2'
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecords',
          field: 'configs',
          record: appIdentifier,
          value: [identifier('config', '3'), identifier('config', '1'), identifier('config', '2')],
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '1'), 'relationships', 'app', 0);
      assert.notified(identifier('config', '2'), 'relationships', 'app', 0);
      assert.notified(identifier('config', '3'), 'relationships', 'app', 0);

      const configState = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState.data,
        [identifier('config', '3'), identifier('config', '1'), identifier('config', '2')],
        'we have the expected order'
      );

      // remove config '1'
      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecord',
          field: 'app',
          record: identifier('config', '1'),
          value: null,
        });
      });

      assert.notified(appIdentifier, 'relationships', 'configs', 1);
      assert.notified(identifier('config', '1'), 'relationships', 'app', 1);

      // assert mutated state
      const config1State = graph.getData(identifier('config', '1'), 'app');
      assert.equal(config1State.data, null, 'config 1 has the expected app');

      const configState2 = graph.getData(appIdentifier, 'configs');
      assert.arrayStrictEquals(
        configState2.data,
        [identifier('config', '3'), identifier('config', '2')],
        'we have the expected order'
      );
    });
  });
});
