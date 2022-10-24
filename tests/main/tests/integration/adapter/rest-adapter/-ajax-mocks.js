import { resolve } from 'rsvp';

import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';

/**
 * @description Helper function to mock the response of an adapter in order to
 * Test is behaviour.
 * @param { adapter } RESTAdapter instance
 * @param { response } Response to return from the adapter
 * @returns { ajaxCallback } Function that returns information about the last
 * call to the ajax method of the adapter.
 */
function ajaxResponse(adapter, value) {
  let passedUrl = null;
  let passedVerb = null;
  let passedHash = null;

  adapter._fetchRequest = (hash) => {
    passedHash = hash;
    passedUrl = passedHash.url;
    passedVerb = passedHash.method;
    return resolve({
      text() {
        return resolve(JSON.stringify(deepCopy(value)));
      },
      ok: true,
      status: 200,
    });
  };

  adapter.ajax = (url, verb, hash) => {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return resolve(deepCopy(value));
  };

  return () => {
    return { passedUrl, passedVerb, passedHash };
  };
}

export { ajaxResponse };
