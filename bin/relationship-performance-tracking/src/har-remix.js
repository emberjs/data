const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const { default: HARRemix } = require('har-remix');

const { HR_PORT, HR_GROUP } = process.env;

if (!HR_GROUP) {
  throw new Error('You need to set the HR_GROUP environment variable to either "control" or "experiment"');
}

const VENDOR_FILE = path.resolve(
  __dirname,
  `../../../packages/unpublished-relationship-performance-test-app/dist-${HR_GROUP}/assets/vendor.js`
);

const RELATIONSHIP_PERFORMANCE_TEST_APP_FILE = path.resolve(
  __dirname,
  '../../../packages/unpublished-relationship-performance-test-app/dist-experiment/assets/relationship-performance-test-app.js'
);

const harRemix = new HARRemix({
  keyForArchiveEntry(entry) {
    let { request, response } = entry;
    let { status } = response;

    if (status >= 200 && status < 300 && request.method !== 'OPTIONS') {
      const { method, url: requestUrl } = request;
      return `${method} ${new URL(requestUrl).pathname}`;
    }
  },

  keyForServerRequest(request) {
    const { method, url } = request;

    if (url.includes('?')) {
      return `${method} ${url.replace(/\?.+/, '')}`;
    }

    return `${method} ${url}`;
  },

  textFor(entry, key, text) {
    if (key.includes('vendor.js')) {
      return fs.readFileSync(VENDOR_FILE, 'utf8');
    }

    if (key.includes('relationship-performance-test-app.js')) {
      return fs.readFileSync(RELATIONSHIP_PERFORMANCE_TEST_APP_FILE, 'utf8');
    }

    return text;
  },
});

// TODO automate generation of HAR files
// instead of keeping one checked in
harRemix.loadArchive(`${__dirname}/trace.har`);
harRemix.createServer().listen(HR_PORT || 4200);
