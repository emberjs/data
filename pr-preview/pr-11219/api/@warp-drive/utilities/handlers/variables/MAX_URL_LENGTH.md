---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/utilities/handlers/variables/MAX_URL_LENGTH.md
description: >-
  The 8192-byte URL length limit, taken from AWS CloudFront, that
  `assertInvalidUrlLength` checks against.
---

# &#x20;MAX\_URL\_LENGTH

```ts
const MAX_URL_LENGTH: 8192 = 8192;
```

Defined in: [-private/handlers/utils.ts:74](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/utilities/src/-private/handlers/utils.ts#L74)

Source: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
As of 2024-12-05 the maximum URL length is 8192 bytes.
