import type { Future, Handler, NextFn, RequestContext, RequestInfo } from '@ember-data/request/-private/types';

let testId: string | null = null;
let testRequestNumber = 0;
let testMockNumber = 0;

export function setTestId(str: string | null) {
  if (testId && str) {
    throw new Error(
      `MockServerHandler is already configured with a testId. Use setTestId(null) to clear the testId after each test!`
    );
  }
  testRequestNumber = 0;
  testMockNumber = 0;
  testId = str;
}

export const MockServerHandler: Handler = {
  request<T>(context: RequestContext, next: NextFn<T>): Future<T> {
    if (!testId) {
      throw new Error(
        `MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test`
      );
    }

    const request: RequestInfo = Object.assign({}, context.request);
    const isRecording = request.url!.endsWith('/__record');

    request.url = request.url!.includes('?') ? request.url! + '&' : request.url! + '?';
    request.url =
      request.url + `__xTestId=${testId}&__xTestRequestNumber=${isRecording ? testMockNumber++ : testRequestNumber++}`;

    request.mode = 'cors';
    request.credentials = 'omit';
    request.referrerPolicy = '';

    return next(request);
  },
};

interface Scaffold {
  status: number;
  headers: Record<string, string>;
  body: Record<string, string> | string | null;
  method: string;
  url: string;
  response: Record<string, unknown>;
}
export async function mock(generate: () => Scaffold, isRecording: boolean) {
  if (!testId) {
    throw new Error(`Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test`);
  }
  const testMockNum = testMockNumber++;
  if (isRecording) {
    const url = `https://localhost:1135/__record?__xTestId=${testId}&__xTestRequestNumber=${testMockNum}`;
    await fetch({
      url,
      method: 'POST',
      // @ts-expect-error not properly typed to allow string
      body: JSON.stringify(generate()),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: '',
    });
  }
}
