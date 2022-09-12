import { module, test } from 'qunit';

import { serializeQueryParams } from '@ember-data/adapter/-private';

module('Unit | serializeQueryParams', function () {
  test('it works', function (assert) {
    assert.expect(1);

    const qp = {
      filter: '%foo',
    };
    const result = serializeQueryParams(qp);

    assert.deepEqual(result, 'filter=%25foo');
  });

  test('it works with nested', function (assert) {
    assert.expect(1);

    const qp = {
      filter: {
        children: [1, 2],
      },
    };
    const result = serializeQueryParams(qp);

    assert.deepEqual(result, 'filter%5Bchildren%5D%5B%5D=1&filter%5Bchildren%5D%5B%5D=2');
  });

  test('it treats null values in arrays as empty strings', function (assert) {
    assert.expect(1);

    const qp = {
      filter: {
        children: [null, 2],
      },
    };
    const result = serializeQueryParams(qp);

    assert.deepEqual(result, 'filter%5Bchildren%5D%5B%5D=&filter%5Bchildren%5D%5B%5D=2');
  });

  test('it works with + sign', function (assert) {
    assert.expect(1);

    const qp = {
      term: 'search me',
    };
    const result = serializeQueryParams(qp);

    assert.deepEqual(result, 'term=search%20me');
  });
});
