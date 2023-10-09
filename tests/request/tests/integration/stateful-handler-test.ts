import { setOwner } from '@ember/owner';
import { service } from '@ember/service';

import { module, test } from '@warp-drive/diagnostic';

import RequestManager from '@ember-data/request';
import type { Context as HandlerRequestContext } from '@ember-data/request/-private/context';
import type { NextFn } from '@ember-data/request/-private/types';
import { setupTest } from '@ember-data/unpublished-test-infra/test-support/test-helpers';

module('RequestManager | Stateful Handlers', function (hooks) {
  setupTest(hooks);

  test('We can register a handler with `.use(<Handler[]>)`', async function (assert) {
    const manager = new RequestManager();
    let calls = 0;

    this.owner.register(
      'service:intl',
      class {
        t(key: string) {
          return key + ' was intl-ed';
        }

        static create() {
          return new this();
        }
      }
    );

    class MyHandler {
      @service declare intl: { t: (key: string) => string };

      request<T>(req: HandlerRequestContext, next: NextFn<T>) {
        calls++;
        return Promise.resolve(this.intl.t('success!') as T);
      }
    }

    const handler = new MyHandler();
    // const owner = getOwner(this); // where "this" is the store
    setOwner(handler, this.owner);
    // if you need to handle destroy logic, you can register a destructor
    // registerDestructor(handler, () => {});

    manager.use([handler]);
    const req = {
      url: '/foos',
    };
    const result = await manager.request(req);
    assert.equal(calls, 1, 'we called our handler');
    assert.equal(JSON.stringify(result.request), JSON.stringify(req));
    assert.equal(result.content, 'success! was intl-ed', 'we returned the expected result');
  });
});
