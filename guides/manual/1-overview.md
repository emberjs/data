## Overview

WarpDrive is a suite of features built around orchestrated data-fetching.

## Motivations

At its most basic, it is "managed fetch". At its most advanced it is a powerful local-first or offline-first solution that dedupes and reactively updates requests across tabs.

> [!TIP]
> When we want to show integration with a framework, this tutorial
> uses [EmberJS](https://emberjs.com), a powerful modern web framework with an established multi-decade legacy.

Usage across various rendering frameworks will be similar. In fact, this is an explicit goal: WarpDrive enables developers to quickly port and re-use data patterns.

We see this as one of the keys to scalability. Providing a stable framework for how data is requested, cached, mutated, and mocked allows developers to focus more time on the product requirements that matter.

This also means that a single WarpDrive configuration can power multiple web-apps using varying frameworks sharing a single domain: bridging the gap between MPA and SPA.

Data fetching is managed by a `RequestManager`, which executes handlers you provide 

