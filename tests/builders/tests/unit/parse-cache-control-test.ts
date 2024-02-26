import { parseCacheControl } from '@ember-data/request-utils';
import { test as debug } from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import { module, test } from '@warp-drive/diagnostic';

module('parseCacheControl', function (hooks) {
  test('should parse a single Cache-Control directive', function (assert) {
    const header = 'max-age=3600';
    const result = parseCacheControl(header);
    assert.deepEqual(result, { 'max-age': 3600 });
  });

  test('should parse multiple Cache-Control directives', function (assert) {
    const header = 'max-age=3600, must-revalidate';
    const result = parseCacheControl(header);
    assert.deepEqual(result, { 'max-age': 3600, 'must-revalidate': true });
  });

  test('should parse Cache-Control directives with multiple delta-seconds values', function (assert) {
    const header = 'max-age=3600, s-maxage=7200';
    const result = parseCacheControl(header);
    assert.deepEqual(result, { 'max-age': 3600, 's-maxage': 7200 });
  });

  test('should parse Cache-Control directives with a single token value', function (assert) {
    const header = 'no-cache';
    const result = parseCacheControl(header);
    assert.deepEqual(result, { 'no-cache': true });
  });

  test('should parse Cache-Control directives with multiple token values', function (assert) {
    const header = 'no-cache, no-store';
    const result = parseCacheControl(header);
    assert.deepEqual(result, { 'no-cache': true, 'no-store': true });
  });

  test('should parse Cache-Control directives with a single byte-range-set value', function (assert) {
    const header =
      'max-age=3600, no-transform, only-if-cached, public, must-revalidate, proxy-revalidate, no-cache, s-maxage=7200, stale-while-revalidate=3600, stale-if-error=7200, immutable';
    const result = parseCacheControl(header);
    assert.deepEqual(result, {
      'max-age': 3600,
      'no-transform': true,
      'only-if-cached': true,
      public: true,
      'must-revalidate': true,
      'proxy-revalidate': true,
      'no-cache': true,
      's-maxage': 7200,
      'stale-while-revalidate': 3600,
      'stale-if-error': 7200,
      immutable: true,
    });
  });

  debug('throws when Cache-Control has invalid directives', async function (assert) {
    await assert.expectAssertion(() => {
      const header = 'max-age=,';
      parseCacheControl(header);
    }, /Assertion Failed: Invalid Cache-Control value, expected a value after "=" but got ","/);
  });

  debug('throws when Cache-Control has invalid value type', async function (assert) {
    await assert.expectAssertion(() => {
      const header = 'max-age="3600"';
      parseCacheControl(header);
    }, /Assertion Failed: Invalid Cache-Control value, expected a number but got - "3600"/);
  });
});
