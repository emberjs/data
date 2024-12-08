import type { Handler, NextFn, RequestContext, RequestInfo, StructuredDataDocument } from '@ember-data/request';

import { getTestInfo } from './env';

export class MockServerHandler implements Handler {
  declare owner: object;
  constructor(owner: object) {
    this.owner = owner;
  }

  async request<T>(context: RequestContext, next: NextFn<T>): Promise<StructuredDataDocument<T>> {
    const test = getTestInfo(this.owner);
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
