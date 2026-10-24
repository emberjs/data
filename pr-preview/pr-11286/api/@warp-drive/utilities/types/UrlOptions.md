---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/utilities/types/UrlOptions.md
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

Defined in: [index.ts:426](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L426)

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
