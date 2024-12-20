import { getConfig, getIsRecording, getTestInfo } from './env';
import type { ScaffoldGenerator } from './macros';

export async function mock(owner: object, generate: ScaffoldGenerator, isRecording?: boolean) {
  const config = getConfig();

  const test = getTestInfo(owner);
  if (!test) {
    throw new Error(`Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test`);
  }
  const testMockNum = test.mock++;
  if (getIsRecording() || isRecording) {
    const port = window.location.port ? `:${window.location.port}` : '';
    const url = `${config.host}__record?__xTestId=${test.id}&__xTestRequestNumber=${testMockNum}`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(generate()),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: '',
    });
  }
}
