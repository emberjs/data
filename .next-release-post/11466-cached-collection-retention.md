---
releases: ["5.10", "5.9"]
---
Cached query collections retain their last successful membership when a refresh fails or only updates metadata. Errors remain visible on the request document, and successful responses—including empty results—still replace membership. No application changes are needed.
