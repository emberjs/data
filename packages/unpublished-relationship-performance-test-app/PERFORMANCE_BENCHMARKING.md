# Performance Benchmarking

```
npm install -g tracerbench@2.3.0 pm2
```

Next, run the following from the root of this repository:

```sh
./bin/relationship-performance-tracking/head-vs-master.sh
```

Note: This uses a HAR file (`bin/relationship-performance-tracking/src/trace.har`) that was manually downloaded. Ideally this will be created on the fly, but I had some trouble getting TracerBench to create it with all the necessary information for HAR Remix to serve it.

## manually create HAR capture

- `cd packages/unpublished-relationship-performance-test-app/ && ember serve -prod --live-reload false --port 5000`
   - *Note* some shells may error on the `&&` operator. If so execute each command separately:
     ```sh
      $ cd packages/unpublished-relationship-performance-test-app/
      $ ember serve -prod --live-reload false --port 5000
     ```
- Visit [http://localhost:5000](http://localhost:5000)
- open the Network panel in Chrome Dev Tools
- right click on any of loaded network assets such as vendor.css
- select "Save all as HAR with content"

## adding extra tests

- create a new route
- in the `model` hook add markers where appropriate `performance.mark`
- you can add `performance.measure` calls to visualize some markers in chrome performance view
- in the `afterModel` hook call `endTrace` to stop tracing
- modify `../../bin/relationship-performance-tracking/src/tracerbench.js ` to include the new route and its markers
  