---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_NON_UNIQUE_PAYLOADS.md
---

# &#x20;DEPRECATE\_NON\_UNIQUE\_PAYLOADS&#x20;

```ts
const DEPRECATE_NON_UNIQUE_PAYLOADS: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/deprecations.d.ts:240](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/deprecations.d.ts#L240)

Deprecates when the data for a hasMany relationship contains
duplicate identifiers.

Previously, relationships would silently de-dupe the data
when received, but this behavior is being removed in favor
of erroring if the same related record is included multiple
times.

For instance, in JSON:API the below relationship data would
be considered invalid:

```json
{
 "data": {
  "type": "article",
   "id": "1",
   "relationships": {
     "comments": {
       "data": [
         { "type": "comment", "id": "1" },
         { "type": "comment", "id": "2" },
         { "type": "comment", "id": "1" } // duplicate
       ]
    }
 }
}
```

To resolve this deprecation, either update your server to
not include duplicate data, or implement normalization logic
in either a request handler or serializer which removes
duplicate data from relationship payloads.

## Until

6.0
