import { DEBUG } from '@glimmer/env';

import { addSymbol, symbol } from '../ts-interfaces/utils/symbol';

export default class WeakCache<K extends object, V> {
  private _cache = new WeakMap<K, V>();
  private _symbol?: Symbol | string;

  constructor(
    private _fieldName?: string,
    private _generator?: (key: K) => V,
    private _expectMsg?: (key: K) => string
  ) {
    if (DEBUG) {
      this._symbol = symbol(_fieldName || '');
    }
  }

  get(obj: K): V | undefined {
    return this._cache.get(obj);
  }

  has(obj: object): obj is K {
    return this._cache.has(obj as K);
  }

  delete(obj: K) {
    return this._cache.delete(obj);
  }

  set(obj: K, value: V): void {
    if (DEBUG && this._cache.has(obj)) {
      throw new Error(`${obj} was already assigned a value for ${this._fieldName}`);
    }
    if (DEBUG) {
      addSymbol(obj, this._symbol!, value);
    }
    this._cache.set(obj, value);
  }

  getWithError(obj: K): V {
    let v = this.get(obj);

    if (DEBUG && v === undefined) {
      throw new Error(this._expectMsg!(obj));
    }

    return v as V;
  }

  lookup(obj: K): V {
    let v = this._cache.get(obj);

    if (v === undefined) {
      v = this._generator!(obj);
      this._cache.set(obj, v);

      if (DEBUG) {
        addSymbol(obj, this._symbol!, v);
      }
    }

    return v;
  }
}
