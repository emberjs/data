/* global window, globalThis, global, self */
import { GlobalHooksStorage, HooksCallback, ModuleInfo, TestContext } from './-types';

export function assert(message: string, test: unknown): asserts test {
  if (!test) {
    throw new Error(message);
  }
}

export function getGlobal(): typeof globalThis {
  // prettier-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const g: typeof globalThis | null =
    typeof globalThis !== 'undefined' ? globalThis
      : typeof window !== 'undefined' ? window
      // @ts-expect-error global is node only
      : typeof global !== 'undefined' ? global
      : typeof self !== 'undefined' ? self
      : null;

  assert(`Expected to find a global object`, g !== null);
  return g as unknown as typeof globalThis;
}

export function getChain<TC extends TestContext>(
  globalHooks: GlobalHooksStorage<TC>,
  module: ModuleInfo<TC>,
  parents: ModuleInfo<TC>[] | null,
  prop: 'beforeEach' | 'afterEach'
): HooksCallback<TC>[] {
  const chain: HooksCallback<TC>[] = [];

  if (globalHooks[prop].length) {
    chain.push(...globalHooks[prop]);
  }

  if (parents) {
    for (const parent of parents) {
      if (parent.config[prop].length) {
        chain.push(...parent.config[prop]);
      }
    }
  }
  if (module.config[prop].length) {
    chain.push(...module.config[prop]);
  }

  if (prop === 'afterEach') {
    chain.reverse();
  }

  return chain;
}

export function generateHash(str: string) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  // Convert the possibly negative integer hash code into an 8 character hex string, which isn't
  // strictly necessary but increases user understanding that the id is a SHA-like hash
  let hex = (0x100000000 + hash).toString(16);
  if (hex.length < 8) {
    hex = '0000000' + hex;
  }

  return hex.slice(-8);
}
