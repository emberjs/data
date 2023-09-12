import { module, test } from 'qunit';

import { filterEmpty } from '@ember-data/request-utils';

module('filterEmpty', function () {
  test('it returns an empty object when given an empty object', function (assert) {
    assert.deepEqual(filterEmpty({}), {});
  });

  test('it returns an object with truthy values and meaningful falsy values like `false` and `0`', function (assert) {
    assert.deepEqual(
      filterEmpty({
        foo: 'bar',
        baz: null,
        zero: 0,
        booleanFalse: false,
        emptyArray: [],
        fullArray: [1, 2, 3],
      }),
      {
        zero: 0,
        booleanFalse: false,
        foo: 'bar',
        fullArray: [1, 2, 3],
      }
    );
  });
});
