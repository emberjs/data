import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';

import { DEVTOOLS_PROTOCOL_VERSION, type DevtoolsRequestEvent } from '@warp-drive/core/devtools-hook';

import type BridgeService from '../services/bridge.ts';

interface Banner {
  kind: 'info' | 'error';
  text: string;
}

const eq = (a: unknown, b: unknown): boolean => a === b;

const requestTitle = (request: DevtoolsRequestEvent): string =>
  request.url ?? request.op ?? `request #${String(request.id)}`;

const requestMeta = (request: DevtoolsRequestEvent): string => {
  const source = request.fromCache ? 'cache' : 'network';
  return request.durationMs === null ? source : `${source} · ${String(request.durationMs)}ms`;
};

function detailRows(request: DevtoolsRequestEvent): { label: string; value: string }[] {
  return [
    { label: 'Method', value: request.method ?? '—' },
    { label: 'URL', value: request.url ?? '—' },
    { label: 'Operation', value: request.op ?? '—' },
    { label: 'Status', value: request.status },
    { label: 'Served from', value: request.fromCache ? 'cache' : 'network' },
    { label: 'Started', value: new Date(request.startedAt).toISOString() },
    { label: 'Duration', value: request.durationMs === null ? '—' : `${String(request.durationMs)}ms` },
    { label: 'Response status', value: request.responseStatus === null ? '—' : String(request.responseStatus) },
    { label: 'Cache key', value: request.cacheKey ?? '—' },
    { label: 'Error', value: request.error ?? '—' },
  ];
}

export default class PanelShell extends Component {
  @service declare bridge: BridgeService;

  get banner(): Banner | null {
    const bridge = this.bridge;
    if (bridge.connection === 'unavailable') {
      return { kind: 'error', text: 'This panel only works inside the browser DevTools.' };
    }
    if (bridge.connection === 'connecting') {
      return {
        kind: 'info',
        text: 'Waiting for a WarpDrive page. Open a page that uses WarpDrive in a development build.',
      };
    }
    if (bridge.protocolMismatch) {
      return {
        kind: 'error',
        text: `The page speaks DevTools protocol v${String(bridge.pageProtocolVersion)} but this panel speaks v${String(DEVTOOLS_PROTOCOL_VERSION)}. Update WarpDrive or the extension.`,
      };
    }
    if (bridge.stores.length === 0) {
      return { kind: 'info', text: 'WarpDrive is on the page, but no Store has been created yet.' };
    }
    return null;
  }

  get rows(): { label: string; value: string }[] {
    const request = this.bridge.selectedRequest;
    return request ? detailRows(request) : [];
  }

  <template>
    <div class="app">
      <header class="top">
        <span class="brand">WARPDRIVE</span>
        <nav class="stores" aria-label="Stores">
          {{#each this.bridge.stores key="storeId" as |store|}}
            <button
              type="button"
              class={{if (eq store.storeId this.bridge.selectedStoreId) "active"}}
              {{on "click" (fn this.bridge.selectStore store.storeId)}}
            >{{store.name}}</button>
          {{/each}}
        </nav>
      </header>

      {{#if this.banner}}
        <p class="banner {{this.banner.kind}}">{{this.banner.text}}</p>
      {{else}}
        <div class="layout">
          <aside class="sidebar" aria-label="Requests">
            {{#each this.bridge.visibleRequests key="id" as |request|}}
              <button
                type="button"
                class="row {{if (eq request.id this.bridge.selectedRequest.id) 'selected'}}"
                {{on "click" (fn this.bridge.selectRequest request.id)}}
              >
                <span class="row-main">
                  <span class="row-title">{{request.method}} {{requestTitle request}}</span>
                  <span class="muted">{{requestMeta request}}</span>
                </span>
                <span class="badge {{request.status}}">{{request.status}}</span>
              </button>
            {{else}}
              <p class="empty">No requests yet. Interact with the page.</p>
            {{/each}}
          </aside>

          <main class="main">
            {{#if this.bridge.selectedRequest}}
              <dl class="details">
                {{#each this.rows key="label" as |row|}}
                  <dt>{{row.label}}</dt>
                  <dd>{{row.value}}</dd>
                {{/each}}
              </dl>
            {{else}}
              <p class="empty">Select a request to see its details.</p>
            {{/if}}
          </main>
        </div>
      {{/if}}
    </div>
  </template>
}
