| | |
| -- | -- |
| [← Making Requests](./2-requests.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Caching →](./4-caching.md) |

## Data

In every application data can take on many different representations:

- the API format (what your backend understands)
- the wire format (what your backend sends you)
- the cache format (what your frontend deserializes the wire format into)
- the presentation format (what your frontend transforms the cache format into for utility)

As much as possible, WarpDrive encourages aligning *at-least* the first three of these four
formats. Aligning formats reduces the mental complexity required to understand the flow of
data through your application, making it easier to debug, and reduces the computation necessary
at each layer, making your application faster.

Misalignment tends to occur when API and Application developers don't work together to understand
requirements, or when the format in use is "lossy" (unable to accurately convey the full scope of
information being serialized).

We encourage the use of [JSON:API](https://jsonapi.org/) as the wire and cache format because unlike
most other formats in use today it encodes information about your data in a near-lossless and easily-cacheable manner.

For the presentation format, we encourage applications to limit the amount of manual transformation
done. Applications should wherever possible align the interfaces of the data components expect to
the shape of the data available, rather than transforming data to fit into the component. This said,
WarpDrive offers powerful schema-defined transformation and derivation capabilities built-in to the
reactivity layer for presenting data from the cache. Handling transformation universally via schema
enables apps to align to component interfaces where needed in a safer, more performant manner.

We'll explore these capabilities later on in the manual in the sections on [Presentation](./5-presentation.md) and [Schemas](./6-schemas.md). But first, lets take some time to look at some key
concepts surrounding the wire and cache format.


### StructuredDocuments

### ResourceDocuments

### Resources

### CacheKeys

### Membership

### Fields

<br>

| | |
| -- | -- |
| [← Making Requests](./2-requests.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Caching →](./4-caching.md) |
