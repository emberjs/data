import { module, test } from 'qunit';

import { parseResponseHeaders } from '@ember-data/adapter/-private';

const CRLF = '\u000d\u000a';
const LF = '\u000a';

module('unit/adapters/parse-response-headers', function () {
  test('returns an NULL Object when headersString is undefined', function (assert) {
    let headers = parseResponseHeaders(undefined);

    assert.deepEqual(headers, Object.create(null), 'NULL Object is returned');
  });

  test('header parsing', function (assert) {
    let headersString = [
      'Content-Encoding: gzip',
      'content-type: application/json; charset=utf-8',
      'date: Fri, 05 Feb 2016 21:47:56 GMT',
    ].join(CRLF);

    let headers = parseResponseHeaders(headersString);

    assert.strictEqual(headers['content-encoding'], 'gzip', 'parses basic header pair');
    assert.strictEqual(headers['content-type'], 'application/json; charset=utf-8', 'parses header with complex value');
    assert.strictEqual(headers['date'], 'Fri, 05 Feb 2016 21:47:56 GMT', 'parses header with date value');
  });

  test('field-name parsing', function (assert) {
    let headersString = [
      '  name-with-leading-whitespace: some value',
      'name-with-whitespace-before-colon : another value',
      'Uppercase-Name: yet another value',
    ].join(CRLF);

    let headers = parseResponseHeaders(headersString);

    assert.strictEqual(
      headers['name-with-leading-whitespace'],
      'some value',
      'strips leading whitespace from field-name'
    );
    assert.strictEqual(
      headers['name-with-whitespace-before-colon'],
      'another value',
      'strips whitespace before colon from field-name'
    );
    assert.strictEqual(headers['uppercase-name'], 'yet another value', 'lowercases the field-name');
  });

  test('field-value parsing', function (assert) {
    let headersString = [
      'value-with-leading-space: value with leading whitespace',
      'value-without-leading-space:value without leading whitespace',
      'value-with-colon: value with: a colon',
      'value-with-trailing-whitespace: banana   ',
    ].join(CRLF);

    let headers = parseResponseHeaders(headersString);

    assert.strictEqual(
      headers['value-with-leading-space'],
      'value with leading whitespace',
      'strips leading whitespace in field-value'
    );
    assert.strictEqual(
      headers['value-without-leading-space'],
      'value without leading whitespace',
      'works without leaading whitespace in field-value'
    );
    assert.strictEqual(
      headers['value-with-colon'],
      'value with: a colon',
      'has correct value when value contains a colon'
    );
    assert.strictEqual(
      headers['value-with-trailing-whitespace'],
      'banana',
      'strips trailing whitespace from field-value'
    );
  });
  ('\r\nfoo: bar');

  test('ignores headers that do not contain a colon', function (assert) {
    let headersString = ['Content-Encoding: gzip', 'I am ignored because I do not contain a colon', 'apple: pie'].join(
      CRLF
    );

    let headers = parseResponseHeaders(headersString);

    assert.deepEqual(headers['content-encoding'], 'gzip', 'parses basic header pair');
    assert.deepEqual(headers['apple'], 'pie', 'parses basic header pair');
    assert.strictEqual(Object.keys(headers).length, 3, 'only has the three valid headers');
  });

  test('tollerate extra new-lines', function (assert) {
    let headersString = CRLF + 'foo: bar';
    let headers = parseResponseHeaders(headersString);

    assert.deepEqual(headers['foo'], 'bar', 'parses basic header pair');
    assert.strictEqual(Object.keys(headers).length, 1, 'only has the one valid header');
  });

  test('works with only line feeds', function (assert) {
    let headersString = [
      'Content-Encoding: gzip',
      'content-type: application/json; charset=utf-8',
      'date: Fri, 05 Feb 2016 21:47:56 GMT',
    ].join(LF);

    let headers = parseResponseHeaders(headersString);

    assert.strictEqual(headers['Content-Encoding'], 'gzip', 'parses basic header pair');
    assert.strictEqual(headers['content-type'], 'application/json; charset=utf-8', 'parses header with complex value');
    assert.strictEqual(headers['date'], 'Fri, 05 Feb 2016 21:47:56 GMT', 'parses header with date value');
  });
});
