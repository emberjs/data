---
releases: ["5.10", "5.9"]
---
Failed or cancelled retries, reloads and refreshes no longer produce extra unhandled promise
rejections from `<Request>`. Recovery functions resolve after the request settles; failures
remain observable through request state and the request Future. Failed refreshes retain current
content, and recovery attempted while offline or hidden still rejects.
