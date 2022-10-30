// ensure DS namespace is set
import Application from '@ember/application';
import Namespace from '@ember/application/namespace';
import Controller from '@ember/controller';
import Service, { inject as service } from '@ember/service';

import { module, test } from 'qunit';

import { gte } from 'ember-compatibility-helpers';
import DS from 'ember-data';
import initializeEmberData from 'ember-data/setup-container';
import { setupTest } from 'ember-qunit';
import Resolver from 'ember-resolver';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Store from '@ember-data/store';

module('integration/application - Injecting a Custom Store', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.unregister('service:store');
    owner.register('service:store', Store.extend({ isCustom: true }));
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
    let store = this.owner.lookup('service:store');
    assert.true(store.isCustom, 'the custom store was instantiated');
  });

  test('If a store is instantiated, it should be made available to each controller.', async function (assert) {
    ['foo', 'baz', 'application'].forEach((type) => {
      let controller = this.owner.lookup(`controller:${type}`);
      assert.true(controller.store.isCustom, 'the custom store was injected');
    });
  });

  test('The JSONAPIAdapter is the default adapter when no custom adapter is provided', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    assert.ok(adapter instanceof JSONAPIAdapter, 'default adapter should be the JSONAPIAdapter');
  });
});

module('integration/application - Injecting the Default Store', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;

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
    let store = this.owner.lookup('service:store');
    assert.ok(store instanceof Store, 'the store was instantiated');
  });

  test('If a store is instantiated, it should be made available to each controller.', async function (assert) {
    let fooController = this.owner.lookup('controller:foo');
    assert.ok(fooController.store instanceof Store, 'the store was injected');
  });

  if (!gte('4.0.0')) {
    test('the DS namespace should be accessible', async function (assert) {
      assert.ok(DS, 'DS is imported');
      assert.expectDeprecation(
        () => {
          assert.ok(Namespace.byName('DS') instanceof Namespace, 'the DS namespace is accessible');
        },
        { id: 'ember-global', count: 2, when: { ember: '>=3.27.0' } }
      );
    });
  }
});

module('integration/application - Using the store as a service', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;

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
    let doodleService = this.owner.lookup('service:doodle');
    assert.ok(doodleService.store instanceof Store, 'the store can be used as a service');
  });

  test('There can be multiple store services', function (assert) {
    let doodleService = this.owner.lookup('service:doodle');
    let store = doodleService.store;
    let secondService = this.owner.lookup('service:second-store');

    assert.ok(secondService instanceof Store, 'the store can be used as a service');
    assert.notStrictEqual(store, secondService, 'the store can be used as a service');
  });
});

module('integration/application - Attaching initializer', function (hooks) {
  hooks.beforeEach(function () {
    this.TestApplication = Application.extend({
      modulePrefix: '--none',
      Resolver,
    });
    this.TestApplication.initializer({
      name: 'ember-data',
      initialize: initializeEmberData,
    });

    this.application = null;
    this.owner = null;
  });

  test('ember-data initializer is run', async function (assert) {
    let ran = false;

    this.TestApplication.initializer({
      name: 'after-ember-data',
      after: 'ember-data',
      initialize() {
        ran = true;
      },
    });

    this.application = this.TestApplication.create({ autoboot: false });

    await this.application.boot();

    assert.ok(ran, 'ember-data initializer was found');
  });

  test('ember-data initializer does not register the store service when it was already registered', async function (assert) {
    let AppStore = Store.extend({
      isCustomStore: true,
    });

    this.TestApplication.initializer({
      name: 'before-ember-data',
      before: 'ember-data',
      initialize(registry) {
        registry.register('service:store', AppStore);
      },
    });

    this.application = this.TestApplication.create({ autoboot: false });

    await this.application.boot();
    this.owner = this.application.buildInstance();

    let store = this.owner.lookup('service:store');
    assert.ok(
      store && store.isCustomStore,
      'ember-data initializer does not overwrite the previous registered service store'
    );
  });
});
