# About

We believe in robust fast test suites. WarpDrive provides the patterns for how you consume and manage state in your app, and as a data-framework that extends to ensuring those patterns are rigourously testable.

By providing a mocking library with tight integration with WarpDrive's concepts we make it easier and more accurate than ever to mock data and requests, while keeping your test suite blazing fast.

Using Holodeck you will find you write and maintain better tests faster than ever.

### ✨ Amazing Developer Experience

WarpDrive already understands your data schemas and request patterns. Building a mocking utility with tight integration into your data usage patterns could bring enormous DX and test suite performance benefits.

Building a real mock server instead of intercepting requests in the browser or via ServiceWorker gives us out-of-the-box DX, better tunability, and greater ability to optimize test suite performance. Speed is the ultimate DX.

### 🔥 Blazing Fast Tests

We've noticed test suites spending an enormous amount of time creating and tearing down mock state in between tests. To combat this, we want to provide
an approach built over `http/3` (`http/2` for now) utilizing aggressive caching
and `brotli` minification in a way that can be replayed over and over again.

Basically, pay the cost when you write the test. Forever after skip the cost until you need to edit the test again.
