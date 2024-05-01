/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { test } from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import { DEPRECATE_NON_UNIQUE_PAYLOADS } from '@warp-drive/build-config/deprecations';
import { module } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

import { deprecatedTest } from '../../setup-test';

module('Integration | Graph | Duplicate Data', function (hooks) {
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

  if (!DEPRECATE_NON_UNIQUE_PAYLOADS) {
    test('updateRelationship operation asserts on duplicates in remote payloads', function (assert) {
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

      try {
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
        assert.ok(false, 'expected assertion');
      } catch (e: unknown) {
        assert.strictEqual(
          (e as Error)?.message,
          'Assertion Failed: Expected all entries in the relationship to be unique, found duplicates',
          'assertion is thrown'
        );
      }
    });

    test('replaceRelatedRecords asserts on duplicates in a local replace', function (assert) {
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

      try {
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
        assert.ok(false, 'expected assertion');
      } catch (e: unknown) {
        assert.strictEqual(
          (e as Error)?.message,
          'Assertion Failed: Expected all entries in the relationship to be unique, found duplicates',
          'assertion is thrown'
        );
      }
    });
  }
});
