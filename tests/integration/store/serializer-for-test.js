import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import Store from 'ember-data/store';
import { run } from '@ember/runloop';

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

class TestSerializer {
  constructor(args) {
    Object.assign(this, args);
    this.didInit();
  }

  didInit() {}

  static create(args) {
    return new this(args);
  }
}

/*
  Serializer Fallback Rules

  1. per-type
  2. application
  3. Adapter.defaultSerializer
  4. serializer:-default (json-api serializer)
 */
module('integration/store - serializerFor', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    store = owner.lookup('service:store');
  });

  test('when no serializer is available we throw an error', async function(assert) {
    let { owner } = this;
    /*
      serializer:-default is the "last chance" fallback and is
      registered automatically as the json-api serializer.
      unregistering it will cause serializerFor to return `undefined`.
     */
    owner.unregister('serializer:-default');
    /*
      we fallback to -json-api adapter by default when no other adapter is present.
      This adapter specifies a defaultSerializer. We register our own to ensure
      that this does not occur.
     */
    class AppAdapter extends TestAdapter {
      constructor() {
        super(...arguments);
        // ensure our adapter instance does not specify a fallback
        // we use an empty string as that would cause `owner.lookup` to blow up if not guarded properly
        //  whereas `null` `undefined` `false` would not.
        this.defaultSerializer = '';
      }
    }
    owner.register('adapter:application', AppAdapter);

    assert.expectAssertion(() => {
      store.serializerFor('person');
    }, /No serializer was found for 'person' and no 'application', Adapter\.defaultSerializer, or '-default' serializer were found as fallbacks\./);
  });

  test('we find and instantiate the application serializer', async function(assert) {
    let { owner } = this;
    let didInstantiate = false;

    class AppSerializer extends TestSerializer {
      didInit() {
        didInstantiate = true;
      }
    }

    owner.register('serializer:application', AppSerializer);

    let serializer = store.serializerFor('application');

    assert.ok(serializer instanceof AppSerializer, 'We found the correct serializer');
    assert.ok(didInstantiate, 'We instantiated the serializer');
    didInstantiate = false;

    let serializerAgain = store.serializerFor('application');

    assert.ok(serializerAgain instanceof AppSerializer, 'We found the correct serializer');
    assert.ok(!didInstantiate, 'We did not instantiate the serializer again');
    assert.ok(
      serializer === serializerAgain,
      'Repeated calls to serializerFor return the same instance'
    );
  });

  test('multiple stores do not share serializers', async function(assert) {
    let { owner } = this;
    let didInstantiate = false;

    class AppSerializer extends TestSerializer {
      didInit() {
        didInstantiate = true;
      }
    }

    owner.register('serializer:application', AppSerializer);
    owner.register('service:other-store', Store);

    let otherStore = owner.lookup('service:other-store');
    let serializer = store.serializerFor('application');

    assert.ok(serializer instanceof AppSerializer, 'We found the correct serializer');
    assert.ok(didInstantiate, 'We instantiated the serializer');
    didInstantiate = false;

    let otherSerializer = otherStore.serializerFor('application');
    assert.ok(otherSerializer instanceof AppSerializer, 'We found the correct serializer again');
    assert.ok(didInstantiate, 'We instantiated the other serializer');
    assert.ok(otherSerializer !== serializer, 'We have a different serializer instance');

    // Ember 2.18 requires us to wrap destroy in a run. Use `await settled()` for newer versions.
    run(() => otherStore.destroy());
  });

  test('we can find and instantiate per-type serializers', async function(assert) {
    let { owner } = this;
    let didInstantiateAppSerializer = false;
    let didInstantiatePersonSerializer = false;

    class AppSerializer extends TestSerializer {
      didInit() {
        didInstantiateAppSerializer = true;
      }
    }

    class PersonSerializer extends TestSerializer {
      didInit() {
        didInstantiatePersonSerializer = true;
      }
    }

    owner.register('serializer:application', AppSerializer);
    owner.register('serializer:person', PersonSerializer);

    let serializer = store.serializerFor('person');

    assert.ok(serializer instanceof PersonSerializer, 'We found the correct serializer');
    assert.ok(didInstantiatePersonSerializer, 'We instantiated the person serializer');
    assert.ok(!didInstantiateAppSerializer, 'We did not instantiate the application serializer');

    let appSerializer = store.serializerFor('application');
    assert.ok(appSerializer instanceof AppSerializer, 'We found the correct serializer');
    assert.ok(didInstantiateAppSerializer, 'We instantiated the application serializer');
    assert.ok(appSerializer !== serializer, 'We have separate serializers');
  });

  test('we fallback to the application serializer when a per-type serializer is not found', async function(assert) {
    let { owner } = this;
    let didInstantiateAppSerializer = false;

    class AppSerializer extends TestSerializer {
      didInit() {
        didInstantiateAppSerializer = true;
      }
    }

    owner.register('serializer:application', AppSerializer);

    let serializer = store.serializerFor('person');

    assert.ok(serializer instanceof AppSerializer, 'We found the serializer');
    assert.ok(didInstantiateAppSerializer, 'We instantiated the serializer');
    didInstantiateAppSerializer = false;

    let appSerializer = store.serializerFor('application');
    assert.ok(appSerializer instanceof AppSerializer, 'We found the correct serializer');
    assert.ok(!didInstantiateAppSerializer, 'We did not instantiate the serializer again');
    assert.ok(appSerializer === serializer, 'We fell back to the application serializer instance');
  });

  module('Adapter Fallback', function() {
    test('we can specify a fallback serializer on the adapter when there is no application serializer', async function(assert) {
      let { owner } = this;
      let personAdapterDidInit = false;
      let fallbackSerializerDidInit = false;

      class PersonAdapter extends TestAdapter {
        constructor() {
          super(...arguments);
          this.defaultSerializer = '-fallback';
        }

        didInit() {
          personAdapterDidInit = true;
        }
      }
      class FallbackSerializer extends TestSerializer {
        didInit() {
          fallbackSerializerDidInit = true;
        }
      }

      owner.register('adapter:person', PersonAdapter);
      owner.register('serializer:-fallback', FallbackSerializer);

      let serializer = store.serializerFor('person');

      assert.ok(serializer instanceof FallbackSerializer, 'We found the serializer');
      assert.ok(personAdapterDidInit, 'We instantiated the adapter');
      assert.ok(fallbackSerializerDidInit, 'We instantiated the serializer');
      personAdapterDidInit = false;
      fallbackSerializerDidInit = false;

      let fallbackSerializer = store.serializerFor('-fallback');
      assert.ok(
        fallbackSerializer instanceof FallbackSerializer,
        'We found the correct serializer'
      );
      assert.ok(!fallbackSerializerDidInit, 'We did not instantiate the serializer again');
      assert.ok(!personAdapterDidInit, 'We did not instantiate the adapter again');
      assert.ok(
        fallbackSerializer === serializer,
        'We fell back to the fallback-serializer instance'
      );
    });

    test('specifying defaultSerializer on application serializer when there is a per-type serializer does not work', async function(assert) {
      let { owner } = this;
      let appAdapterDidInit = false;
      let personAdapterDidInit = false;
      let fallbackSerializerDidInit = false;
      let defaultSerializerDidInit = false;

      class AppAdapter extends TestAdapter {
        constructor() {
          super(...arguments);
          this.defaultSerializer = '-fallback';
        }

        didInit() {
          appAdapterDidInit = true;
        }
      }
      class PersonAdapter extends TestAdapter {
        constructor() {
          super(...arguments);
          this.defaultSerializer = null;
        }

        didInit() {
          personAdapterDidInit = true;
        }
      }
      class FallbackSerializer extends TestSerializer {
        didInit() {
          fallbackSerializerDidInit = true;
        }
      }
      class DefaultSerializer extends TestSerializer {
        didInit() {
          defaultSerializerDidInit = true;
        }
      }

      owner.register('adapter:application', AppAdapter);
      owner.register('adapter:person', PersonAdapter);
      owner.register('serializer:-fallback', FallbackSerializer);
      /*
        serializer:-default is the "last chance" fallback and is
        registered automatically as the json-api serializer.
       */
      owner.unregister('serializer:-default');
      owner.register('serializer:-default', DefaultSerializer);

      let serializer = store.serializerFor('person');

      assert.ok(serializer instanceof DefaultSerializer, 'We found the serializer');
      assert.ok(personAdapterDidInit, 'We instantiated the person adapter');
      assert.ok(!appAdapterDidInit, 'We did not instantiate the application adapter');
      assert.ok(
        !fallbackSerializerDidInit,
        'We did not instantiate the application adapter fallback serializer'
      );
      assert.ok(defaultSerializerDidInit, 'We instantiated the `-default` fallback serializer');
      personAdapterDidInit = false;
      appAdapterDidInit = false;
      fallbackSerializerDidInit = false;
      defaultSerializerDidInit = false;

      let defaultSerializer = store.serializerFor('-default');
      assert.ok(defaultSerializer instanceof DefaultSerializer, 'We found the correct serializer');
      assert.ok(!defaultSerializerDidInit, 'We did not instantiate the serializer again');
      assert.ok(!appAdapterDidInit, 'We did not instantiate the application adapter');
      assert.ok(
        !fallbackSerializerDidInit,
        'We did not instantiate the application adapter fallback serializer'
      );
      assert.ok(!personAdapterDidInit, 'We did not instantiate the adapter again');
      assert.ok(
        defaultSerializer === serializer,
        'We fell back to the fallback-serializer instance'
      );
    });

    test('specifying defaultSerializer on a fallback serializer when there is no per-type serializer does work', async function(assert) {
      let { owner } = this;
      let appAdapterDidInit = false;
      let fallbackSerializerDidInit = false;
      let defaultSerializerDidInit = false;

      class AppAdapter extends TestAdapter {
        constructor() {
          super(...arguments);
          this.defaultSerializer = '-fallback';
        }

        didInit() {
          appAdapterDidInit = true;
        }
      }
      class FallbackSerializer extends TestSerializer {
        didInit() {
          fallbackSerializerDidInit = true;
        }
      }
      class DefaultSerializer extends TestSerializer {
        didInit() {
          defaultSerializerDidInit = true;
        }
      }

      owner.register('adapter:application', AppAdapter);
      owner.register('serializer:-fallback', FallbackSerializer);
      /*
        serializer:-default is the "last chance" fallback and is
        registered automatically as the json-api serializer.
       */
      owner.unregister('serializer:-default');
      owner.register('serializer:-default', DefaultSerializer);

      let serializer = store.serializerFor('person');

      assert.ok(serializer instanceof FallbackSerializer, 'We found the serializer');
      assert.ok(appAdapterDidInit, 'We instantiated the fallback application adapter');
      assert.ok(
        fallbackSerializerDidInit,
        'We instantiated the application adapter fallback defaultSerializer'
      );
      assert.ok(
        !defaultSerializerDidInit,
        'We did not instantiate the `-default` fallback serializer'
      );
      appAdapterDidInit = false;
      fallbackSerializerDidInit = false;
      defaultSerializerDidInit = false;

      let fallbackSerializer = store.serializerFor('-fallback');
      assert.ok(
        fallbackSerializer instanceof FallbackSerializer,
        'We found the correct serializer'
      );
      assert.ok(!defaultSerializerDidInit, 'We did not instantiate the default serializer');
      assert.ok(!appAdapterDidInit, 'We did not instantiate the application adapter again');
      assert.ok(
        !fallbackSerializerDidInit,
        'We did not instantiate the application adapter fallback serializer again'
      );
      assert.ok(
        fallbackSerializer === serializer,
        'We fell back to the fallback-serializer instance'
      );
    });
  });

  test('When the per-type, application and adapter specified fallback serializer do not exist, we fallback to the -default serializer', async function(assert) {
    let { owner } = this;
    let appAdapterDidInit = false;
    let defaultSerializerDidInit = false;

    class AppAdapter extends TestAdapter {
      constructor() {
        super(...arguments);
        this.defaultSerializer = '-not-a-real-fallback';
      }

      didInit() {
        appAdapterDidInit = true;
      }
    }
    class DefaultSerializer extends TestSerializer {
      didInit() {
        defaultSerializerDidInit = true;
      }
    }

    owner.register('adapter:application', AppAdapter);
    /*
      serializer:-default is the "last chance" fallback and is
      registered automatically as the json-api serializer.
     */
    owner.unregister('serializer:-default');
    owner.register('serializer:-default', DefaultSerializer);

    let serializer = store.serializerFor('person');

    assert.ok(serializer instanceof DefaultSerializer, 'We found the serializer');
    assert.ok(appAdapterDidInit, 'We instantiated the fallback application adapter');
    assert.ok(defaultSerializerDidInit, 'We instantiated the `-default` fallback serializer');
    appAdapterDidInit = false;
    defaultSerializerDidInit = false;

    let appSerializer = store.serializerFor('application');

    assert.ok(appSerializer instanceof DefaultSerializer, 'We found the serializer');
    assert.ok(!appAdapterDidInit, 'We did not instantiate the application adapter again');
    assert.ok(
      !defaultSerializerDidInit,
      'We did not instantiate the `-default` fallback serializer again'
    );
    appAdapterDidInit = false;
    defaultSerializerDidInit = false;

    let fallbackSerializer = store.serializerFor('-not-a-real-fallback');

    assert.ok(fallbackSerializer instanceof DefaultSerializer, 'We found the serializer');
    assert.ok(!appAdapterDidInit, 'We did not instantiate the application adapter again');
    assert.ok(
      !defaultSerializerDidInit,
      'We did not instantiate the `-default` fallback serializer again'
    );
    appAdapterDidInit = false;
    defaultSerializerDidInit = false;

    let defaultSerializer = store.serializerFor('-default');
    assert.ok(defaultSerializer instanceof DefaultSerializer, 'We found the correct serializer');
    assert.ok(!defaultSerializerDidInit, 'We did not instantiate the default serializer again');
    assert.ok(!appAdapterDidInit, 'We did not instantiate the application adapter again');
    assert.ok(
      defaultSerializer === serializer,
      'We fell back to the -default serializer instance for the per-type serializer'
    );
    assert.ok(
      defaultSerializer === appSerializer,
      'We fell back to the -default serializer instance for the application serializer'
    );
    assert.ok(
      defaultSerializer === fallbackSerializer,
      'We fell back to the -default serializer instance for the adapter defaultSerializer'
    );
  });
});
