/* global Testem */

import { Emitter, CompatTestReport } from "../-types";
import { assert } from "../-utils";

type TestemSocket = {
  emit(name: 'tests-start'): void; // suite-start
  emit(name: 'all-test-results'): void; // suite-finish
  emit(name: 'tests-start', data: CompatTestReport): void; // test-start
  emit(name: 'test-result', data: CompatTestReport): void; // test-finish
}

class TestemEmitter implements Emitter {
  socket: TestemSocket;

  constructor(socket: TestemSocket) {
    this.socket = socket;
  }

  emit(name: 'suite-start'): void;
  emit(name: 'suite-finish'): void;
  emit(name: 'test-start', data: CompatTestReport): void;
  emit(name: 'test-finish', data: CompatTestReport): void;
  emit(name: 'suite-start' | 'suite-finish' | 'test-start' | 'test-finish', data?: CompatTestReport) {
    if (name === 'suite-start') {
      assert(`Cannot emit suite-start with data`, typeof data === 'undefined');
      this.socket.emit('tests-start');
    } else if (name === 'suite-finish') {
      assert(`Cannot emit suite-finish with data`, typeof data === 'undefined');
      this.socket.emit('all-test-results');
    } else if (name === 'test-start') {
      assert(`Cannot emit test-start without data`, typeof data !== 'undefined')
      this.socket.emit('tests-start', data!);
    } else if (name === 'test-finish') {
      assert(`Cannot emit test-finish without data`, typeof data !== 'undefined')
      this.socket.emit('test-result', data!);
    }
  }
}

export function createTestemEmitter(): Promise<Emitter> {
  return new Promise((resolve, reject) => {
    // @ts-expect-error
    const _Testem = window.Testem;
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
