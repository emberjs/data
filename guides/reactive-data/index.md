# Reactive Data

In addition to request and cache management, WarpDrive provides a reactive access
layer for data in the cache.

Data in the cache is conceptualized as belonging to one of three forms

- **Documents** - the response to a request
- **Resources** - a unique cacheable entity within the response to a request
- **Fields** - the data for an individual property on a resource

Each form of data can be accessed and managed reactively through one of two modes

- *(upcoming, default in v6)* [PolarisMode](./polaris/overview.md)
- *(current, default in v5)* [LegacyMode](./legacy/overview.md)
