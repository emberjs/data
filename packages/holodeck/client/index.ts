import type { Handler, NextFn, RequestContext, RequestInfo, StructuredDataDocument } from '@ember-data/request';

import type { ScaffoldGenerator } from './mock';

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
  async request<T>(context: RequestContext, next: NextFn<T>): Promise<StructuredDataDocument<T>> {
    if (!testId) {
      throw new Error(
        `MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test`
      );
    }

    const request: RequestInfo = Object.assign({}, context.request);
    const isRecording = request.url!.endsWith('/__record');
    const firstChar = request.url!.includes('?') ? '&' : '?';
    const queryForTest = `${firstChar}__xTestId=${testId}&__xTestRequestNumber=${isRecording ? testMockNumber++ : testRequestNumber++}`;
    request.url = request.url + queryForTest;

    request.mode = 'cors';
    request.credentials = 'omit';
    request.referrerPolicy = '';

    try {
      return await next(request);

    } catch (e) {
      if (e instanceof Error) {
        e.message = e.message.replace(queryForTest, '');
      }
      throw e;
    }
  },
};

export async function mock(generate: ScaffoldGenerator, isRecording: boolean) {
  if (!testId) {
    throw new Error(`Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test`);
  }
  const testMockNum = testMockNumber++;
  if (isRecording) {
    const url = `https://localhost:1135/__record?__xTestId=${testId}&__xTestRequestNumber=${testMockNum}`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(generate()),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: '',
    });
  }
}
