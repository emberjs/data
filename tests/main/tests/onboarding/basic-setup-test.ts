import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RequestManager from '@ember-data/request';
import Store from '@ember-data/store';

module('Onboarding | Basic Setup', function (hooks) {
  setupTest(hooks);

  test('We can use the store without a cache and get the raw result', async function (assert) {
    class AppStore extends Store {
      requestManager = new RequestManager().use([
        {
          request<T>({ request }) {
            assert.step(`request ${request.url}`);
            return Promise.resolve({
              data: {
                type: 'user',
                id: '1',
                attributes: {
                  name: 'Chris Thoburn',
                },
              },
            }) as Promise<T>;
          },
        },
      ]);
    }

    const store = new AppStore();
    const result = await store.request({
      url: '/users/1',
    });

    assert.deepEqual(result?.content, {
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    });

    assert.verifySteps(['request /users/1']);
  });
});
