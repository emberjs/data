import EmptyObject from 'ember-data/-private/system/empty-object';
import parseResponseHeaders from 'ember-data/-private/utils/parse-response-headers';
import { module, test } from 'qunit';

const CRLF = '\u000d\u000a';

module('unit/adapters/parse-response-headers');

test('returns an EmptyObject when headersString is undefined', function(assert) {
  let headers = parseResponseHeaders(undefined);

  assert.deepEqual(headers, new EmptyObject(), 'EmptyObject is returned');
});

test('field is lowercased', function(assert) {
  let headersString = [
    'Content-Type: application/json',
    'CONTENT-ENCODING: gzip'
  ].join(CRLF);

  let headers = parseResponseHeaders(headersString);

  assert.ok(headers['content-type']);
  assert.ok(headers['Content-Type'], 'original cased field is present for backwards compatibility');

  assert.ok(headers['content-encoding']);
  assert.ok(headers['CONTENT-ENCODING'], 'original cased field is present for backwards compatibility');
});

test('header parsing', function(assert) {
  let headersString = [
    'content-encoding: gzip',
    'content-type: application/json; charset=utf-8',
    'date: Fri, 05 Feb 2016 21:47:56 GMT'
  ].join(CRLF);

  let headers = parseResponseHeaders(headersString);

  assert.equal(headers['content-encoding'], 'gzip', 'parses basic header pair');
  assert.equal(headers['content-type'], 'application/json; charset=utf-8', 'parses header with complex value');
  assert.equal(headers['date'], 'Fri, 05 Feb 2016 21:47:56 GMT', 'parses header with date value');
});

test('field-name parsing', function(assert) {
  let headersString = [
    '  name-with-leading-whitespace: some value',
    'name-with-whitespace-before-colon : another value'
  ].join(CRLF);

  let headers = parseResponseHeaders(headersString);

  assert.equal(headers['name-with-leading-whitespace'], 'some value', 'strips leading whitespace from field-name');
  assert.equal(headers['name-with-whitespace-before-colon'], 'another value', 'strips whitespace before colon from field-name');
});

test('field-value parsing', function(assert) {
  let headersString = [
    'value-with-leading-space: value with leading whitespace',
    'value-without-leading-space:value without leading whitespace',
    'value-with-colon: value with: a colon',
    'value-with-trailing-whitespace: banana   '
  ].join(CRLF);

  let headers = parseResponseHeaders(headersString);

  assert.equal(headers['value-with-leading-space'], 'value with leading whitespace', 'strips leading whitespace in field-value');
  assert.equal(headers['value-without-leading-space'], 'value without leading whitespace', 'works without leaading whitespace in field-value');
  assert.equal(headers['value-with-colon'], 'value with: a colon', 'has correct value when value contains a colon');
  assert.equal(headers['value-with-trailing-whitespace'], 'banana', 'strips trailing whitespace from field-value');
});

test('ignores headers that do not contain a colon', function(assert) {
  let headersString = [
    'content-encoding: gzip',
    'I am ignored because I do not contain a colon'
  ].join(CRLF);

  let headers = parseResponseHeaders(headersString);

  assert.deepEqual(headers['content-encoding'], 'gzip', 'parses basic header pair');
  assert.equal(Object.keys(headers).length, 1, 'only has the one valid header');
});
