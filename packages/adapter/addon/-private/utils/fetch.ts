import require, { has } from 'require';

type FetchFunction = (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;

let _fetch: (() => FetchFunction) | null = null;

export default function getFetchFunction(): FetchFunction {
  if (_fetch !== null) {
    return _fetch();
  }

  if (has('fetch')) {
    // use `fetch` module by default, this is commonly provided by ember-fetch
    let fetchFn = require('fetch').default;
    _fetch = () => fetchFn;
  } else if (typeof fetch === 'function') {
    // fallback to using global fetch
    _fetch = () => fetch;
  } else {
    throw new Error(
      'cannot find the `fetch` module or the `fetch` global. Did you mean to install the `ember-fetch` addon?'
    );
  }
  return _fetch();
}
