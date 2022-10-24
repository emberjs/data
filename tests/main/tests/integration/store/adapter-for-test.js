import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Store from '@ember-data/store';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

class TestAdapter {
  constructor(args) {
    Object.assign(this, args);
    this.didInit();
  }

  didInit() {}

  static create(args) {
    return new this(args);
  }
}

module('integration/store - adapterFor', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    let { owner } = this;
    store = owner.lookup('service:store');
  });

  test('when no adapter is available we throw an error', async function (assert) {
    assert.expectAssertion(() => {
      let { owner } = this;
      /*
      adapter:-json-api is the "last chance" fallback and is
      the json-api adapter which is re-exported as app/adapters/-json-api.
      here we override to ensure adapterFor will return `undefined`.
     */
      const lookup = owner.lookup;
      owner.lookup = (registrationName) => {
        if (registrationName === 'adapter:application') {
          return undefined;
        }
        if (registrationName === 'adapter:-json-api') {
          return undefined;
        }
        return lookup.call(owner, registrationName);
      };
      store.adapterFor('person');
    }, /Assertion Failed: No adapter was found for 'person' and no 'application' adapter was found as a fallback/);
  });

  test('we find and instantiate the application adapter', async function (assert) {
    let { owner } = this;
    let didInstantiate = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiate = true;
      }
    }

    owner.register('adapter:application', AppAdapter);

    let adapter = store.adapterFor('application');

    assert.ok(adapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiate, 'We instantiated the adapter');
    didInstantiate = false;

    let adapterAgain = store.adapterFor('application');

    assert.ok(adapterAgain instanceof AppAdapter, 'We found the correct adapter');
    assert.notOk(didInstantiate, 'We did not instantiate the adapter again');
    assert.strictEqual(adapter, adapterAgain, 'Repeated calls to adapterFor return the same instance');
  });

  test('multiple stores do not share adapters', async function (assert) {
    let { owner } = this;
    let didInstantiate = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiate = true;
      }
    }

    owner.register('adapter:application', AppAdapter);
    owner.register('service:other-store', Store);

    let otherStore = owner.lookup('service:other-store');
    let adapter = store.adapterFor('application');

    assert.ok(adapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiate, 'We instantiated the adapter');
    didInstantiate = false;

    let otherAdapter = otherStore.adapterFor('application');
    assert.ok(otherAdapter instanceof AppAdapter, 'We found the correct adapter again');
    assert.ok(didInstantiate, 'We instantiated the other adapter');
    assert.notStrictEqual(otherAdapter, adapter, 'We have a different adapter instance');

    otherStore.destroy();
  });

  test('we can find and instantiate per-type adapters', async function (assert) {
    let { owner } = this;
    let didInstantiateAppAdapter = false;
    let didInstantiatePersonAdapter = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiateAppAdapter = true;
      }
    }

    class PersonAdapter extends TestAdapter {
      didInit() {
        didInstantiatePersonAdapter = true;
      }
    }

    owner.register('adapter:application', AppAdapter);
    owner.register('adapter:person', PersonAdapter);

    let adapter = store.adapterFor('person');

    assert.ok(adapter instanceof PersonAdapter, 'We found the correct adapter');
    assert.ok(didInstantiatePersonAdapter, 'We instantiated the person adapter');
    assert.notOk(didInstantiateAppAdapter, 'We did not instantiate the application adapter');

    let appAdapter = store.adapterFor('application');
    assert.ok(appAdapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiateAppAdapter, 'We instantiated the application adapter');
    assert.notStrictEqual(appAdapter, adapter, 'We have separate adapters');
  });

  test('we fallback to the application adapter when a per-type adapter is not found', async function (assert) {
    let { owner } = this;
    let didInstantiateAppAdapter = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiateAppAdapter = true;
      }
    }

    owner.register('adapter:application', AppAdapter);

    let adapter = store.adapterFor('person');

    assert.ok(adapter instanceof AppAdapter, 'We found the adapter');
    assert.ok(didInstantiateAppAdapter, 'We instantiated the adapter');
    didInstantiateAppAdapter = false;

    let appAdapter = store.adapterFor('application');
    assert.ok(appAdapter instanceof AppAdapter, 'We found the correct adapter');
    assert.notOk(didInstantiateAppAdapter, 'We did not instantiate the adapter again');
    assert.strictEqual(appAdapter, adapter, 'We fell back to the application adapter instance');
  });

  deprecatedTest(
    'When the per-type, application and specified fallback adapters do not exist, we fallback to the -json-api adapter',
    {
      id: 'ember-data:deprecate-secret-adapter-fallback',
      until: '5.0',
      count: 2,
    },
    async function (assert) {
      let { owner } = this;

      let didInstantiateAdapter = false;

      class JsonApiAdapter extends TestAdapter {
        didInit() {
          didInstantiateAdapter = true;
        }
      }

      const lookup = owner.lookup;
      owner.lookup = (registrationName) => {
        if (registrationName === 'adapter:application') {
          return undefined;
        }
        return lookup.call(owner, registrationName);
      };

      owner.unregister('adapter:-json-api');
      owner.register('adapter:-json-api', JsonApiAdapter);

      let adapter = store.adapterFor('person');

      assert.ok(adapter instanceof JsonApiAdapter, 'We found the adapter');
      assert.ok(didInstantiateAdapter, 'We instantiated the adapter');
      didInstantiateAdapter = false;

      let appAdapter = store.adapterFor('application');

      assert.ok(appAdapter instanceof JsonApiAdapter, 'We found the fallback -json-api adapter for application');
      assert.notOk(didInstantiateAdapter, 'We did not instantiate the adapter again');
      didInstantiateAdapter = false;

      let jsonApiAdapter = store.adapterFor('-json-api');
      assert.ok(jsonApiAdapter instanceof JsonApiAdapter, 'We found the correct adapter');
      assert.notOk(didInstantiateAdapter, 'We did not instantiate the adapter again');
      assert.strictEqual(jsonApiAdapter, appAdapter, 'We fell back to the -json-api adapter instance for application');
      assert.strictEqual(
        jsonApiAdapter,
        adapter,
        'We fell back to the -json-api adapter instance for the per-type adapter'
      );
    }
  );

  test('adapters are destroyed', async function (assert) {
    let { owner } = this;
    let didInstantiate = false;
    let didDestroy = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiate = true;
      }

      destroy() {
        didDestroy = true;
      }
    }

    owner.register('adapter:application', AppAdapter);

    let adapter = store.adapterFor('application');

    assert.ok(adapter instanceof AppAdapter, 'precond - We found the correct adapter');
    assert.ok(didInstantiate, 'precond - We instantiated the adapter');

    run(store, 'destroy');

    assert.ok(didDestroy, 'adapter was destroyed');
  });
});
