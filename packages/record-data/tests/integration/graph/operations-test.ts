import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';
import { graphFor } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';
import { CollectionResourceRelationship } from '@ember-data/types/q/ember-data-json-api';

module('Integration | Graph | Operations', function (hooks) {
  setupTest(hooks);

  test('updateRelationship operation filters duplicates', function (assert) {
    const { owner } = this;

    class App extends Model {
      @attr name;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      @hasMany('config', { async: false, inverse: null }) configs;
    }

    class Config extends Model {
      @attr name;
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

    const data = graph.getData(appIdentifier, 'configs') as CollectionResourceRelationship;
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
  });

  test('replaceRelatedRecords operation filters duplicates in a local replace', function (assert) {
    const { owner } = this;

    class App extends Model {
      @attr name;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      @hasMany('config', { async: false, inverse: null }) configs;
    }

    class Config extends Model {
      @attr name;
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

    const data = graph.getData(appIdentifier, 'configs') as CollectionResourceRelationship;
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
  });
});
