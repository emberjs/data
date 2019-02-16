import { dasherize } from '@ember/string';
import { setResolver } from '@ember/test-helpers';
import EmberObject from '@ember/object';
import Ember from 'ember';
import Store from 'ember-data/store';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import RESTAdapter from 'ember-data/adapters/rest';
import Adapter from 'ember-data/adapter';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import RESTSerializer from 'ember-data/serializers/rest';
import JSONSerializer from 'ember-data/serializers/json';
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
    env.registry.register('adapter:-ember-data-test-custom', adapter);
    adapter = '-ember-data-test-custom';
  }

  for (let prop in options) {
    registry.register('model:' + dasherize(prop), options[prop]);
  }

  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  owner.register('service:store', Store.extend({ adapter }));
  owner.register('serializer:-default', JSONAPISerializer);
  owner.register('serializer:-json', JSONSerializer);
  owner.register('serializer:-rest', RESTSerializer);
  owner.register('adapter:-default', Adapter);
  owner.register('adapter:-rest', RESTAdapter);
  owner.register('adapter:-json-api', JSONAPIAdapter);

  owner.inject('serializer', 'store', 'service:store');

  owner.inject('serializer', 'store', 'service:store');

  registry.injection('serializer', 'store', 'service:store');

  env.store = container.lookup('service:store');
  env.restSerializer = container.lookup('serializer:-rest');
  env.restSerializer.store = env.store;
  env.serializer = env.store.serializerFor('-default');
  env.serializer.store = env.store;
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
