import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

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
    const { owner } = this;
    store = owner.lookup('service:store');
  });

  test('when no adapter is available we throw an error', async function (assert) {
    assert.expectAssertion(() => {
      const { owner } = this;
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
    const { owner } = this;
    let didInstantiate = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiate = true;
      }
    }

    owner.register('adapter:application', AppAdapter);

    const adapter = store.adapterFor('application');

    assert.ok(adapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiate, 'We instantiated the adapter');
    didInstantiate = false;

    const adapterAgain = store.adapterFor('application');

    assert.ok(adapterAgain instanceof AppAdapter, 'We found the correct adapter');
    assert.notOk(didInstantiate, 'We did not instantiate the adapter again');
    assert.strictEqual(adapter, adapterAgain, 'Repeated calls to adapterFor return the same instance');
  });

  test('multiple stores do not share adapters', async function (assert) {
    const { owner } = this;
    let didInstantiate = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiate = true;
      }
    }

    owner.register('adapter:application', AppAdapter);
    owner.register('service:other-store', Store);

    const otherStore = owner.lookup('service:other-store');
    const adapter = store.adapterFor('application');

    assert.ok(adapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiate, 'We instantiated the adapter');
    didInstantiate = false;

    const otherAdapter = otherStore.adapterFor('application');
    assert.ok(otherAdapter instanceof AppAdapter, 'We found the correct adapter again');
    assert.ok(didInstantiate, 'We instantiated the other adapter');
    assert.notStrictEqual(otherAdapter, adapter, 'We have a different adapter instance');

    otherStore.destroy();
  });

  test('we can find and instantiate per-type adapters', async function (assert) {
    const { owner } = this;
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

    const adapter = store.adapterFor('person');

    assert.ok(adapter instanceof PersonAdapter, 'We found the correct adapter');
    assert.ok(didInstantiatePersonAdapter, 'We instantiated the person adapter');
    assert.notOk(didInstantiateAppAdapter, 'We did not instantiate the application adapter');

    const appAdapter = store.adapterFor('application');
    assert.ok(appAdapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiateAppAdapter, 'We instantiated the application adapter');
    assert.notStrictEqual(appAdapter, adapter, 'We have separate adapters');
  });

  test('we fallback to the application adapter when a per-type adapter is not found', async function (assert) {
    const { owner } = this;
    let didInstantiateAppAdapter = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiateAppAdapter = true;
      }
    }

    owner.register('adapter:application', AppAdapter);

    const adapter = store.adapterFor('person');

    assert.ok(adapter instanceof AppAdapter, 'We found the adapter');
    assert.ok(didInstantiateAppAdapter, 'We instantiated the adapter');
    didInstantiateAppAdapter = false;

    const appAdapter = store.adapterFor('application');
    assert.ok(appAdapter instanceof AppAdapter, 'We found the correct adapter');
    assert.notOk(didInstantiateAppAdapter, 'We did not instantiate the adapter again');
    assert.strictEqual(appAdapter, adapter, 'We fell back to the application adapter instance');
  });

  test('adapters are destroyed', async function (assert) {
    const { owner } = this;
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

    const adapter = store.adapterFor('application');

    assert.ok(adapter instanceof AppAdapter, 'precond - We found the correct adapter');
    assert.ok(didInstantiate, 'precond - We instantiated the adapter');

    store.destroy();
    await settled();

    assert.ok(didDestroy, 'adapter was destroyed');
  });
});
