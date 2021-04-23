// Tests copied from ember-fetch addon

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { determineBodyPromise } from '@ember-data/adapter/-private';

class Response {
  ok = true;

  constructor(text, options) {
    this.status = options.status;
    this._text = text;
  }

  text() {
    return resolve(this._text);
  }
}

module('Unit | determineBodyPromise', function () {
  test('determineBodyResponse returns the body when it is present', function (assert) {
    assert.expect(1);

    const response = new Response('{"data": "foo"}', { status: 200 });
    const bodyPromise = determineBodyPromise(response, {});

    return bodyPromise.then((body) => {
      assert.deepEqual(body, { data: 'foo' }, 'body response parsed correctly');
    });
  });

  test('determineBodyResponse rejects with an error if it is not json', function (assert) {
    assert.expect(1);

    const response = new Response('this is not json', { status: 200 });
    const bodyPromise = determineBodyPromise(response, {});

    return bodyPromise.then((body) => {
      assert.true(body instanceof SyntaxError, 'body response syntax errored if cannot be parsed as json');
    });
  });

  test('determineBodyResponse returns undefined when the http status code is 204', function (assert) {
    assert.expect(1);

    const response = new Response(null, { status: 204 });
    const bodyPromise = determineBodyPromise(response, {});

    return bodyPromise.then((body) => {
      assert.deepEqual(body, undefined, 'body response of null does not throw error for 204');
    });
  });

  test('determineBodyResponse returns undefined when the http status code is 205', function (assert) {
    assert.expect(1);

    const response = new Response(null, { status: 205 });
    const bodyPromise = determineBodyPromise(response, {});

    return bodyPromise.then((body) => {
      assert.deepEqual(body, undefined, 'body response of null does not throw error for 205');
    });
  });

  test("determineBodyResponse returns undefined when the request method is 'HEAD'", function (assert) {
    assert.expect(1);

    const response = new Response(null, { status: 200 });
    const bodyPromise = determineBodyPromise(response, { method: 'HEAD' });

    return bodyPromise.then((body) => {
      assert.deepEqual(body, undefined, 'body response of null does not throw error HEAD calls');
    });
  });

  test('determineBodyResponse returns undefined when the http status code is 204', function (assert) {
    assert.expect(1);

    const response = new Response('null', { status: 204 });
    const bodyPromise = determineBodyPromise(response, {});

    return bodyPromise.then((body) => {
      assert.deepEqual(body, undefined, 'body response of null does not throw error for 204');
    });
  });

  test('determineBodyResponse returns undefined when the http status code is 205', function (assert) {
    assert.expect(1);

    const response = new Response('null', { status: 205 });
    const bodyPromise = determineBodyPromise(response, {});

    return bodyPromise.then((body) => {
      assert.deepEqual(body, undefined, 'body response of null does not throw error for 205');
    });
  });

  test("determineBodyResponse returns undefined when the request method is 'HEAD'", function (assert) {
    assert.expect(1);

    const response = new Response('null', { status: 200 });
    const bodyPromise = determineBodyPromise(response, { method: 'HEAD' });

    return bodyPromise.then((body) => {
      assert.deepEqual(body, undefined, 'body response of null does not throw error HEAD calls');
    });
  });
});
