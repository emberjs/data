import { assert } from '@warp-drive/core/build-config/macros';

type FetchFunction = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

let _fetch: (() => FetchFunction) | null = null;
type MockRequest = { protocol?: string; get(key: string): string | undefined };
let REQUEST: MockRequest = null as unknown as MockRequest;

export function getFetchFunction(): FetchFunction {
  // return cached fetch function
  if (_fetch !== null) {
    return _fetch();
  }

  // grab browser native fetch if available, or global fetch if otherwise configured
  if (typeof fetch === 'function') {
    // fallback to using global fetch
    _fetch = () => fetch;

    /* global FastBoot */
    // grab fetch from node-fetch
  } else if (typeof FastBoot !== 'undefined') {
    try {
      const nodeFetch = FastBoot.require('node-fetch') as typeof fetch;

      const httpRegex = /^https?:\/\//;
      const protocolRelativeRegex = /^\/\//;

      function parseRequest(request: MockRequest) {
        if (request === null) {
          throw new Error(
            "Trying to fetch with relative url but the application hasn't finished loading FastBootInfo, see details at https://github.com/ember-cli/ember-fetch#relative-url"
          );
        }
        // Old Prember version is not sending protocol
        const protocol = request.protocol === 'undefined:' ? 'http:' : request.protocol;
        return [request.get('host'), protocol];
      }

      function buildAbsoluteUrl(url: string) {
        if (protocolRelativeRegex.test(url)) {
          const [host] = parseRequest(REQUEST);
          url = host + url;
        } else if (!httpRegex.test(url)) {
          const [host, protocol] = parseRequest(REQUEST);
          url = protocol + '//' + host + url;
        }
        return url;
      }

      function patchedFetch(input: string | { href: string } | RequestInfo, options?: RequestInit) {
        if (input && typeof input === 'object' && 'href' in input) {
          const url = buildAbsoluteUrl(input.href);
          const info = Object.assign({}, input, { url }) as unknown as RequestInfo;
          return nodeFetch(info, options);
        } else if (typeof input === 'string') {
          const url = buildAbsoluteUrl(input);
          return nodeFetch(url, options);
        }

        return nodeFetch(input, options);
      }

      _fetch = () => patchedFetch;
    } catch {
      throw new Error(`Unable to create a compatible 'fetch' for FastBoot with node-fetch`);
    }
  }

  assert(`Cannot find a 'fetch' global and did not detect FastBoot.`, _fetch);

  return _fetch();
}

export function setupFastboot(fastBootRequest: MockRequest): void {
  REQUEST = fastBootRequest;
}
