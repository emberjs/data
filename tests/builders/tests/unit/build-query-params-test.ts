import { module, test } from 'qunit';

import { buildQueryParams } from '@ember-data/request-utils';
// import { test as debug } from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('buildQueryParams', function (hooks) {
  test('It serializes objects with stable key order', function (assert) {
    assert.strictEqual(
      buildQueryParams({
        foo: 'bar',
        baz: 'qux',
      }),
      'baz=qux&foo=bar',
      `buildQueryParams works`
    );
    assert.strictEqual(
      buildQueryParams({
        baz: 'qux',
        foo: 'bar',
      }),
      'baz=qux&foo=bar',
      `buildQueryParams works`
    );
  });

  test('It serializes URLSearchParams with stable key order', function (assert) {
    const params1 = new URLSearchParams();
    params1.append('foo', 'bar');
    params1.append('baz', 'qux');
    const params2 = new URLSearchParams();
    params2.append('baz', 'qux');
    params2.append('foo', 'bar');

    assert.strictEqual(buildQueryParams(params1), 'baz=qux&foo=bar', `buildQueryParams works`);
    assert.strictEqual(buildQueryParams(params2), 'baz=qux&foo=bar', `buildQueryParams works`);
  });

  test('It serializes objects with stable value order', function (assert) {
    assert.strictEqual(
      buildQueryParams({
        foo: ['c', 'b', 'a'],
        baz: ['f', 'd', 'e'],
      }),
      'baz=d%2Ce%2Cf&foo=a%2Cb%2Cc',
      `buildQueryParams works`
    );
    assert.strictEqual(
      buildQueryParams({
        foo: ['c', 'b', 'a'],
        baz: ['f', 'd', 'e'],
      }),
      'baz=d%2Ce%2Cf&foo=a%2Cb%2Cc',
      `buildQueryParams works`
    );
  });

  test('It serializes URLSearchParams with stable value order', function (assert) {
    const params1 = new URLSearchParams();
    params1.append('foo', 'c');
    params1.append('foo', 'b');
    params1.append('foo', 'a');
    params1.append('baz', 'f');
    params1.append('baz', 'd');
    params1.append('baz', 'e');
    const params2 = new URLSearchParams();
    params2.append('foo', 'c');
    params2.append('foo', 'b');
    params2.append('foo', 'a');
    params2.append('baz', 'f');
    params2.append('baz', 'd');
    params2.append('baz', 'e');

    assert.strictEqual(buildQueryParams(params1), 'baz=d%2Ce%2Cf&foo=a%2Cb%2Cc', `buildQueryParams works`);
    assert.strictEqual(buildQueryParams(params2), 'baz=d%2Ce%2Cf&foo=a%2Cb%2Cc', `buildQueryParams works`);
  });

  test('It special cases object.include', function (assert) {
    assert.strictEqual(
      buildQueryParams({
        include: ['foo', 'bar'],
      }),
      'include=bar%2Cfoo',
      `buildQueryParams works`
    );
    assert.strictEqual(
      buildQueryParams({
        include: 'foo,bar',
      }),
      'include=bar%2Cfoo',
      `buildQueryParams works`
    );
  });

  test('It allows for customizing the arrayFormat', function (assert) {
    assert.strictEqual(
      buildQueryParams(
        {
          foo: ['c', 'b', 'a'],
          baz: ['f', 'd', 'e'],
        },
        { arrayFormat: 'bracket' }
      ),
      'baz%5B%5D=d&baz%5B%5D=e&baz%5B%5D=f&foo%5B%5D=a&foo%5B%5D=b&foo%5B%5D=c',
      `buildQueryParams works`
    );
    assert.strictEqual(
      buildQueryParams(
        {
          foo: ['c', 'b', 'a'],
          baz: ['f', 'd', 'e'],
        },
        { arrayFormat: 'indices' }
      ),
      'baz%5B0%5D=d&baz%5B1%5D=e&baz%5B2%5D=f&foo%5B0%5D=a&foo%5B1%5D=b&foo%5B2%5D=c',
      `buildQueryParams works`
    );
    assert.strictEqual(
      buildQueryParams(
        {
          foo: ['c', 'b', 'a'],
          baz: ['f', 'd', 'e'],
        },
        { arrayFormat: 'repeat' }
      ),
      'baz=d&baz=e&baz=f&foo=a&foo=b&foo=c',
      `buildQueryParams works`
    );
    assert.strictEqual(
      buildQueryParams(
        {
          foo: ['c', 'b', 'a'],
          baz: ['f', 'd', 'e'],
        },
        { arrayFormat: 'comma' }
      ),
      'baz=d%2Ce%2Cf&foo=a%2Cb%2Cc',
      `buildQueryParams works`
    );
  });
});
