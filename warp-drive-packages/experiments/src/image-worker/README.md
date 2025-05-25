<p align="center">
  <img
    class="project-logo"
    src="./logos/NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./logos/NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">ImageWorker</h3>

- Caches Images for Reuse
- Supports Preloading
- Shares image-memory cross-tab

## Install

```cli
pnpm add @warp-drive/experiments
```

Or use your favorite javascript package manager.

## How It Works

- The main thread requests the worker to either load or preload an image
- the worker downloads the image if needed via `fetch`, putting the response into the browser's http cache
- the worker generates a blob containing the image bytes
- the worker returns an object url for the blob
