---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/utilities/types/UrlOptions.md
description: >-
  Any of the option shapes `buildBaseURL` accepts, one per request `op` plus a
  generic `resourcePath` form.
---

# &#x20;UrlOptions

```ts
type UrlOptions = 
  | FindRecordUrlOptions
  | QueryUrlOptions
  | FindManyUrlOptions
  | FindRelatedCollectionUrlOptions
  | FindRelatedResourceUrlOptions
  | CreateRecordUrlOptions
  | UpdateRecordUrlOptions
  | DeleteRecordUrlOptions
  | GenericUrlOptions;
```

Defined in: [index.ts:446](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/utilities/src/index.ts#L446)

The union of all `op`-specific option shapes accepted by [buildBaseURL](../functions/buildBaseURL.md), one of:

* [FindRecordUrlOptions](FindRecordUrlOptions.md)
* [QueryUrlOptions](QueryUrlOptions.md)
* [FindManyUrlOptions](FindManyUrlOptions.md)
* [FindRelatedCollectionUrlOptions](FindRelatedCollectionUrlOptions.md)
* [FindRelatedResourceUrlOptions](FindRelatedResourceUrlOptions.md)
* [CreateRecordUrlOptions](CreateRecordUrlOptions.md)
* [UpdateRecordUrlOptions](UpdateRecordUrlOptions.md)
* [DeleteRecordUrlOptions](DeleteRecordUrlOptions.md)
* [GenericUrlOptions](GenericUrlOptions.md)
