import { CompatTestReport, Emitter } from "../-types";
import { assert } from "../-utils";

type EmitEvent = {
  name: 'suite-start' | 'suite-finish' | 'test-start' | 'test-finish';
  data?: CompatTestReport
}

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
      console.warn(`[Diagnostic] Expected to find a browserId and windowId in the url. Likely this page was not served by the diagnostic server. Remote reporting will not be available.`);
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
          if (event.data) {
            assert(`Expected event.name to be one of 'test-start' or 'test-finish'`, (['test-start', 'test-finish']).includes(event.name ));
            this.emit(event.name as 'test-start', event.data);
          } else {
            assert(`Expected event.name to be one of 'suite-start' or 'suite-finish'`, (['suite-start', 'suite-finish']).includes(event.name ));
            this.emit(event.name as 'suite-finish');
          }
        });
        this.buffer = [];
      };

      socket.onclose = (event) => {
        this.connected = false;
        if (event.wasClean) {
          console.log(`[Diagnostic] Remote Reporter Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
          console.error(`[Diagnostic] Remote Reporter Connection Died`, event);
        }
      };
      socket.onerror = (e) => {
        this.connected = false;
        console.error(e);
        throw new Error(`[Diagnostic] Remote Reporter Connection Failed`);
      };
      socket.onmessage = (message) => {
        const msg = JSON.parse(message.data);
        if (msg.name === 'close') {
          window.close();
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

  emit(name: 'suite-start'): void;
  emit(name: 'suite-finish'): void;
  emit(name: 'test-start', data: CompatTestReport): void;
  emit(name: 'test-finish', data: CompatTestReport): void;
  emit(name: 'suite-start' | 'suite-finish' | 'test-start' | 'test-finish', data?: CompatTestReport) {
    if (!this.socket) {
      return;
    }
    if (!this.connected) {
      this.buffer.push({ name, data });
      return;
    }

    assert(`Cannot emit suite-start with data`, name !== 'suite-start' || typeof data === 'undefined');
    assert(`Cannot emit suite-finish with data`, name !== 'suite-finish' || typeof data === 'undefined');
    assert(`Cannot emit test-start without data`, name !== 'test-start' || typeof data !== 'undefined');
    assert(`Cannot emit test-finish without data`, name !== 'test-finish' || typeof data !== 'undefined');
    this.socket.send(JSON.stringify({ browserId: this.browserId, windowId: this.windowId, name, data }));
  }
}

export function createDiagnosticEmitter(): Promise<Emitter> {
  return Promise.resolve(new DiagnosticEmitter());
}
