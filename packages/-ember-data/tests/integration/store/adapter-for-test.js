import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import Store from 'ember-data/store';

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

module('integration/store - adapterFor', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;
    store = owner.lookup('service:store');
  });

  test('when no adapter is available we throw an error', async function(assert) {
    let { owner } = this;
    /*
      adapter:-json-api is the "last chance" fallback and is
      the json-api adapter which is re-exported as app/adapters/-json-api.
      here we override to ensure adapterFor will return `undefined`.
     */
    const lookup = owner.lookup;
    owner.lookup = registrationName => {
      if (registrationName === 'adapter:-json-api') {
        return undefined;
      }
      return lookup.call(owner, registrationName);
    };

    assert.expectAssertion(() => {
      store.adapterFor('person');
    }, /Assertion Failed: No adapter was found for 'person' and no 'application' adapter was found as a fallback/);
    assert.expectDeprecation({
      id: 'ember-data:-legacy-test-registrations',
    });
  });

  test('we find and instantiate the application adapter', async function(assert) {
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
    assert.ok(!didInstantiate, 'We did not instantiate the adapter again');
    assert.ok(adapter === adapterAgain, 'Repeated calls to adapterFor return the same instance');
  });

  test('multiple stores do not share adapters', async function(assert) {
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
    assert.ok(otherAdapter !== adapter, 'We have a different adapter instance');

    otherStore.destroy();
  });

  test('we can find and instantiate per-type adapters', async function(assert) {
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
    assert.ok(!didInstantiateAppAdapter, 'We did not instantiate the application adapter');

    let appAdapter = store.adapterFor('application');
    assert.ok(appAdapter instanceof AppAdapter, 'We found the correct adapter');
    assert.ok(didInstantiateAppAdapter, 'We instantiated the application adapter');
    assert.ok(appAdapter !== adapter, 'We have separate adapters');
  });

  test('we fallback to the application adapter when a per-type adapter is not found', async function(assert) {
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
    assert.ok(!didInstantiateAppAdapter, 'We did not instantiate the adapter again');
    assert.ok(appAdapter === adapter, 'We fell back to the application adapter instance');
  });

  test('we can specify a fallback adapter by name in place of the application adapter', async function(assert) {
    store.adapter = '-fallback';
    let { owner } = this;

    let didInstantiateRestAdapter = false;

    class RestAdapter extends TestAdapter {
      didInit() {
        didInstantiateRestAdapter = true;
      }
    }
    owner.register('adapter:-fallback', RestAdapter);

    let adapter = store.adapterFor('person');

    assert.ok(adapter instanceof RestAdapter, 'We found the -fallback adapter for person');
    assert.ok(didInstantiateRestAdapter, 'We instantiated the adapter');
    didInstantiateRestAdapter = false;

    let appAdapter = store.adapterFor('application');

    assert.ok(appAdapter instanceof RestAdapter, 'We found the -fallback adapter for application');
    assert.ok(!didInstantiateRestAdapter, 'We did not instantiate the adapter again');
    didInstantiateRestAdapter = false;

    let restAdapter = store.adapterFor('-fallback');
    assert.ok(restAdapter instanceof RestAdapter, 'We found the correct adapter');
    assert.ok(!didInstantiateRestAdapter, 'We did not instantiate the adapter again');
    assert.ok(restAdapter === adapter, 'We fell back to the -fallback adapter instance for the person adapters');
    assert.ok(restAdapter === appAdapter, 'We fell back to the -fallback adapter instance for the application adapter');
  });

  test('the application adapter has higher precedence than a fallback adapter defined via store.adapter', async function(assert) {
    store.adapter = '-fallback';
    let { owner } = this;

    let didInstantiateAppAdapter = false;
    let didInstantiateRestAdapter = false;

    class AppAdapter extends TestAdapter {
      didInit() {
        didInstantiateAppAdapter = true;
      }
    }

    class RestAdapter extends TestAdapter {
      didInit() {
        didInstantiateRestAdapter = true;
      }
    }

    owner.register('adapter:application', AppAdapter);
    owner.register('adapter:-fallback', RestAdapter);

    let adapter = store.adapterFor('person');

    assert.ok(adapter instanceof AppAdapter, 'We found the store specified fallback adapter');
    assert.ok(!didInstantiateRestAdapter, 'We did not instantiate the store.adapter (-fallback) adapter');
    assert.ok(didInstantiateAppAdapter, 'We instantiated the application adapter');
    didInstantiateRestAdapter = false;
    didInstantiateAppAdapter = false;

    let appAdapter = store.adapterFor('application');
    assert.ok(appAdapter instanceof AppAdapter, 'We found the correct adapter for application');
    assert.ok(!didInstantiateRestAdapter, 'We did not instantiate the store fallback adapter');
    assert.ok(!didInstantiateAppAdapter, 'We did not instantiate the application adapter again');
    assert.ok(appAdapter === adapter, 'We used the application adapter as the person adapter');
    didInstantiateRestAdapter = false;
    didInstantiateAppAdapter = false;

    let restAdapter = store.adapterFor('-fallback');
    assert.ok(restAdapter instanceof RestAdapter, 'We found the correct adapter for -fallback');
    assert.ok(!didInstantiateAppAdapter, 'We did not instantiate the application adapter again');
    assert.ok(didInstantiateRestAdapter, 'We instantiated the fallback adapter');
    assert.ok(restAdapter !== appAdapter, `We did not use the application adapter instance`);
  });

  test('When the per-type, application and specified fallback adapters do not exist, we fallback to the -json-api adapter', async function(assert) {
    store.adapter = '-not-a-real-adapter';
    let { owner } = this;

    let didInstantiateAdapter = false;

    class JsonApiAdapter extends TestAdapter {
      didInit() {
        didInstantiateAdapter = true;
      }
    }
    owner.unregister('adapter:-json-api');
    owner.register('adapter:-json-api', JsonApiAdapter);

    let adapter = store.adapterFor('person');

    assert.ok(adapter instanceof JsonApiAdapter, 'We found the adapter');
    assert.ok(didInstantiateAdapter, 'We instantiated the adapter');
    didInstantiateAdapter = false;

    let appAdapter = store.adapterFor('application');

    assert.ok(appAdapter instanceof JsonApiAdapter, 'We found the fallback -json-api adapter for application');
    assert.ok(!didInstantiateAdapter, 'We did not instantiate the adapter again');
    didInstantiateAdapter = false;

    let fallbackAdapter = store.adapterFor('-not-a-real-adapter');

    assert.ok(fallbackAdapter instanceof JsonApiAdapter, 'We found the fallback -json-api adapter for application');
    assert.ok(!didInstantiateAdapter, 'We did not instantiate the adapter again');
    didInstantiateAdapter = false;

    let jsonApiAdapter = store.adapterFor('-json-api');
    assert.ok(jsonApiAdapter instanceof JsonApiAdapter, 'We found the correct adapter');
    assert.ok(!didInstantiateAdapter, 'We did not instantiate the adapter again');
    assert.ok(jsonApiAdapter === appAdapter, 'We fell back to the -json-api adapter instance for application');
    assert.ok(
      jsonApiAdapter === fallbackAdapter,
      'We fell back to the -json-api adapter instance for the fallback -not-a-real-adapter'
    );
    assert.ok(jsonApiAdapter === adapter, 'We fell back to the -json-api adapter instance for the per-type adapter');
  });
});
