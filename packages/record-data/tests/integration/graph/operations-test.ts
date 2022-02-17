import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';
import { graphFor, ManyRelationship } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';

module('Integration | Graph | Operations', function (hooks) {
  setupTest(hooks);

  test('some test', async function (assert) {
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
    await settled();

    const data = graph.get(appIdentifier, 'configs') as ManyRelationship;
    assert.deepEqual(
      JSON.parse(JSON.stringify(data.getData())),
      {
        data: [
          { type: 'config', id: '1', lid: '@ember-data:lid-config-1' },
          { type: 'config', id: '2', lid: '@ember-data:lid-config-2' },
          { type: 'config', id: '3', lid: '@ember-data:lid-config-3' },
          { type: 'config', id: '4', lid: '@ember-data:lid-config-4' },
        ],
      },
      'we have the expected data'
    );
  });
});
