# @warp-drive/devtools-extension

The WarpDrive browser DevTools extension. The panel is an Ember app built with
Vite; the pieces that must be plain scripts (service worker, content script,
devtools page) live in `public/`.

Private, and loaded unpacked for now.

## How it fits together

```
page: @warp-drive/core/devtools-hook
   │  window.postMessage
content script (public/content-script.js)
   │  runtime Port
background service worker (public/background.js)
   │  runtime Port
panel: Ember app (app/)
```

`Store`s register themselves with the hook in `DEBUG` builds, so a page needs no
setup. See `@warp-drive/core/devtools-hook` for the message protocol.

## Build and load

```sh
pnpm --filter @warp-drive/devtools-extension build:pkg
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**
and select `warp-drive-packages/devtools-extension/dist`. Reload the page you want
to inspect, then open DevTools and choose the **WarpDrive** panel.
