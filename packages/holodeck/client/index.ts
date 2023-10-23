import type { Handler, NextFn, RequestContext, RequestInfo, StructuredDataDocument } from '@ember-data/request';

import type { ScaffoldGenerator } from './mock';

const TEST_IDS = new WeakMap<object, { id: string; request: number; mock: number }>();

export function setTestId(context: object, str: string | null) {
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
export function setIsRecording(value: boolean) {
  IS_RECORDING = Boolean(value);
}
export function getIsRecording() {
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
      return await next(request);
    } catch (e) {
      if (e instanceof Error && !(e instanceof DOMException)) {
        e.message = e.message.replace(queryForTest, '');
      }
      throw e;
    }
  }
}

export async function mock(owner: object, generate: ScaffoldGenerator, isRecording?: boolean) {
  const test = TEST_IDS.get(owner);
  if (!test) {
    throw new Error(`Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test`);
  }
  const testMockNum = test.mock++;
  if (getIsRecording() || isRecording) {
    const url = `https://localhost:1135/__record?__xTestId=${test.id}&__xTestRequestNumber=${testMockNum}`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(generate()),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: '',
    });
  }
}
