import { getOwner, setOwner } from '@ember/application';
import type Owner from '@ember/owner';
import * as s from '@ember/service';
import type { TestContext } from '@ember/test-helpers';

import Resolver from 'ember-resolver';

import RequestManager from '@ember-data/request';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

const Service = s.default;
const service = s.service ?? s.inject;

module('RequestManager | Ember Service Setup', function (hooks) {
  setupTest(hooks, { resolver: new Resolver() });

  test('We can register RequestManager as a service', function (this: TestContext, assert) {
    this.owner.register('service:request', RequestManager);
    const manager = this.owner.lookup('service:request');
    assert.ok(manager instanceof RequestManager, 'We instantiated');
  });

  test('We can use injections when registering the RequestManager as a service', function (this: TestContext, assert) {
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

  test('We can use injections when registering the RequestManager as a service (create)', function (this: TestContext, assert) {
    class CustomManager extends RequestManager {
      @service cache;
    }

    const ManagerService = {
      create(owner: Owner) {
        const manager = new CustomManager();
        setOwner(manager, owner);

        return manager;
      },
    };
    this.owner.register('service:request', ManagerService);
    class Cache extends Service {}
    this.owner.register('service:cache', Cache);
    const manager = this.owner.lookup('service:request') as unknown as CustomManager;
    assert.ok(manager instanceof RequestManager, 'We instantiated');
    assert.ok(manager instanceof CustomManager, 'We instantiated');
    assert.ok(manager.cache instanceof Cache, 'We can utilize injections');
    assert.equal(getOwner(manager), this.owner, 'The manager correctly sets owner');
  });
});
