import { DEBUG } from '@glimmer/env';

const PrivateProperties = DEBUG ? new WeakMap() : null;
const MetaProperties = new WeakMap();

function dictionaryFor(map, instance) {
  let properties = map.get(instance);

  if (properties === undefined) {
      properties = Object.create(null);
      map.set(instance, properties);
  }

  return properties;
}

function metaFor(instance) {
    return dictionaryFor(MetaProperties, instance);
}

function privatePropertiesFor(instance) {
  return dictionaryFor(PrivateProperties, instance);
}

const Handler  = {
    construct(Target, args) {
      return new Target(...args);
    },

    get(target, key) {
      if (privatePropertiesFor(target)[key] === true) {
          const type = typeof target[key] === 'function' ? 'method' : 'property';
          throw new Error(`Illegal Access of private ${type} '${key}' on ${target}`);
      }
      return target[key];
    },
    set(target, key, value) {
        if (privatePropertiesFor(target)[key] === true) {
            throw new Error(`Illegal Attempt to set private property '${key}' on ${target} to ${value}`);
        }
        return target[key] = value;
    },
};

export function isPrivate(target, name, descriptor) {
    if (DEBUG) {
        privatePropertiesFor(target)[name] = true;
    }
    return descriptor;
}

export function lazyProp(target, name, descriptor) {
  let key = `___${name}`;
  const get = descriptor.get;
  const set = descriptor.set;
  let setter;

  DEBUG ? metaFor(this)[key] = null : this[key] = null;

  function lazyGetter() {
    let value = DEBUG ? metaFor(this)[key] : this[key];
    if (value === null) {
      value = get.call(this);
      DEBUG ? metaFor(this)[key] = value : this[key] =  value;
    }
    return value;
  }

  if (set) {
    setter = function lazySetter(v) {
      let newValue = set.call(this, v); 
      DEBUG ? metaFor(this)[key] = newValue : this[key] = newValue;
    }
  }

  return {
    enumerable: true,
    configurable: false,
    get: lazyGetter,
    set: setter,
  }
}

export function DebugProxy(klass) {
    return DEBUG ? new Proxy(klass, Handler) : klass;
}
