---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/utilities/string.md
---

String utilities for transforming and inflecting strings useful for
when the format provided by the server is not the format you want to use
in your application.

Each transformation function stores its results in an LRUCache to avoid
recomputing the same value multiple times. The cache size can be set
using the `setMaxLRUCacheSize` function. The default size is 10,000.

## Variables

* [dasherize](variables/dasherize.md)

## Functions

* [camelize](functions/camelize.md)
* [capitalize](functions/capitalize.md)
* [clear](functions/clear.md)
* [clearRules](functions/clearRules.md)
* [irregular](functions/irregular.md)
* [loadIrregular](functions/loadIrregular.md)
* [loadUncountable](functions/loadUncountable.md)
* [plural](functions/plural.md)
* [pluralize](functions/pluralize.md)
* [resetToDefaults](functions/resetToDefaults.md)
* [setMaxLRUCacheSize](functions/setMaxLRUCacheSize.md)
* [singular](functions/singular.md)
* [singularize](functions/singularize.md)
* [uncountable](functions/uncountable.md)
* [underscore](functions/underscore.md)
