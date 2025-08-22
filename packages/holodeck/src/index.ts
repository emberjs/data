/**
 * @module
 * @mergeModuleWith <project>
 */
import { SHOULD_RECORD } from '@warp-drive/core/build-config/env';
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { HTTPMethod, RequestContext, RequestInfo, StructuredDataDocument } from '@warp-drive/core/types/request';
import type { MinimumAdapterInterface } from '@warp-drive/legacy/compat';
import type { Store } from '@warp-drive/legacy/store';

import type { ScaffoldGenerator } from './mock';

const TEST_IDS = new WeakMap<
  object,
  {
    id: string;
    /**
     * keeps track of the count of calls to record a mock
     */
    mock: {
      /**
       * For each GET, we keep track of the count
       * for a specific URL
       */
      GET: Record<string, number>;
      /**
       * For each PUT, we keep track of the count
       * for a specific URL
       */
      PUT: Record<string, number>;
      /**
       * For each PATCH, we keep track of the count
       * for a specific URL
       */
      PATCH: Record<string, number>;
      /**
       * For each DELETE, we keep track of the count
       * for a specific URL
       */
      DELETE: Record<string, number>;
      /**
       * For each POST, we keep track of the count
       * for a specific URL
       */
      POST: Record<string, number>;
      /**
       * For each OPTIONS, we keep track of the count
       * for a specific URL
       */
      OPTIONS: Record<string, number>;
      /**
       * For each QUERY, we keep track of the count
       * for a specific URL
       */
      QUERY: Record<string, number>;
      /**
       * for each HEAD, we keep track of the count
       * for a specific URL
       */
      HEAD: Record<string, number>;
      /**
       * for each CONNECT, we keep track of the count
       * for a specific URL
       */
      CONNECT: Record<string, number>;
      /**
       * for each TRACE, we keep track of the count
       * for a specific URL
       */
      TRACE: Record<string, number>;
    };
    /**
     * keeps track of the count of calls to make a request
     */
    request: {
      /**
       * For each GET, we keep track of the count
       * for a specific URL
       */
      GET: Record<string, number>;
      /**
       * For each PUT, we keep track of the count
       * for a specific URL
       */
      PUT: Record<string, number>;
      /**
       * For each PATCH, we keep track of the count
       * for a specific URL
       */
      PATCH: Record<string, number>;
      /**
       * For each DELETE, we keep track of the count
       * for a specific URL
       */
      DELETE: Record<string, number>;
      /**
       * For each POST, we keep track of the count
       * for a specific URL
       */
      POST: Record<string, number>;
      /**
       * For each OPTIONS, we keep track of the count
       * for a specific URL
       */
      OPTIONS: Record<string, number>;
      /**
       * For each QUERY, we keep track of the count
       * for a specific URL
       */
      QUERY: Record<string, number>;
      /**
       * for each HEAD, we keep track of the count
       * for a specific URL
       */
      HEAD: Record<string, number>;
      /**
       * for each CONNECT, we keep track of the count
       * for a specific URL
       */
      CONNECT: Record<string, number>;
      /**
       * for each TRACE, we keep track of the count
       * for a specific URL
       */
      TRACE: Record<string, number>;
    };
  }
>();

let HOST = '/';

/**
 * @public
 */

export function setConfig({ host }: { host: string }): void {
  HOST = host.endsWith('/') ? host : `${host}/`;
}

/**
 * @public
 */

export function setTestId(context: object, str: string | null): void {
  if (str && TEST_IDS.has(context)) {
    throw new Error(`MockServerHandler is already configured with a testId.`);
  }
  if (str) {
    TEST_IDS.set(context, {
      id: str,
      mock: {
        GET: {},
        PUT: {},
        PATCH: {},
        DELETE: {},
        POST: {},
        QUERY: {},
        OPTIONS: {},
        HEAD: {},
        CONNECT: {},
        TRACE: {},
      },
      request: {
        GET: {},
        PUT: {},
        PATCH: {},
        DELETE: {},
        POST: {},
        QUERY: {},
        OPTIONS: {},
        HEAD: {},
        CONNECT: {},
        TRACE: {},
      },
    });
  } else {
    TEST_IDS.delete(context);
  }
}

const shouldRecord = SHOULD_RECORD ? true : false;
let IS_RECORDING: boolean | null = null;

/**
 * @public
 */
export function setIsRecording(value: boolean): void {
  IS_RECORDING = value === null ? value : Boolean(value);
}

/**
 * @public
 */
export function getIsRecording(): boolean {
  return IS_RECORDING === null ? shouldRecord : IS_RECORDING;
}

/**
 * A request handler that intercepts requests and routes them through
 * the Holodeck mock server.
 *
 * This handler modifies the request URL to include test identifiers
 * and manages request counts for accurate mocking.
 *
 * Requires that the test context be configured with a testId using `setTestId`.
 *
 * @param owner - the test context object used to retrieve the test ID.
 */
export class MockServerHandler implements Handler {
  declare owner: object;
  constructor(owner: object) {
    this.owner = owner;
  }
  async request<T>(context: RequestContext, next: NextFn<T>): Promise<StructuredDataDocument<T>> {
    const { request, queryForTest } = setupHolodeckFetch(this.owner, Object.assign({}, context.request));

    try {
      const future = next(request);
      context.setStream(future.getStream());
      return await future;
    } catch (e) {
      if (e instanceof Error && !(e instanceof DOMException)) {
        e.message = e.message.replace(queryForTest, '');
      }
      throw e;
    }
  }
}

function setupHolodeckFetch(owner: object, request: RequestInfo): { request: RequestInfo; queryForTest: string } {
  const test = TEST_IDS.get(owner);
  if (!test) {
    throw new Error(`MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test`);
  }

  const url = request.url!;
  const firstChar = url.includes('?') ? '&' : '?';
  const method = (request.method?.toUpperCase() ?? 'GET') as HTTPMethod;

  // enable custom methods
  if (!test.request[method]) {
    // eslint-disable-next-line no-console
    console.log(`⚠️ Using custom HTTP method ${method} for response to request ${url}`);

    test.request[method] = {};
  }
  if (!(url in test.request[method])) {
    test.request[method][url] = 0;
  }

  const queryForTest = `${firstChar}__xTestId=${test.id}&__xTestRequestNumber=${test.request[method][url]++}`;
  request.url = url + queryForTest;
  request.method = method;

  request.mode = 'cors';
  request.credentials = 'omit';
  request.referrerPolicy = '';

  // since holodeck currently runs on a separate port
  // and we don't want to trigger cors pre-flight
  // we convert PUT to POST to keep the request in the
  // "simple" cors category.
  if (request.method === 'PUT') {
    request.method = 'POST';
  }

  const headers = new Headers(request.headers);
  if (headers.has('Content-Type')) {
    // under the rules of simple-cors, content-type can only be
    // one of three things, none of which are what folks typically
    // set this to. Since holodeck always expects body to be JSON
    // this "just works".
    headers.set('Content-Type', 'text/plain');
    request.headers = headers;
  }

  return { request, queryForTest };
}

interface HasAdapterForFn {
  adapterFor(this: Store, modelName: string): MinimumAdapterInterface;
  adapterFor(this: Store, modelName: string, _allowMissing?: true): MinimumAdapterInterface | undefined;
}

/*
  _fetchRequest(options: FetchRequestInit): Promise<Response> {
    const fetchFunction = fetch();

    return fetchFunction(options.url, options);
  }
*/
interface PrivateAdapter {
  _fetchRequest(options: RequestInfo): Promise<Response>;
  hasOverriddenFetch: boolean;
  useFetch: boolean;
}

function upgradeAdapter(adapter: unknown): asserts adapter is PrivateAdapter {}
function upgradeStore(store: Store): asserts store is Store & { adapterFor: HasAdapterForFn['adapterFor'] } {
  if (typeof store.adapterFor !== 'function') {
    throw new Error('Store is not compatible with Holodeck. Missing adapterFor method.');
  }
}

/**
 * Creates an adapterFor function that wraps the provided adapterFor function
 * to override the adapter's _fetchRequest method to route requests through
 * the Holodeck mock server.
 *
 * @param owner - The test context object used to retrieve the test ID.
 */
export function installAdapterFor(owner: object, store: Store): void {
  upgradeStore(store);
  const fn = store.adapterFor;
  function holodeckAdapterFor(
    this: Store,
    modelName: string,
    _allowMissing?: true
  ): MinimumAdapterInterface | undefined {
    const adapter = fn.call(this, modelName, _allowMissing);

    if (adapter) {
      upgradeAdapter(adapter);

      if (!adapter.hasOverriddenFetch) {
        adapter.hasOverriddenFetch = true;
        adapter.useFetch = true;
        const originalFetch = adapter._fetchRequest?.bind(adapter);

        adapter._fetchRequest = function (options: RequestInfo) {
          if (!originalFetch) {
            throw new Error(`Adapter ${String(modelName)} does not implement _fetchRequest`);
          }
          const { request } = setupHolodeckFetch(owner, options);

          return originalFetch(request);
        };
      }
    }

    return adapter;
  }
  store.adapterFor = holodeckAdapterFor as HasAdapterForFn['adapterFor'];
}

/**
 * Mock a request by sending the scaffold to the mock server.
 *
 * @public
 */
export async function mock(owner: object, generate: ScaffoldGenerator, isRecording?: boolean): Promise<void> {
  if (getIsRecording() || isRecording) {
    const test = TEST_IDS.get(owner);
    if (!test) {
      throw new Error(`Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test`);
    }
    const requestToMock = generate();
    const { url: mockUrl, method } = requestToMock;
    if (!mockUrl || !method) {
      throw new Error(`MockError: Cannot mock a request without providing a URL and Method`);
    }
    const mockMethod = (method?.toUpperCase() ?? 'GET') as HTTPMethod;

    // enable custom methods
    if (!test.mock[mockMethod]) {
      // eslint-disable-next-line no-console
      console.log(`⚠️ Using custom HTTP method ${mockMethod} for response to request ${mockUrl}`);
      test.mock[mockMethod] = {};
    }
    if (!(mockUrl in test.mock[mockMethod])) {
      test.mock[mockMethod][mockUrl] = 0;
    }
    const testMockNum = test.mock[mockMethod][mockUrl]++;
    const url = `${HOST}__record?__xTestId=${test.id}&__xTestRequestNumber=${testMockNum}`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(requestToMock),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: '',
    });
  }
}
