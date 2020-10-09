import { module, test } from 'qunit';

import { fetchOptions } from '@ember-data/adapter/rest';

module('unit/adapters/rest-adapter/fetch-options', function(hooks) {
  test("fetchOptions removes undefined query params when method is POST and 'data' is an object", function(assert) {
    assert.expect(1);

    const dataAsObject = {
      a: 1,
      b: undefined,
      c: 3,
      d: null,
      e: 0,
      f: false,
    };

    const undefinedQueryStringOptions = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: dataAsObject,
    };

    let options = fetchOptions(undefinedQueryStringOptions);
    assert.deepEqual(options.body, '{"a":1,"c":3,"d":null,"e":0,"f":false}');
  });

  test('fetchOptions sets the request body correctly when the method is not GET or HEAD', function(assert) {
    assert.expect(3);

    const baseOptions = {
      url: '/',
      method: 'POST',
      data: { a: 1 },
    };

    // Tests POST method.
    let options = fetchOptions(baseOptions);
    assert.equal(options.body, JSON.stringify(baseOptions.data), 'POST request body correctly set');

    // Tests PUT method.
    baseOptions.method = 'PUT';
    options = fetchOptions(baseOptions);
    assert.equal(options.body, JSON.stringify(baseOptions.data), 'PUT request body correctly set');

    // Tests DELETE method.
    baseOptions.method = 'DELETE';
    options = fetchOptions(baseOptions);
    assert.equal(options.body, JSON.stringify(baseOptions.data), 'DELETE request has the correct body');
  });

  test("fetchOptions sets the request body correctly when the method is POST and 'data' is a string", function(assert) {
    assert.expect(1);

    // Tests stringified objects.
    const stringifiedData = JSON.stringify({ a: 1, b: 2 });
    const optionsWithStringData = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: stringifiedData,
    };

    let options = fetchOptions(optionsWithStringData);
    assert.equal(options.body, stringifiedData);
  });

  test('fetchOptions does not set a request body when the method is GET or HEAD', function(assert) {
    assert.expect(4);

    const baseOptions = {
      url: '/',
      method: 'GET',
      data: { a: 1 },
    };

    let options = fetchOptions(baseOptions);
    assert.strictEqual(options.body, undefined, 'GET request does not have a request body');

    baseOptions.method = 'HEAD';
    options = fetchOptions(baseOptions);
    assert.strictEqual(options.body, undefined, 'HEAD request does not have a request body');

    baseOptions.data = {};
    options = fetchOptions(baseOptions);
    assert.strictEqual(
      options.body,
      undefined,
      'HEAD request does not have a request body when `data` is an empty object'
    );

    baseOptions.method = 'GET';
    options = fetchOptions(baseOptions);
    assert.strictEqual(
      options.body,
      undefined,
      'GET request does not have a request body when `data` is an empty object'
    );
  });

  test("fetchOptions correctly processes an empty 'data' object", function(assert) {
    assert.expect(2);

    const getData = {
      url: 'https://emberjs.com',
      method: 'GET',
      data: {},
    };

    const getOptions = fetchOptions(getData);
    assert.equal(getOptions.url.indexOf('?'), -1, 'A question mark is not added if there are no query params to add');

    const postData = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: {},
    };

    const postOptions = fetchOptions(postData);
    assert.equal(postOptions.body, '{}', "'options.body' is an empty object");
  });

  test("fetchOptions sets the request body correctly when 'data' is FormData", function(assert) {
    assert.expect(1);

    const formData = new FormData();
    const postData = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: formData,
    };

    const postOptions = fetchOptions(postData);
    assert.strictEqual(postOptions.body, formData, "'options.body' is the FormData passed in");
  });

  test("fetchOptions sets the request body correctly when 'data' is a String", function(assert) {
    assert.expect(1);

    let stringBody = JSON.stringify({ a: 1, b: 2, c: 3 });
    const postData = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: stringBody,
    };

    const postOptions = fetchOptions(postData);
    assert.equal(postOptions.body, stringBody, "'options.body' is the String passed in");
  });

  test("fetchOptions sets credentials when 'credentials' is empty", function(assert) {
    assert.expect(1);

    const postData = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: {},
    };

    const postOptions = fetchOptions(postData);
    assert.equal(postOptions.credentials, 'same-origin', "'options.credentials' is 'same-origin'");
  });

  test("fetchOptions sets credentials when 'credentials' is not empty", function(assert) {
    assert.expect(1);

    let credentials = 'include';
    const postData = {
      url: 'https://emberjs.com',
      method: 'POST',
      data: {},
      credentials: credentials,
    };

    const postOptions = fetchOptions(postData);
    assert.equal(postOptions.credentials, credentials, "'options.credentials' is 'include'");
  });

  test('fetchOptions serializes query params to the url', function(assert) {
    assert.expect(1);

    const postData = {
      url: 'https://emberjs.com',
      method: 'GET',
      data: {
        fields: {
          post: 'title,email',
          comments: 'body',
        },
      },
    };

    const postOptions = fetchOptions(postData);
    assert.equal(
      postOptions.url,
      'https://emberjs.com?fields%5Bpost%5D=title%2Cemail&fields%5Bcomments%5D=body',
      "'options.url' is serialized"
    );
  });
});
