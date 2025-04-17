import { setOwner } from '@ember/application';
import { service } from '@ember/service';
import type { TestContext } from '@ember/test-helpers';

import Resolver from 'ember-resolver';

import type { NextFn } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import type { RequestContext } from '@warp-drive/core-types/request';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

module('RequestManager | Stateful Handlers', function (hooks) {
  setupTest(hooks, { resolver: new Resolver() });

  test('We can register a handler with `.use(<Handler[]>)`', async function (this: TestContext, assert) {
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

      request<T>(req: RequestContext, next: NextFn<T>) {
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
