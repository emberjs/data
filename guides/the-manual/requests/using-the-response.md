---
order: 2
---

# Using The Response

[Requests](/api/@warp-drive/core/classes/Store#request) return a subclass of [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) we call a [Future](/api/@warp-drive/core/request/interfaces/Future).

### Special Powers

Futures expose a number of crucial features for working with requests.

- [lid](/api/@warp-drive/core/request/interfaces/Future#lid) which gives access to the identity of the request
- [getStream()](/api/@warp-drive/core/request/interfaces/Future#getstream) which will resolve to the response stream once it is available
- [abort()](/api/@warp-drive/core/request/interfaces/Future#abort) which will attempt to abort the request.

### Return Values

Futures both resolve and reject with an object ([{ request, response, content }](/api/@warp-drive/core/types/request/type-aliases/StructuredDocument)) representing the original
[RequestInfo](/api/@warp-drive/core/types/request/interfaces/RequestInfo), the [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) set by the handler chain (if any), and the processed content.

### Errors

If the `Future` rejects, it throws either an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
an [AggregateError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError) or a [DOMException](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) that maintains
the `{ request, response, content }` shape but is also an Error instance
itself.

If using the error originates from the [Fetch Handler](/api/@warp-drive/core/variables/Fetch)
the error will be a [FetchError](/api/@warp-drive/core/types/request/interfaces/FetchError)

## Consuming The Response

On their own, `Futures` may appear to have an overly verbose return shape and the value of the features they enhance promises with may not be immediately clear. But this is because in the
general case it is expected that you **won't** resolve the future yourself with `await`, but instead will pass it around your app as a value.

Maintaining access to the `Future's` reference allows you to use it with declarative reactive paradigms using utilities such as `getRequestState` or components like `<Request />`.

We call this `Reactive Control Flow`, you may want to [watch the talk where we introduced this feature](https://youtu.be/HQiKFaTAahM?si=Ng8lCpSQkwrHzGd5&t=312).

