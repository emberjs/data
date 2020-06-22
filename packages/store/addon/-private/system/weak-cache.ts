import { DEBUG } from '@glimmer/env';

import { addSymbol, symbol } from '../ts-interfaces/utils/symbol';

/*
  DEBUG only fields. Keeping this in a separate interface
  which Typescript then merges with the class definition allow us to
  have a DEBUG only property without paying the cost of that field being
  present and initialized (usually to void 0) in production.
*/
interface WeakCache<K extends object, V> extends WeakMap<K, V> {
  _symbol?: Symbol | string;
  _fieldName?: string;
  _expectMsg?: (key: K) => string;
  /*
    The default Typescript Signature for WeakMap expects obj: K and
    returns a boolean. This behavior isn't useful in our common case
    where we want to use `has` to narrow by determining whether a
    particular object is a key.

    For instance, we use WeakMap key check to determine in some cases
    whether an object given to us by a user is a RecordIdentifier or
    a Record.
  */
  has(obj: unknown): obj is K;

  /*
    This is an exception to the interface being used for
    DEBUG ony fields. In this case, only a few WeakCache's
    will utilize the lookup behavior, so paying the cost in
    the constructor signature / field initialization seemed
    off.
  */
  _generator?: (key: K) => V;
}

class WeakCache<K extends object, V> extends WeakMap<K, V> {
  constructor(_fieldName?: string) {
    super();
    if (DEBUG) {
      this._fieldName = _fieldName;
      this._symbol = symbol(_fieldName || '');
    }
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
