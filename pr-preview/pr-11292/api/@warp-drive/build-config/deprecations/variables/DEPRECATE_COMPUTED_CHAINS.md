---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/build-config/deprecations/variables/DEPRECATE_COMPUTED_CHAINS.md
---

# &#x20;DEPRECATE\_COMPUTED\_CHAINS&#x20;

```ts
const DEPRECATE_COMPUTED_CHAINS: boolean = true;
```

Defined in: [deprecations.ts:129](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/build-config/src/deprecations.ts#L129)

This is a planned deprecation which will trigger when observer or computed
chains are used to watch for changes on any WarpDrive LiveArray, CollectionRecordArray,
ManyArray or PromiseManyArray.

Support for these chains is currently guarded by the deprecation flag
listed here, enabling removal of the behavior if desired.

The instrumentation was added in 5.0 but the version number
is set to 7.0 as we do not want to strip support without
adding a deprecation message.

Once we've added the deprecation message, we will
update this version number to the proper version.

## Until

8.0
