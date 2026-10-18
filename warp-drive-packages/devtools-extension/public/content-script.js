// Runs in every page at document_start, in the extension's isolated world.
// It relays messages between the page (window.postMessage, spoken by the hook in
// `@warp-drive/core/devtools-hook`) and the extension (a runtime Port). It has no
// WarpDrive-specific logic and forwards only the one message type the panel may send.

// Keep in sync with DEVTOOLS_MESSAGE_SOURCE in @warp-drive/core/devtools-hook.
const SOURCE = 'warp-drive-devtools';
const CONTENT_PORT_NAME = 'warp-drive-devtools';
const ALLOWED_PANEL_MESSAGE_TYPES = ['hello-request'];

let panelPort = null;

function postToPage(type) {
  const origin = window.location.origin;
  window.postMessage({ source: SOURCE, from: 'extension', type }, origin === 'null' ? '*' : origin);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CONTENT_PORT_NAME) {
    return;
  }
  panelPort = port;

  port.onMessage.addListener((message) => {
    if (message && message.source === SOURCE && ALLOWED_PANEL_MESSAGE_TYPES.includes(message.type)) {
      postToPage(message.type);
    }
  });
  port.onDisconnect.addListener(() => {
    if (panelPort === port) {
      panelPort = null;
    }
  });

  // A newly attached panel needs the current stores and recorded requests.
  postToPage('hello-request');
});

window.addEventListener('message', (event) => {
  const data = event.data;
  if (event.source !== window || !data || data.source !== SOURCE || data.from !== 'page') {
    return;
  }
  if (!panelPort) {
    return;
  }
  if (data.type === 'ready') {
    // The hook was created after the panel attached (page load); ask it for its state.
    postToPage('hello-request');
    return;
  }
  panelPort.postMessage(data);
});
