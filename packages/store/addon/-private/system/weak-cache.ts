import { DEBUG } from '@glimmer/env';

import { addSymbol, symbol } from '../ts-interfaces/utils/symbol';

interface WeakCache<K extends object, V> extends WeakMap<K, V> {
  _symbol?: Symbol | string;
  _fieldName?: string;
  _generator?: (key: K) => V;
  _expectMsg?: (key: K) => string;
}

class WeakCache<K extends object, V> extends WeakMap<K, V> {
  constructor(_fieldName?: string) {
    super();
    if (DEBUG) {
      this._fieldName = _fieldName;
      this._symbol = symbol(_fieldName || '');
    }
  }

  has(obj: unknown): obj is K {
    return super.has(obj as K);
  }

  set(obj: K, value: V): this {
    if (DEBUG && super.has(obj)) {
      throw new Error(`${obj} was already assigned a value for ${this._fieldName}`);
    }
    if (DEBUG) {
      addSymbol(obj, this._symbol!, value);
    }
    return super.set(obj, value);
  }

  getWithError(obj: K): V {
    let v = this.get(obj);

    if (DEBUG && v === undefined) {
      throw new Error(this._expectMsg!(obj));
    }

    return v as V;
  }

  lookup(obj: K): V {
    let v = super.get(obj);

    if (v === undefined) {
      v = this._generator!(obj);
      super.set(obj, v);

      if (DEBUG) {
        addSymbol(obj, this._symbol!, v);
      }
    }

    return v;
  }
}

export default WeakCache;
