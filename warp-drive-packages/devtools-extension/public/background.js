// MV3 service worker. A DevTools panel cannot talk to the inspected page's
// content script directly, so this worker pairs each panel connection with a
// connection to the content script in the panel's tab and forwards messages
// between them.
//
// Panel -> `chrome.runtime.connect({ name: 'panel:<tabId>' })` -> here
// here  -> `chrome.tabs.connect(tabId, { name: 'warp-drive-devtools' })` -> content script

const PANEL_PREFIX = 'panel:';
const CONTENT_PORT_NAME = 'warp-drive-devtools';

chrome.runtime.onConnect.addListener((panelPort) => {
  if (!panelPort.name.startsWith(PANEL_PREFIX)) {
    return;
  }
  const tabId = Number(panelPort.name.slice(PANEL_PREFIX.length));
  if (!Number.isInteger(tabId)) {
    return;
  }

  // If the tab has no content script yet (for example mid-navigation) this port
  // disconnects immediately, which closes the panel's port so it can retry.
  const tabPort = chrome.tabs.connect(tabId, { name: CONTENT_PORT_NAME });

  panelPort.onMessage.addListener((message) => {
    tabPort.postMessage(message);
  });
  tabPort.onMessage.addListener((message) => {
    panelPort.postMessage(message);
  });

  panelPort.onDisconnect.addListener(() => {
    tabPort.disconnect();
  });
  tabPort.onDisconnect.addListener(() => {
    // Read lastError so Chrome does not log "unchecked runtime.lastError".
    void chrome.runtime.lastError;
    panelPort.disconnect();
  });
});
