// TODO kill this evil awful coerce thing
import coerceId from '../coerce-id';
import { DEBUG } from '@glimmer/env';

let CLIENT_ID = 0;
let IDENTIFIER = null;

export function createIdentifierIndex(config) {
  if (DEBUG) {
    if (IDENTIFIER !== null) {
      debugger;
      throw new Error('createIdentifierIndex called multiple times without a matching call to clearIdentifierIndex.');
    } else {
      console.trace('createIdentifierIndex');
    }
  }

  IDENTIFIER = new IdentifierIndex(config);

  return IDENTIFIER;
}

export function clearIdentifierIndex() {
  if (DEBUG) {
    if (IDENTIFIER === null) {
      throw new Error('clearIdentifierIndex called before createIdentifierIndex has setup an index');
    } else {
      console.trace('clearIdentifierIndex');
    }
  }

  IDENTIFIER.clear();
  IDENTIFIER = null;
}

function generateClientId(int) {
  return `@ember-data:lid-${int}`;
}

export class RecordIdentifier {
  constructor({ type, id, lid, meta }) {
    this.type = type;
    this.id = coerceId(id);
    this.lid = lid || generateClientId(CLIENT_ID++);
    this.meta = meta || null;
  }

  update({ meta, type, id }) {
    if (type !== undefined) {
      this.type = type;
    }

    if (id !== undefined) {
      this.id = coerceId(id);
    }

    if (meta) {
      Object.assign(this.meta, meta);
    } else if (meta === null) {
      this.meta = null;
    }
  }
}

/*
```ts
  interface indexer {
    name: string;
    match(identity: any): string|undefined {};
  }
```
*/
const DEFAULT_INDEXERS = [
  {
    name: 'json-api-lid',
    match(identity) {
      // convenience for passing in `lid` directly
      if (typeof identity === 'string' && identity.length > 0) {
        return [identity];
      }

      if (typeof identity === 'object' && identity !== null) {
        return identity.lid !== null && identity.lid !== undefined ? [identity.lid] : undefined;
      }
    }
  },
  {
    name: 'json-api-type',
    match(identity) {
      if (typeof identity === 'object' && identity !== null) {
        let { type, lid } = identity;

        if (
          typeof type === 'string' && type.length > 0 &&
          typeof lid === 'string' && lid.length > 0
        ) {
          return [type, lid];
        }
      }
    }
  },
  {
    name: 'json-api-identifier',
    match(identity) {
      if (typeof identity === 'object' && identity !== null) {
        let { type, id: rawId } = identity;
        let id = coerceId(rawId);

        if (
          typeof type === 'string' && type.length > 0 &&
          typeof id === 'string' && id.length > 0
        ) {
          return [type, id];
        }
      }
    }
  }
];

class IdentifierIndex {
  constructor(config = {}) {
    this.cache = Object.create(null);
    this.indexers = [].concat(DEFAULT_INDEXERS, config.indexers || []);
  }

  clear() {
    this.cache = Object.create(null);
    this.indexers = [];
  }

  _iterateIndexes(identifier, cb) {
    let { indexers } = this;

    for (let i = 0; i < indexers.length; i++) {
      let { name } = indexers[i];
      let index = indexers[i].match(identifier);

      if (cb(name, index) === true) {
        break;
      }
    }
  }

  getRecordIdentifier(resourceIdentifier) {
    let foundValue = false;
    let value;

    this._iterateIndexes(resourceIdentifier, (name, path) => {
      if (Array.isArray(path)) {
        value = this.getFromIndex(name, path);
      }

      if (value instanceof RecordIdentifier) {
        foundValue = true;
        return true;
      }
    });

    if (foundValue === false) {
      value = new RecordIdentifier(resourceIdentifier);

      this._iterateIndexes(value, (name, path) => {
        if (Array.isArray(path)) {
          this.addToIndex(name, path, value);
        }
      });
    }

    return value;
  }

  updateIndexes() {
    throw new Error('updateIndexes has not been implemented');
  }

  getFromIndex(name, path) {
    let { cache } = this;
    let index = cache[name];

    if (index !== undefined) {
      for (let i = 0; i < path.length; i++) {
        index = index[path[i]];

        if (index === undefined) {
          break;
        }
      }
    }

    return index;
  }

  addToIndex(name, path, value) {
    let { cache } = this;
    let index = cache[name] = cache[name] || Object.create(null);
    let lastIndex = path.length - 1;

    for (let i = 0; i < path.length; i++) {
      let key = path[i];

      if (i === lastIndex) {
        index[key] = value;
      } else {
        index = index[key] = index[key] || Object.create(null);
      }
    }
  }
}

export function recordIdentifierFor(resourceIdentifier) {
  if (DEBUG) {
    if (IDENTIFIER === null) {
      debugger;
      throw new Error('recordIdentifierFor called before createIdentifierIndex has setup an index');
    }
  }
  return IDENTIFIER.getRecordIdentifier(resourceIdentifier);
}
