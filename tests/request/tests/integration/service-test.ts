/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { getOwner } from '@ember/application';
import Service, { inject as service } from '@ember/service';
import { TestContext } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { RequestManager } from '@ember-data/request';

module('RequestManager | Ember Service Setup', function (hooks: NestedHooks) {
  setupTest(hooks);

  test('We can register RequestManager as a service', function (this: TestContext, assert: Assert) {
    this.owner.register('service:request', RequestManager);
    const manager = this.owner.lookup('service:request');
    assert.ok(manager instanceof RequestManager, 'We instantiated');
  });

  test('We can use injections when registering the RequestManager as a service', function (this: TestContext, assert: Assert) {
    class CustomManager extends RequestManager {
      @service cache;
    }
    this.owner.register('service:request', CustomManager);
    class Cache extends Service {}
    this.owner.register('service:cache', Cache);
    const manager = this.owner.lookup('service:request');
    assert.ok(manager instanceof RequestManager, 'We instantiated');
    assert.ok(manager instanceof CustomManager, 'We instantiated');
    assert.ok(manager.cache instanceof Cache, 'We can utilize injections');
    assert.strictEqual(getOwner(manager), this.owner, 'The manager correctly sets owner');
  });
});
