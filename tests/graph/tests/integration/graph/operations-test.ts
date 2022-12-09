import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { graphFor } from '@ember-data/graph/-private';
import type ManyRelationship from '@ember-data/graph/-private/relationships/state/has-many';
import Model, { attr, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';

module('Integration | Graph | Operations', function (hooks: NestedHooks) {
  setupTest(hooks);

  test('updateRelationship operation filters duplicates', function (assert: Assert) {
    const { owner } = this;

    class App extends Model {
      @attr declare name: string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      @hasMany('config', { async: false, inverse: null }) declare configs: Config[];
    }

    class Config extends Model {
      @attr declare name: string;
    }

    owner.register('service:store', Store);
    owner.register('model:app', App);
    owner.register('model:config', Config);
    const store = owner.lookup('service:store') as Store;
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

    const data = graph.get(appIdentifier, 'configs') as ManyRelationship;
    assert.deepEqual(
      JSON.parse(JSON.stringify(data.getData())),
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
  });

  test('replaceRelatedRecords operation filters duplicates in a local replace', function (assert) {
    const { owner } = this;

    class App extends Model {
      @attr declare name: string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      @hasMany('config', { async: false, inverse: null }) declare configs: Config[];
    }

    class Config extends Model {
      @attr declare name: string;
    }

    owner.register('service:store', Store);
    owner.register('model:app', App);
    owner.register('model:config', Config);
    const store = owner.lookup('service:store') as Store;
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

    const data = graph.get(appIdentifier, 'configs') as ManyRelationship;
    assert.deepEqual(
      JSON.parse(JSON.stringify(data.getData())),
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
  });
});
