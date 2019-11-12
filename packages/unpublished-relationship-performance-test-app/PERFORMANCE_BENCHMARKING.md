# Performance Benchmarking

```
npm install -g tracerbench@2.3.0 pm2
```

Next, run the following from the root of this repository:

```
./bin/relationship-performance-tracking/head-vs-master.sh
```

Note: This uses a HAR file (`bin/relationship-performance-tracking/src/trace.har`) that was manually downloaded. Ideally this will be created on the fly, but I had some trouble getting TracerBench to create it with all the necessary information for HAR Remix to serve it.

To create the HAR file:

```
cd packages/unpublished-relationship-performance-test-app/
ember build -prod
cd dist
php -S localhost:5000 # or any other web server
```

Visit http://localhost:5000, open the Network panel in Chrome Dev Tools, right click on "localhost", then select "Save all as HAR with content".
