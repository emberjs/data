import QUnit from 'qunit';

import { asyncEqual, invokeAsync, wait } from './async';

const { assert } = QUnit;

export default function additionalLegacyAsserts() {
  assert.wait = wait;
  assert.asyncEqual = asyncEqual;
  assert.invokeAsync = invokeAsync;

  assert.assertClean = function (promise) {
    return promise.then(
      this.wait((record) => {
        this.equal(record.hasDirtyAttributes, false, 'The record is now clean');
        return record;
      })
    );
  };

  assert.contains = function (array, item) {
    this.ok(array.indexOf(item) !== -1, `array contains ${item}`);
  };

  assert.without = function (array, item) {
    this.ok(array.indexOf(item) === -1, `array doesn't contain ${item}`);
  };
}
