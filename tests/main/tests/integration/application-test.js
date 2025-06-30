// ensure DS namespace is set
import Controller from '@ember/controller';
import * as s from '@ember/service';

import Store from 'main-test-app/services/store';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';

const Service = s.default;
const service = s.service ?? s.inject;

module('integration/application - Injecting a Custom Store', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.unregister('service:store');
    owner.register(
      'service:store',
      class extends Store {
        isCustom = true;
      }
    );
    owner.register('controller:foo', Controller.extend({ store: service() }));
    owner.register(
      'controller:baz',
      class Controller {
        constructor(args) {
          Object.assign(this, args);
        }
        @service('store') store;
        static create(args) {
          return new this(args);
        }
      },
      { singleton: true, instantiate: true }
    );
    owner.register('controller:application', Controller.extend({ store: service() }));
  });

  test('If a Store property exists on an Application, it should be instantiated.', async function (assert) {
    const store = this.owner.lookup('service:store');
    assert.true(store.isCustom, 'the custom store was instantiated');
  });

  test('If a store is instantiated, it should be made available to each controller.', async function (assert) {
    ['foo', 'baz', 'application'].forEach((type) => {
      const controller = this.owner.lookup(`controller:${type}`);
      assert.true(controller.store.isCustom, 'the custom store was injected');
    });
  });

  test('The JSONAPIAdapter is the default adapter when no custom adapter is provided', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    assert.ok(adapter instanceof JSONAPIAdapter, 'default adapter should be the JSONAPIAdapter');
  });
});

module('integration/application - Injecting the Default Store', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('controller:foo', Controller.extend({ store: service() }));
    owner.register(
      'controller:baz',
      class Controller {
        constructor(args) {
          Object.assign(this, args);
        }
        @service('store') store;
        static create(args) {
          return new this(args);
        }
      },
      { singleton: true, instantiate: true }
    );
    owner.register('controller:application', Controller.extend({ store: service() }));
  });

  test('If a Store property exists on an Application, it should be instantiated.', async function (assert) {
    const store = this.owner.lookup('service:store');
    assert.ok(store instanceof Store, 'the store was instantiated');
  });

  test('If a store is instantiated, it should be made available to each controller.', async function (assert) {
    const fooController = this.owner.lookup('controller:foo');
    assert.ok(fooController.store instanceof Store, 'the store was injected');
  });
});

module('integration/application - Using the store as a service', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('controller:foo', Controller.extend({ store: service() }));
    owner.register(
      'controller:baz',
      class Controller {
        constructor(args) {
          Object.assign(this, args);
        }
        @service('store') store;
        static create(args) {
          return new this(args);
        }
      },
      { singleton: true, instantiate: true }
    );
    owner.register('controller:application', Controller.extend({ store: service() }));
    owner.register('service:doodle', Service.extend({ store: service() }));
    owner.register('service:second-store', Store);
  });

  test('The store can be injected as a service', async function (assert) {
    const doodleService = this.owner.lookup('service:doodle');
    assert.ok(doodleService.store instanceof Store, 'the store can be used as a service');
  });

  test('There can be multiple store services', function (assert) {
    const doodleService = this.owner.lookup('service:doodle');
    const store = doodleService.store;
    const secondService = this.owner.lookup('service:second-store');

    assert.ok(secondService instanceof Store, 'the store can be used as a service');
    assert.notStrictEqual(store, secondService, 'the store can be used as a service');
  });
});
