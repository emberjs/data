---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/build-config/deprecations/variables/DEPRECATE_NON_UNIQUE_PAYLOADS.md
description: >-
  Deprecation flag for hasMany relationship payloads containing duplicate
  identifiers, which were silently de-duped and will instead error.
---

# &#x20;DEPRECATE\_NON\_UNIQUE\_PAYLOADS&#x20;

```ts
const DEPRECATE_NON_UNIQUE_PAYLOADS: boolean;
```

Defined in: [warp-drive-packages/build-config/src/deprecations.ts:257](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/build-config/src/deprecations.ts#L257)

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
