---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/experiments/image-worker/classes/ImageWorker.md
---

&#x20;

# &#x20;ImageWorker

Defined in: [warp-drive-packages/experiments/src/image-worker/worker.ts:32](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/experiments/src/image-worker/worker.ts#L32)

Runs inside a `Worker` or `SharedWorker` to fetch images on behalf of
one or more [ImageFetch](../../image-fetch/classes/ImageFetch.md) instances running on the main thread(s)
that connect to it.

Each connecting thread registers itself by sending a `connect` message
along with a [MessagePort](https://developer.mozilla.org/docs/Web/API/MessagePort). When a thread sends a `load` request
for a url, the worker fetches the image via `fetch`, converts the
response into a `Blob`, and creates an object url for it via
`URL.createObjectURL`. The fetch for a given url is deduped and cached
in-memory for the lifetime of the worker, so repeat `load` requests for
the same url — whether from the same or a different connected thread —
do not trigger another network request.

Only intended for use inside a Worker context: constructing an
`ImageWorker` on the main thread is a no-op.

## Constructors

### Constructor

```ts
new ImageWorker(options?: {
  persisted: boolean;
}): ImageWorker;
```

Defined in: [warp-drive-packages/experiments/src/image-worker/worker.ts:42](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/experiments/src/image-worker/worker.ts#L42)

#### Parameters

##### options?

###### persisted

`boolean`

reserved for a future on-disk cache; currently unused.

#### Returns

`ImageWorker`
