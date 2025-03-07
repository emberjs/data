const fs = require('fs');
const zlib = require('zlib');

console.log(`\n\nRegenerating Fixtures For Performance Benchmarks`);
const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    // brotli currently defaults to 11 but lets be explicit
    [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
  },
};
function compress(code) {
  return zlib.brotliCompressSync(code, BROTLI_OPTIONS);
}

function write(name, json) {
  console.log(
    `\tGenerated fixtures for ${name}: ${Array.isArray(json.data) ? json.data.length : 1} primary, ${
      json.included?.length ?? 0
    } included\n`
  );
  fs.writeFileSync(`./fixtures/generated/${name}.json.br`, compress(JSON.stringify(json)));
}

const createParentPayload = require('./create-parent-payload');
const { createCarsPayload, deleteHalfTheColors } = require('./create-cars-payload.ts');
const createParentRecords = require('./create-parent-records');
const { createComplexPayload: createComplexRecordsPayload } = require('./create-complex-payload.ts');

async function main() {
  // const initialChildrenPayload = createParentPayload(19600);
  // write('add-children-initial', initialChildrenPayload);
  // write('add-children-final', createParentPayload(20000));
  // const payloadWithRemoval = structuredClone(initialChildrenPayload);
  // payloadWithRemoval.data.relationships.children.data.splice(0, 19000);
  // payloadWithRemoval.included.splice(0, 19000);
  // write('add-children-with-removal', payloadWithRemoval);

  // write('destroy', createParentPayload(500, 50));
  // write('relationship-materialization-simple', createCarsPayload(10000));
  // write('relationship-materialization-complex', createParentRecords(200, 10, 20));
  // write('unload', createParentPayload(500, 50));
  // write('unload-all', createParentRecords(1000, 5, 10));
  // write('unused-relationships', createParentPayload(500, 50));
  // write('example-car', createCarsPayload(1));
  // write('example-parent', createParentPayload(2, 2));
  // write('basic-record-materialization', createParentRecords(10000, 2, 3));
  // write('complex-record-materialization', await createComplexRecordsPayload(400));

  const initialBigM2M = createCarsPayload(100, 100);
  write('big-many-to-many', initialBigM2M);
  write('big-many-to-many-with-removal', deleteHalfTheColors(initialBigM2M));
}
main();
