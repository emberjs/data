/**
 * @description Helper function to mock the response of an adapter in order to
 * test its behavior.
 * @param { adapter } RESTAdapter instance
 * @param { response } Response to return from the adapter
 * @return { ajaxCallback } Function that returns information about the last
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
    return Promise.resolve({
      text() {
        return Promise.resolve(JSON.stringify(structuredClone(value)));
      },
      ok: true,
      status: 200,
    });
  };

  adapter.ajax = (url, verb, hash) => {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return Promise.resolve(structuredClone(value));
  };

  return () => {
    return { passedUrl, passedVerb, passedHash };
  };
}

export { ajaxResponse };
