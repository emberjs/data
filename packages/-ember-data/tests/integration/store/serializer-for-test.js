import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Store from '@ember-data/store';

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

module('integration/store - serializerFor', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    store = owner.lookup('service:store');
  });

  test('when no serializer is available we return null', async function (assert) {
    let { owner } = this;
    /*
      serializer:-default is the "last chance" fallback and is
      the json-api serializer which is re-exported as app/serializers/-default.
      here we override to ensure serializerFor will return `undefined`.
     */
    const lookup = owner.lookup;
    owner.lookup = (registrationName) => {
      if (registrationName === 'serializer:-default') {
        return undefined;
      }
      return lookup.call(owner, registrationName);
    };
    class AppAdapter extends TestAdapter {}
    owner.register('adapter:application', AppAdapter);
    const serializer = store.serializerFor('person');
    assert.strictEqual(serializer, null, 'we received null when there was no serializer');
  });

  test('we find and instantiate the application serializer', async function (assert) {
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
    assert.notOk(didInstantiate, 'We did not instantiate the serializer again');
    assert.strictEqual(serializer, serializerAgain, 'Repeated calls to serializerFor return the same instance');
  });

  test('multiple stores do not share serializers', async function (assert) {
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
    assert.notStrictEqual(otherSerializer, serializer, 'We have a different serializer instance');

    otherStore.destroy();
  });

  test('we can find and instantiate per-type serializers', async function (assert) {
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
    assert.notOk(didInstantiateAppSerializer, 'We did not instantiate the application serializer');

    let appSerializer = store.serializerFor('application');
    assert.ok(appSerializer instanceof AppSerializer, 'We found the correct serializer');
    assert.ok(didInstantiateAppSerializer, 'We instantiated the application serializer');
    assert.notStrictEqual(appSerializer, serializer, 'We have separate serializers');
  });

  test('we fallback to the application serializer when a per-type serializer is not found', async function (assert) {
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
    assert.notOk(didInstantiateAppSerializer, 'We did not instantiate the serializer again');
    assert.strictEqual(appSerializer, serializer, 'We fell back to the application serializer instance');
  });

  test('serializers are destroyed', async function (assert) {
    let { owner } = this;
    let didInstantiate = false;
    let didDestroy = false;

    class AppSerializer extends TestSerializer {
      didInit() {
        didInstantiate = true;
      }

      destroy() {
        didDestroy = true;
      }
    }

    owner.register('serializer:application', AppSerializer);

    let serializer = store.serializerFor('application');

    assert.ok(serializer instanceof AppSerializer, 'precond - We found the correct serializer');
    assert.ok(didInstantiate, 'precond - We instantiated the serializer');

    run(store, 'destroy');

    assert.ok(didDestroy, 'serializer was destroyed');
  });
});
