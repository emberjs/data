import { dasherize } from '@ember/string';
import { setResolver } from '@ember/test-helpers';
import EmberObject from '@ember/object';
import Ember from 'ember';
import Store from 'ember-data/store';
import Adapter from '@ember-data/adapter';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';
import config from '../../config/environment';
import Resolver from '../../resolver';

const { _RegistryProxyMixin, _ContainerProxyMixin, Registry } = Ember;

const Owner = EmberObject.extend(_RegistryProxyMixin, _ContainerProxyMixin);
const resolver = Resolver.create({
  namespace: {
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix,
  },
});

// TODO get us to a setApplication world instead
//   seems to require killing off createStore
setResolver(resolver);

export default function setupStore(options) {
  let container, registry, owner;
  let env = {};
  options = options || {};

  registry = new Registry();
  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  owner = Owner.create({ __registry__: registry });
  container = registry.container({ owner });
  owner.__container__ = container;

  env.owner = owner;
  env.container = container;
  env.registry = registry;

  env.replaceContainerNormalize = function replaceContainerNormalize(fn) {
    if (env.registry) {
      env.registry.normalize = fn;
    } else {
      env.container.normalize = fn;
    }
  };

  let adapter = (env.adapter = options.adapter || '-default');
  delete options.adapter;

  if (typeof adapter !== 'string') {
    env.registry.register('adapter:application', adapter);
    adapter = 'application';
  } else if (adapter === '-default') {
    // Tests using this should refactor.
    // this allows for more incremental migration off of createStore
    // by supplying the adapter vs forcing an immediate full refactor
    // to modern syntax
    // The minimal refactor is to set `adapter: Adapter` on usage of
    // `createStore` that does not currently supply Adapter.
    owner.register('adapter:-default', Adapter);
  }

  for (let prop in options) {
    registry.register('model:' + dasherize(prop), options[prop]);
  }

  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  const TestStore = Store.extend({ adapter });
  owner.register('service:store', TestStore);

  owner.inject('serializer', 'store', 'service:store');
  registry.injection('serializer', 'store', 'service:store');

  const store = (env.store = container.lookup('service:store'));

  // this allows for more incremental migration off of createStore
  // by supplying the serializer vs forcing an immediate full refactor
  // to modern syntax
  if (options.serializer) {
    env.registry.register('serializer:application', options.serializer);
    env.serializer = store.serializerFor('application');
  } else {
    // Many tests rely on falling back to this serializer
    // they should refactor to register this as the application serializer
    owner.register('serializer:-default', JSONAPISerializer);

    // RESTAdapter specifies a defaultSerializer of -rest
    // Tests using this should refactor to register this as the application serializer
    owner.register('serializer:-rest', RESTSerializer);

    env.restSerializer = store.serializerFor('-rest');
    env.serializer = store.serializerFor('-default');
  }

  // lazily create the adapter method because some tests depend on
  // modifiying the adapter in the container after setupStore is
  // called
  Object.defineProperty(env, 'adapter', {
    get() {
      if (!this._adapter) {
        this._adapter = this.store.adapterFor('application');
      }
      return this._adapter;
    },
    set(adapter) {
      this._adapter = adapter;
    },
    enumerable: true,
    configurable: true,
  });

  return env;
}

export { setupStore };

export function createStore(options) {
  return setupStore(options).store;
}
