import Cache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { module, test } from '@warp-drive/diagnostic';

import { TestSchema } from '../../utils/schema';

class TestStore extends Store {
  requestManager = new RequestManager().useCache(CacheHandler);

  createSchemaService() {
    return new TestSchema();
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new Cache(capabilities);
  }
}

module('Cache | Validation Errors', function (hooks) {
  test('It reports errors for invalid documents', function (assert) {
    const store = new TestStore();
    store.schema.registerResources([
      {
        type: 'user',
        legacy: true,
        identity: { kind: '@id', name: 'id' },
        fields: [
          { name: 'fullName', kind: 'derived', type: 'concat', options: { fields: ['firstName', 'lastName'] } },
          { name: 'firstName', kind: 'field' },
          { name: 'lastName', kind: 'field' },
          { name: 'username', kind: 'field' },
          { name: 'email', kind: 'field' },
          {
            name: 'friends',
            kind: 'hasMany',
            type: 'user',
            options: {
              inverse: 'friends',
              async: false,
            },
          },
          {
            name: 'bestFriend',
            kind: 'belongsTo',
            type: 'user',
            options: {
              inverse: 'friend',
              async: false,
            },
          },
        ],
      },
      {
        type: 'outdoor-pet',
        identity: { kind: '@id', name: 'id' },
        fields: [{ name: 'name', kind: 'field' }],
      },
      {
        type: 'indoor-pet',
        identity: { kind: '@id', name: 'id' },
        fields: [{ name: 'name', kind: 'field' }],
      },
    ]);

    try {
      store.cache.put({
        request: {
          op: 'findRecord',
          url: '/users/1',
          method: 'GET',
        },
        content: {
          data: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Chris',
                fullName: 'Chris Thoburn',
                userName: 'runspired',
              },
              relationships: {},
            },
          ],
          meta: {},
          links: {},
          jsonapi: {},
          included: [
            {
              type: 'users',
              id: 2,
              attributes: {
                firstName: 'Chris',
                lastName: 'Thoburn',
                user_name: 'cthoburn',
              },
              relationships: {},
            },
            {
              type: 'users',
              id: 3,
              attributes: {},
            },
            {
              type: 'pet',
              id: '4',
              attributes: {
                name: 'Fluffy',
              },
            },
            {
              type: 'user',
              id: '4',
              name: 'Chris',
            },
          ],
          'invalid_ext:custom': {},
          INVALID_KEY: 'invalid',
        },
        response: new Response(),
      });
      assert.ok(false, 'we should error when the document has invalid keys');
    } catch (e) {
      console.log(e);
      assert.true(e instanceof Error, 'We throw an error when the document has invalid keys');
    }
  });
});
