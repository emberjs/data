import type { CompatTestReport, Emitter } from '../-types';
import type { SuiteReport } from '../-types/report';
import { assert } from '../-utils';

type EmitEvent = {
  name: 'suite-start' | 'suite-finish' | 'test-start' | 'test-finish';
  data: SuiteReport | CompatTestReport;
};

class DiagnosticEmitter implements Emitter {
  socket: WebSocket;
  connected: boolean;
  buffer: EmitEvent[] = [];
  browserId: string;
  windowId: string;

  constructor() {
    // A test url might look like
    // http://localhost:7537/1984/1/tests/index.html?hidepassed&filter=foo
    // where 1984 is the browserId and 1 is the windowId
    const params = new URLSearchParams(window.location.search);
    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const browserId = params.get('b')!;
    const windowId = params.get('w')!;
    const url = `${protocol}${host}/ws`;
    this.browserId = browserId;
    this.windowId = windowId;
    this.connected = false;
    this.buffer = [];

    if (!browserId || !windowId) {
      console.warn(
        `[Diagnostic] Expected to find a browserId and windowId in the url. Likely this page was not served by the diagnostic server. Remote reporting will not be available.`
      );
      this.socket = null as unknown as WebSocket;
      return;
    }

    console.log(`[Diagnostic] Attempting to connect to remote reporter at ${url}`);
    try {
      const socket = new WebSocket(url);
      socket.onopen = (_event) => {
        console.log(`[Diagnostic] Remote Reporter Connection established`);
        this.connected = true;
        this.buffer.forEach((event) => {
          this.emit(event.name as 'suite-start', event.data as SuiteReport);
        });
        this.buffer = [];
      };

      socket.onclose = (event) => {
        this.connected = false;
        if (event.wasClean) {
          console.log(
            `[Diagnostic] Remote Reporter Connection closed cleanly, code=${event.code} reason=${event.reason}`
          );
        } else {
          console.error(`[Diagnostic] Remote Reporter Connection Died`, event);
        }
      };
      socket.onerror = (e) => {
        this.connected = false;
        console.error(e);
        throw new Error(`[Diagnostic] Remote Reporter Connection Failed`);
      };
      socket.onmessage = (message: MessageEvent<string>) => {
        const msg = JSON.parse(message.data) as { name: 'close' | 'reload' };
        if (msg.name === 'close') {
          window.close();
        } else if (msg.name === 'reload') {
          window.location.reload();
        } else {
          throw new Error(`[Diagnostic] Unexpected message from server`);
        }
      };

      this.socket = socket;
    } catch (e) {
      console.error(`[Diagnostic] Unexpected error trying to connect`, e);
      this.socket = null as unknown as WebSocket;
    }
  }

  emit(name: 'suite-start' | 'suite-finish', data: SuiteReport): void;
  emit(name: 'test-start' | 'test-finish', data: CompatTestReport): void;
  emit(name: 'suite-start' | 'suite-finish' | 'test-start' | 'test-finish', data: SuiteReport | CompatTestReport) {
    if (!this.socket) {
      return;
    }
    if (!this.connected) {
      this.buffer.push({ name, data });
      return;
    }

    assert(
      `Expected event.name to be one of 'suite-start', 'suite-finish', 'test-start' or 'test-finish'`,
      ['suite-start', 'suite-finish', 'test-start', 'test-finish'].includes(name)
    );
    assert(`Expected event.data to be defined`, typeof data !== 'undefined');
    const event = { browserId: this.browserId, windowId: this.windowId, name, data, timestamp: Date.now() };

    this.socket.send(JSON.stringify(event));
  }
}

// function getRelativeTimeStamp(timestamp: number) {
//   const now = Date.now();
//   const perfNow = performance.now();

//   const diff = perfNow - timestamp;
//   return now - diff;
// }

export function createDiagnosticEmitter(): Promise<Emitter> {
  return Promise.resolve(new DiagnosticEmitter());
}
