let IS_RECORDING = false;
export function setIsRecording(value: boolean) {
  IS_RECORDING = Boolean(value);
}
export function getIsRecording() {
  return IS_RECORDING;
}

export type TestInfo = { id: string; request: number; mock: number };
const TEST_IDS = new WeakMap<object, { id: string; request: number; mock: number }>();

let HOST = 'https://localhost:1135/';
export function setConfig({ host }: { host: string }) {
  HOST = host.endsWith('/') ? host : `${host}/`;
}

export function getConfig(): { host: string } {
  return { host: HOST };
}

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

export function getTestInfo(context: object): TestInfo | null {
  const test = TEST_IDS.get(context);
  return test ?? null;
}
