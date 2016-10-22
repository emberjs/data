/* jshint expr:true */
import { module, test } from 'qunit';
import HeadersPolyfill from 'ember-data/-private/utils/headers'
import isEnabled from 'ember-data/-private/features';

if (isEnabled('ds-headers-api')) {
  module('unit/utils/headers');

  test('returns an array of header values from getAll, regardless of header name casing', function(assert) {
    var headers = {
      // Express concatenates repeated keys with ', '
      // and also lowercases the keys
      'x-test-header': 'value1, value2'
    };
    headers = new HeadersPolyfill(headers);

    assert.deepEqual(headers.getAll('X-Test-Header'), ['value1', 'value2']);
    assert.deepEqual(headers.getAll('x-test-header'), ['value1', 'value2']);
  });

  test('returns an emtpy array when a header is not present', function(assert) {
    var headers = {
      // Express concatenates repeated keys with ', '
      // and also lowercases the keys
      'x-test-header': 'value1, value2'
    };
    headers = new HeadersPolyfill(headers);

    assert.deepEqual(headers.getAll('Host'), []);
    assert.deepEqual(headers.getAll('host'), []);
  });

  test('returns the first value when using get, regardless of case', function(assert) {
    var headers = {
      // Express concatenates repeated keys with ', '
      // and also lowercases the keys
      "x-test-header": "value1, value2"
    };
    headers = new HeadersPolyfill(headers);

    assert.equal(headers.get('X-Test-Header'), 'value1');
    assert.equal(headers.get('x-test-header'), 'value1');
  });

  test('returns null when using get when a header is not present', function(assert) {
    var headers = {
      // Express concatenates repeated keys with ', '
      // and also lowercases the keys
      "x-test-header": "value1, value2"
    };
    headers = new HeadersPolyfill(headers);

    assert.equal(headers.get('Host'), null);
    assert.equal(headers.get('host'), null);
  });

  test('returns whether or not a header is present via has, regardless of casing', function(assert) {
    var headers = {
      // Express concatenates repeated keys with ', '
      // and also lowercases the keys
      "x-test-header": "value1, value2"
    };
    headers = new HeadersPolyfill(headers);

    assert.ok(headers.has('X-Test-Header'));
    assert.ok(headers.has('x-test-header'));
    assert.notOk(headers.has('Host'));
    assert.notOk(headers.has('host'));
  });

  test('appends entries onto a header, regardless of casing', function(assert) {
    var headers = new HeadersPolyfill();

    assert.notOk(headers.has('x-foo'));

    headers.append('X-Foo', 'bar');
    assert.ok(headers.has('x-foo'));
    assert.deepEqual(headers.getAll('x-foo'), ['bar']);

    headers.append('X-Foo', 'baz');
    assert.deepEqual(headers.getAll('x-foo'), ['bar', 'baz']);
  });

  test('deletes entries onto a header, regardless of casing', function(assert) {
    var headers = new HeadersPolyfill();

    headers.append('X-Foo', 'bar');
    assert.ok(headers.has('x-foo'));

    headers.delete('X-Foo');
    assert.notOk(headers.has('x-foo'));
  });

  test('returns an iterator for the header/value pairs when calling entries', function(assert) {
    var headers = new HeadersPolyfill();

    headers.append('X-Foo', 'foo');
    headers.append('X-Foo', 'baz');
    headers.append('x-bar', 'bar');

    var entriesIterator = headers.entries();
    assert.deepEqual(entriesIterator.next(), { value: ['x-foo', 'foo'], done: false });
    assert.deepEqual(entriesIterator.next(), { value: ['x-foo', 'baz'], done: false });
    assert.deepEqual(entriesIterator.next(), { value: ['x-bar', 'bar'], done: false });
    assert.deepEqual(entriesIterator.next(), { value: undefined, done: true });
  });

  test('returns an iterator for keys containing all the keys', function(assert) {
    var headers = new HeadersPolyfill();

    headers.append('X-Foo', 'foo');
    headers.append('X-Foo', 'baz');
    headers.append('x-bar', 'bar');

    var entriesIterator = headers.keys();
    assert.deepEqual(entriesIterator.next(), { value: 'x-foo', done: false });
    assert.deepEqual(entriesIterator.next(), { value: 'x-foo', done: false });
    assert.deepEqual(entriesIterator.next(), { value: 'x-bar', done: false });
    assert.deepEqual(entriesIterator.next(), { value: undefined, done: true });
  });

  test('sets a header, overwriting existing values, regardless of casing', function(assert) {
    var headers = new HeadersPolyfill();

    assert.deepEqual(headers.getAll('x-foo'), []);
    assert.deepEqual(headers.getAll('x-bar'), []);

    headers.append('X-Foo', 'foo');
    assert.deepEqual(headers.getAll('x-foo'), ['foo']);

    headers.set('x-foo', 'bar');
    assert.deepEqual(headers.getAll('X-foo'), ['bar']);

    headers.set('X-Bar', 'baz');
    assert.deepEqual(headers.getAll('x-bar'), ['baz']);
  });

  test('returns an iterator for values containing all the values', function(assert) {
    var headers = new HeadersPolyfill();

    headers.append('X-Foo', 'foo');
    headers.append('X-Foo', 'baz');
    headers.append('x-bar', 'bar');

    var entriesIterator = headers.values();
    assert.deepEqual(entriesIterator.next(), { value: 'foo', done: false });
    assert.deepEqual(entriesIterator.next(), { value: 'baz', done: false });
    assert.deepEqual(entriesIterator.next(), { value: 'bar', done: false });
    assert.deepEqual(entriesIterator.next(), { value: undefined, done: true });
  });

}
