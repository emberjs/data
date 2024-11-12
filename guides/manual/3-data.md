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
information being serialized)

<br>

| | |
| -- | -- |
| [← Making Requests](./2-requests.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Caching →](./4-caching.md) |
