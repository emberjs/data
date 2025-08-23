import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext, RequestInfo, StructuredDataDocument } from '@warp-drive/core/types/request';
import type { MinimumAdapterInterface } from '@warp-drive/legacy/compat';
import type { Store } from '@warp-drive/legacy/store';

import type { ScaffoldGenerator } from './mock';

const TEST_IDS = new WeakMap<object, { id: string; request: number; mock: number }>();

let HOST = '/';
export function setConfig({ host }: { host: string }): void {
  HOST = host.endsWith('/') ? host : `${host}/`;
}

export function setTestId(context: object, str: string | null): void {
  if (str && TEST_IDS.has(context)) {
    throw new Error(`MockServerHandler is already configured with a testId.`);
  }
  if (str) {
    TEST_IDS.set(context, { id: str, request: 0, mock: 0 });
  } else {
    TEST_IDS.delete(context);
  }
}

let IS_RECORDING = false;
export function setIsRecording(value: boolean): void {
  IS_RECORDING = Boolean(value);
}
export function getIsRecording(): boolean {
  return IS_RECORDING;
}

export class MockServerHandler implements Handler {
  declare owner: object;
  constructor(owner: object) {
    this.owner = owner;
  }
  async request<T>(context: RequestContext, next: NextFn<T>): Promise<StructuredDataDocument<T>> {
    const test = TEST_IDS.get(this.owner);
    if (!test) {
      throw new Error(
        `MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test`
      );
    }

    const request: RequestInfo = Object.assign({}, context.request);
    const isRecording = request.url!.endsWith('/__record');
    const firstChar = request.url!.includes('?') ? '&' : '?';
    const queryForTest = `${firstChar}__xTestId=${test.id}&__xTestRequestNumber=${
      isRecording ? test.mock++ : test.request++
    }`;
    request.url = request.url + queryForTest;

    request.mode = 'cors';
    request.credentials = 'omit';
    request.referrerPolicy = '';

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

function setupHolodeckFetch(owner: object, request: RequestInfo): RequestInfo {
  const test = TEST_IDS.get(owner);
  if (!test) {
    throw new Error(`MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test`);
  }

  const firstChar = request.url!.includes('?') ? '&' : '?';
  const queryForTest = `${firstChar}__xTestId=${test.id}&__xTestRequestNumber=${test.request++}`;
  request.url = request.url + queryForTest;

  request.mode = 'cors';
  request.credentials = 'omit';
  request.referrerPolicy = '';

  return request;
}

interface AdapterForFn {
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
function upgradeStore(store: Store): asserts store is Store & { adapterFor: AdapterForFn['adapterFor'] } {
  if (typeof store.adapterFor !== 'function') {
    throw new Error('Store is not compatible with Holodeck. Missing adapterFor method.');
  }
}

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

          // since holodeck currently runs on a separate port
          // and we don't want to trigger cors pre-flight
          // we convert PUT to POST to keep the request in the
          // "simple" cors category.
          if (options.method?.toUpperCase() === 'PUT') {
            options.method = 'POST';
          }

          const headers = new Headers(options.headers);
          if (headers.has('Content-Type')) {
            // under the rules of simple-cors, content-type can only be
            // one of three things, none of which are what folks typically
            // set this to. Since holodeck always expects body to be JSON
            // this "just works".
            headers.set('Content-Type', 'text/plain');
            options.headers = headers;
          }

          const req = setupHolodeckFetch(owner, options);
          return originalFetch(req);
        };
      }
    }

    return adapter;
  }
  store.adapterFor = holodeckAdapterFor as AdapterForFn['adapterFor'];
}

export async function mock(owner: object, generate: ScaffoldGenerator, isRecording?: boolean): Promise<void> {
  const test = TEST_IDS.get(owner);
  if (!test) {
    throw new Error(`Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test`);
  }
  const testMockNum = test.mock++;
  if (getIsRecording() || isRecording) {
    const port = window.location.port ? `:${window.location.port}` : '';
    const url = `${HOST}__record?__xTestId=${test.id}&__xTestRequestNumber=${testMockNum}`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(generate()),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: '',
    });
  }
}
