import { getOwner } from '@ember/application';
import Service, { inject as service } from '@ember/service';

import { module, test } from '@warp-drive/diagnostic';

import RequestManager from '@ember-data/request';
import { setupTest } from '@ember-data/unpublished-test-infra/test-support/test-helpers';
import Resolver from 'ember-resolver';

module('RequestManager | Ember Service Setup', function (hooks) {
  setupTest(hooks, { resolver: new Resolver() });

  test('We can register RequestManager as a service', function (assert) {
    this.owner.register('service:request', RequestManager);
    const manager = this.owner.lookup('service:request');
    assert.ok(manager instanceof RequestManager, 'We instantiated');
  });

  test('We can use injections when registering the RequestManager as a service', function (assert) {
    class CustomManager extends RequestManager {
      @service cache;
    }
    this.owner.register('service:request', CustomManager);
    class Cache extends Service {}
    this.owner.register('service:cache', Cache);
    const manager = this.owner.lookup('service:request') as unknown as CustomManager;
    assert.ok(manager instanceof RequestManager, 'We instantiated');
    assert.ok(manager instanceof CustomManager, 'We instantiated');
    assert.ok(manager.cache instanceof Cache, 'We can utilize injections');
    assert.equal(getOwner(manager), this.owner, 'The manager correctly sets owner');
  });
});
