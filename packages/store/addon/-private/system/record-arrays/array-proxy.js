import EmberObject, { get } from '@ember/object';
import MutableArray from '@ember/array/mutable';
import Evented from '@ember/object/evented';
import { A } from '@ember/array';

// we must extend MutableArray to prevent A(recordArray) overriding our methods later.
export default class ArrayProxy extends EmberObject.extend(Evented, MutableArray, {
  firstObject: null, // otherwise `.get` takes precedence over our own
  lastObject: null,
  length: null,
}) {
  constructor(options) {
    super(options);

    /**
      The array of client ids backing the record array. When a
      record is requested from the record array, the record
      for the client id at the same index is materialized, if
      necessary, by the store.

      @property content
      @private
      @type Ember.Array
      */
    this.content = this.content || null;
  }

  static create(options) {
    return new this(options);
  }

  get length() {
    return this.content ? this.content.length : 0;
  }

  // array-like interface
  toArray() {
    return A(this.map(v => v));
  }

  objectAt(index) {
    return objectAt(this.content, index);
  }

  objectAtContent(index) {
    return this.objectAt(index);
  }

  get lastObject() {
    const { length } = this;
    return length > 0 ? this.objectAt(length - 1) : undefined;
  }

  get firstObject() {
    return this.length > 0 ? this.objectAt(0) : undefined;
  }

  _pushObjects(values) {
    if (this.isDestroyed) {
      return;
    }
    const { length } = this;
    const addedCount = values.length;

    this.arrayContentWillChange(length, 0, addedCount);
    this.content.pushObjects(values);
    this.arrayContentDidChange(length, 0, addedCount);
  }

  _addObjects(values) {
    if (this.isDestroyed) {
      return;
    }

    const addedCount = values.length;
    const toAdd = [];
    for (let i = 0; i < addedCount; i++) {
      let im = values[i];
      if (this.content.indexOf(im) === -1) {
        toAdd.push(im);
      }
    }

    if (toAdd.length !== 0) {
      this._pushObjects(toAdd);
    }
  }

  _removeObjects(values) {
    if (this.isDestroyed) {
      return;
    }

    const removedCount = values.length;
    let startIndex = null;
    let count = 0;
    for (let i = 0; i < removedCount; i++) {
      let im = values[i];
      let index = this.content.indexOf(im);

      // ignore this entry
      if (index === -1) {
        // flush if we have anything since the chain is broken
        if (count !== 0) {
          removeObjects(this, values, startIndex, count);
          startIndex = null;
          count = 0;
        }
        continue;
        // begin tracking where to remove from
      } else if (count === 0) {
        count = 1;
        startIndex = index;
        continue;
        // add to the slice
      } else if (index === startIndex + 1) {
        count++;
        continue;
        // flush the current slice, start a new slice
      } else {
        removeObjects(this, values, startIndex, count);
        // we need to get the new index now that we've removed some
        startIndex = this.content.indexOf(im);
        count = 1;
        continue;
      }
    }

    if (count !== 0) {
      removeObjects(this, values, startIndex, count);
    }
  }

  clear() {
    this._removeObjects(this.content);
  }

  invoke(methodName) {
    return this.map(i => i[methodName]());
  }

  map(cb) {
    let ret = [];
    this.forEach((v, i) => {
      ret[i] = cb(v);
    });
    return ret;
  }

  mapBy(property) {
    return this.map(v => get(v, property));
  }

  findBy(property, value) {
    const { length } = this;
    for (let i = 0; i < length; i++) {
      let v = this.objectAt(i);
      if (get(v, property) === value) {
        return v;
      }
    }
  }

  forEach(cb) {
    const { length } = this;
    for (let i = 0; i < length; i++) {
      let v = this.objectAt(i);
      cb(v, i);
    }
  }

  replace(start, count, objects) {
    this.arrayContentWillChange(start, count, objects.length);
    this.content.replace(start, count, objects);
    this.arrayContentDidChange(start, count, objects.length);
  }
}

function objectAt(arr, index) {
  if (!arr) {
    return;
  }
  if (arr && arr.objectAt) {
    return arr.objectAt(index);
  }
  return arr[index];
}

function removeObjects(recordArray, internalModels, start, count) {
  recordArray.arrayContentWillChange(start, count, 0);
  let objects = internalModels.slice(start, start + count);
  recordArray.content.removeObjects(objects);
  recordArray.arrayContentDidChange(start, count, 0);
}
