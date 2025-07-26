// Test incremental parsing with chunked stream to verify memory efficiency
import {
  serializeDocument,
  reifyDocument,
} from './warp-drive-packages/utilities/src/-private/json-api-streams/serialize.ts';

const sampleDocument = {
  data: {
    type: 'user',
    id: '1',
    attributes: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
  meta: {
    total: 1,
  },
};

async function testIncrementalParsing() {
  console.log('Testing incremental parsing...');

  // Serialize the document
  const serializedChunks = [];
  for (const chunk of serializeDocument(sampleDocument)) {
    serializedChunks.push(chunk);
  }

  const serializedString = serializedChunks.join('');
  console.log('Serialized string:', JSON.stringify(serializedString));

  // Create a stream that sends data in small chunks to test incremental parsing
  const encoder = new TextEncoder();
  const data = encoder.encode(serializedString);

  const stream = new ReadableStream({
    start(controller) {
      let offset = 0;
      const chunkSize = 5; // Very small chunks to test incremental processing

      function sendNextChunk() {
        if (offset < data.length) {
          const chunk = data.slice(offset, offset + chunkSize);
          controller.enqueue(chunk);
          offset += chunkSize;
          // Use setTimeout to simulate async streaming
          setTimeout(sendNextChunk, 1);
        } else {
          controller.close();
        }
      }

      sendNextChunk();
    },
  });

  // Reify the document from the chunked stream
  const reifiedDocuments = await reifyDocument(stream);

  console.log('Reified documents:', JSON.stringify(reifiedDocuments, null, 2));

  // Verify the result
  const reified = reifiedDocuments[0];
  console.log('Success:', JSON.stringify(reified) === JSON.stringify(sampleDocument));
}

testIncrementalParsing().catch(console.error);
