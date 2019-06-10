import require, { has } from 'require';

type FetchFunction = (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;

let _fetch: (() => FetchFunction) | null = null;

if (has('fetch')) {
  // use `fetch` module by default, this is commonly provided by ember-fetch
  let foundFetch = require('fetch').default;
  _fetch = () => foundFetch;
} else if (typeof fetch === 'function') {
  // fallback to using global fetch
  _fetch = () => fetch;
} else {
  throw new Error(
    'cannot find the `fetch` module or the `fetch` global. Did you mean to install the `ember-fetch` addon?'
  );
}

export default _fetch;
