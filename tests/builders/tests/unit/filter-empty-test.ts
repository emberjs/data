import { module, test } from 'qunit';

import { filterEmpty } from '@ember-data/request-utils';

module('filterEmpty', function () {
  test('it returns an empty object when given an empty object', function (assert) {
    assert.deepEqual(filterEmpty({}), {});
  });

  test('it returns an object with only truthy values', function (assert) {
    assert.deepEqual(
      filterEmpty({
        foo: 'bar',
        baz: null,
        zero: 0,
        emptyArray: [],
        fullArray: [1, 2, 3],
        // arrayOfEmptyArray: [[]],
        // arrayWithEmptyArray: [[], [1, 2, 3]],
      }),
      {
        foo: 'bar',
        fullArray: [1, 2, 3],
        // arrayWithEmptyArray: [[], [1, 2, 3]],
      }
    );
  });
});
