import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { CollectionRelationship } from '@ember-data/types/cache/relationship';
import { productionTest } from '@ember-data/unpublished-test-infra/test-support/test-in-production';

module('integration/relationships/unloaded-data', function (hooks) {
  setupTest(hooks);

  productionTest(
    'unloaded records in a hasMany alert the RecordArray when they load (inverse null)',
    function (assert) {
      class App extends Model {
        @attr declare name: string;
        @hasMany('config', { async: false, inverse: null }) declare configs: Config[];
      }
      class Config extends Model {
        @attr declare name: string;
        @belongsTo('app', { async: false, inverse: 'configs' }) declare app: App | null;
      }

      this.owner.register('model:app', App);
      this.owner.register('model:config', Config);

      const store = this.owner.lookup('service:store') as Store;
      const graph = graphFor(store);
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({
        type: 'app',
        id: '1',
      });

      const app = store.push({
        data: {
          id: '1',
          type: 'app',
          attributes: {
            name: 'My App',
          },
          relationships: {
            configs: {
              data: [
                {
                  id: '1',
                  type: 'config',
                },
              ],
            },
          },
        },
      }) as App;

      // "pull" on the ManyArray to materialize it else the laziness will not manifest
      // in the bug we are testing (see emberjs/data#8846 for context)
      assert.strictEqual(app.configs.length, 0, 'no configs yet because the record is unloaded');
      assert.strictEqual(
        (graph.getData(identifier, 'configs') as CollectionRelationship).data?.length,
        1,
        'the record is in the graph'
      );

      // now load the related record
      store.push({
        data: {
          id: '1',
          type: 'config',
          attributes: {
            name: 'My Config',
          },
        },
      });

      // now check that we've gotten into the correct state
      assert.strictEqual(app.configs.length, 1, 'the record is now loaded');
      assert.strictEqual(
        (graph.getData(identifier, 'configs') as CollectionRelationship).data?.length,
        1,
        'the record is in the graph'
      );
    }
  );
});
