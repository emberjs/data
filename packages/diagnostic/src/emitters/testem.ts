import type { CompatTestReport, Emitter } from '../-types';
import type { SuiteReport } from '../-types/report';
import { assert } from '../-utils';

type TestemSocket = {
  emit(name: 'tests-start' | 'all-test-results'): void; // suite-start / suite-finish
  emit(name: 'tests-start' | 'test-result', data: CompatTestReport): void; // test-start / test-finish
};

interface TestemGlobal {
  useCustomAdapter(callback: (socket: TestemSocket) => void): void;
}

class TestemEmitter implements Emitter {
  socket: TestemSocket;

  constructor(socket: TestemSocket) {
    this.socket = socket;
  }

  emit(name: 'suite-start' | 'suite-finish', data: SuiteReport): void;
  emit(name: 'test-start' | 'test-finish', data: CompatTestReport): void;
  emit(name: 'suite-start' | 'suite-finish' | 'test-start' | 'test-finish', data: SuiteReport | CompatTestReport) {
    assert(
      `Expected event.name to be one of 'suite-start', 'suite-finish', 'test-start' or 'test-finish'`,
      ['suite-start', 'suite-finish', 'test-start', 'test-finish'].includes(name)
    );
    assert(`Expected event.data to be defined`, typeof data !== 'undefined');

    if (name === 'suite-start') {
      this.socket.emit('tests-start');
    } else if (name === 'suite-finish') {
      this.socket.emit('all-test-results');
    } else if (name === 'test-start') {
      this.socket.emit('tests-start', data as CompatTestReport);
    } else if (name === 'test-finish') {
      this.socket.emit('test-result', data as CompatTestReport);
    }
  }
}

export function createTestemEmitter(): Promise<Emitter> {
  return new Promise((resolve, reject) => {
    // @ts-expect-error
    const _Testem: TestemGlobal = window.Testem as TestemGlobal;
    const hasTestem = typeof _Testem !== 'undefined';

    if (!hasTestem) {
      return reject(new Error('Testem is not present on the page.'));
    }

    _Testem.useCustomAdapter((socket: TestemSocket) => {
      const emitter = new TestemEmitter(socket);
      resolve(emitter);
    });
  });
}
