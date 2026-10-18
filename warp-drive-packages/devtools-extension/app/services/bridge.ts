import { action } from '@ember/object';
import type Owner from '@ember/owner';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

import {
  DEVTOOLS_MESSAGE_SOURCE,
  DEVTOOLS_PROTOCOL_VERSION,
  type DevtoolsExtensionMessage,
  type DevtoolsPageMessage,
  type DevtoolsRequestEvent,
  type DevtoolsStoreInfo,
} from '@warp-drive/core/devtools-hook';

const RECONNECT_DELAY_MS = 1000;
const MAX_REQUESTS = 500;

export type BridgeConnection = 'unavailable' | 'connecting' | 'connected';

function isPageMessage(value: unknown): value is DevtoolsPageMessage {
  const message = value as Partial<DevtoolsPageMessage> | null;
  return Boolean(message) && message?.source === DEVTOOLS_MESSAGE_SOURCE && message.from === 'page';
}

/**
 * The panel's link to the inspected page: it holds the runtime Port to the
 * background worker, keeps it connected across page reloads, and exposes what
 * the page's DevTools hook reports as tracked state.
 */
export default class BridgeService extends Service {
  @tracked connection: BridgeConnection = 'connecting';
  @tracked pageProtocolVersion: number | null = null;
  @tracked stores: DevtoolsStoreInfo[] = [];
  @tracked requests: DevtoolsRequestEvent[] = [];
  @tracked selectedStoreId: string | null = null;
  @tracked selectedRequestId: number | null = null;

  private port: ChromePort | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(owner: Owner) {
    super(owner);
    this.connect();
  }

  get protocolMismatch(): boolean {
    return this.pageProtocolVersion !== null && this.pageProtocolVersion !== DEVTOOLS_PROTOCOL_VERSION;
  }

  /** Requests for the selected store, newest first. Requests not tied to a store are shown for every store. */
  get visibleRequests(): DevtoolsRequestEvent[] {
    const storeId = this.selectedStoreId;
    return this.requests.filter((request) => request.storeId === null || request.storeId === storeId).reverse();
  }

  get selectedRequest(): DevtoolsRequestEvent | null {
    const visible = this.visibleRequests;
    return visible.find((request) => request.id === this.selectedRequestId) ?? visible[0] ?? null;
  }

  @action
  selectStore(storeId: string): void {
    this.selectedStoreId = storeId;
    this.selectedRequestId = null;
  }

  @action
  selectRequest(requestId: number): void {
    this.selectedRequestId = requestId;
  }

  private connect(): void {
    if (typeof chrome === 'undefined' || !chrome.devtools?.inspectedWindow) {
      this.connection = 'unavailable';
      return;
    }

    const port = chrome.runtime.connect({ name: `panel:${String(chrome.devtools.inspectedWindow.tabId)}` });
    this.port = port;

    port.onMessage.addListener((message) => {
      this.receive(message);
    });
    port.onDisconnect.addListener(() => {
      // Read lastError so Chrome does not log "unchecked runtime.lastError".
      void chrome?.runtime.lastError;
      this.port = null;
      this.reset();
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, RECONNECT_DELAY_MS);
    });

    const hello: DevtoolsExtensionMessage = {
      source: DEVTOOLS_MESSAGE_SOURCE,
      from: 'extension',
      type: 'hello-request',
    };
    port.postMessage(hello);
  }

  private reset(): void {
    this.connection = 'connecting';
    this.pageProtocolVersion = null;
    this.stores = [];
    this.requests = [];
    this.selectedStoreId = null;
    this.selectedRequestId = null;
  }

  private receive(value: unknown): void {
    if (!isPageMessage(value)) {
      return;
    }

    switch (value.type) {
      case 'hello':
        this.connection = 'connected';
        this.pageProtocolVersion = value.protocolVersion;
        this.stores = value.stores;
        this.requests = value.requests;
        if (!this.stores.some((store) => store.storeId === this.selectedStoreId)) {
          this.selectedStoreId = this.stores[0]?.storeId ?? null;
        }
        break;
      case 'store:added':
        if (!this.stores.some((store) => store.storeId === value.store.storeId)) {
          this.stores = [...this.stores, value.store];
        }
        this.selectedStoreId ??= value.store.storeId;
        break;
      case 'store:removed':
        this.stores = this.stores.filter((store) => store.storeId !== value.storeId);
        if (this.selectedStoreId === value.storeId) {
          this.selectedStoreId = this.stores[0]?.storeId ?? null;
        }
        break;
      case 'request': {
        const next = this.requests.filter((request) => request.id !== value.request.id);
        next.push(value.request);
        this.requests = next.length > MAX_REQUESTS ? next.slice(next.length - MAX_REQUESTS) : next;
        break;
      }
      case 'ready':
        // Handled by the content script, which re-requests the hello.
        break;
    }
  }

  override willDestroy(): void {
    super.willDestroy();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.port?.disconnect();
  }
}
