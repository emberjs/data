---
url: /pr-preview/pr-11087/api/@warp-drive/utilities/types/UrlOptions.md
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

Defined in: [index.ts:426](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/utilities/src/index.ts#L426)

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
