import require, { has } from 'require';

type MaybeFetch = {
  (input: RequestInfo, init?: RequestInit | undefined): Promise<Response>;
} | null;

let _fetch: MaybeFetch = null;

if (has('fetch')) {
  // use `fetch` module by default, this is commonly provided by ember-fetch
  _fetch = require('fetch').default;
} else if (typeof fetch === 'function') {
  // fallback to using global fetch
  _fetch = fetch;
}

export default _fetch;
