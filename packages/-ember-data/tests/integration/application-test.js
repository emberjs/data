import Namespace from '@ember/application/namespace';
import Service, { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import Application from '@ember/application';
import Store from 'ember-data/store';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import initializeEmberData from 'ember-data/setup-container';
import initializeStoreService from 'ember-data/initialize-store-service';

module('integration/application - Injecting a Custom Store', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.unregister('service:store');
    owner.register('service:store', Store.extend({ isCustom: true }));
    owner.register('controller:foo', Controller.extend());
    owner.register('controller:baz', {});
    owner.register('controller:application', Controller.extend());
  });

  test('If a Store property exists on an Application, it should be instantiated.', async function(assert) {
    let store = this.owner.lookup('service:store');
    assert.ok(store.isCustom === true, 'the custom store was instantiated');
  });

  test('If a store is instantiated, it should be made available to each controller.', async function(assert) {
    let fooController = this.owner.lookup('controller:foo');
    let isCustom = fooController.get('store.isCustom');
    assert.ok(isCustom, 'the custom store was injected');
  });

  test('The JSONAPIAdapter is the default adapter when no custom adapter is provided', async function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    assert.ok(adapter instanceof JSONAPIAdapter, 'default adapter should be the JSONAPIAdapter');
  });
});

module('integration/application - Injecting the Default Store', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('controller:foo', Controller.extend());
    owner.register('controller:baz', {});
    owner.register('controller:application', Controller.extend());
  });

  test('If a Store property exists on an Application, it should be instantiated.', async function(assert) {
    let store = this.owner.lookup('service:store');
    assert.ok(store instanceof Store, 'the store was instantiated');
  });

  test('If a store is instantiated, it should be made available to each controller.', async function(assert) {
    let fooController = this.owner.lookup('controller:foo');
    assert.ok(fooController.get('store') instanceof Store, 'the store was injected');
  });

  test('the DS namespace should be accessible', async function(assert) {
    assert.ok(Namespace.byName('DS') instanceof Namespace, 'the DS namespace is accessible');
  });
});

module('integration/application - Using the store as a service', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('controller:foo', Controller.extend());
    owner.register('controller:baz', {});
    owner.register('controller:application', Controller.extend());
    owner.register('service:doodle', Service.extend({ store: service() }));
    owner.register('service:second-store', Store);
  });

  test('The store can be injected as a service', async function(assert) {
    let doodleService = this.owner.lookup('service:doodle');
    assert.ok(doodleService.get('store') instanceof Store, 'the store can be used as a service');
  });

  test('There can be multiple store services', function(assert) {
    let doodleService = this.owner.lookup('service:doodle');
    let store = doodleService.get('store');
    let secondService = this.owner.lookup('service:second-store');

    assert.ok(secondService instanceof Store, 'the store can be used as a service');
    assert.ok(store !== secondService, 'the store can be used as a service');
  });
});

module('integration/application - Attaching initializer', function(hooks) {
  hooks.beforeEach(function() {
    this.TestApplication = Application.extend();
    this.TestApplication.initializer({
      name: 'ember-data',
      initialize: initializeEmberData,
    });
    this.TestApplication.instanceInitializer({
      name: 'ember-data',
      initialize: initializeStoreService,
    });
    this.application = null;
    this.owner = null;
  });

  test('ember-data initializer is run', async function(assert) {
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

  test('ember-data initializer does not register the store service when it was already registered', async function(assert) {
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
    assert.expectDeprecation({
      id: 'ember-data:-legacy-test-registrations',
    });
    assert.ok(
      store && store.get('isCustomStore'),
      'ember-data initializer does not overwrite the previous registered service store'
    );
  });
});
