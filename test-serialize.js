// Simple test to verify the serialize/reify functionality
import {
  serializeDocument,
  reifyDocument,
} from './warp-drive-packages/utilities/src/-private/json-api-streams/serialize.ts';

// Sample JSON:API document
const sampleDocument = {
  data: [
    {
      type: 'user',
      id: '1',
      attributes: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      type: 'user',
      id: '2',
      attributes: {
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
    },
  ],
  included: [
    {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Hello World',
        body: 'This is a test post',
      },
    },
  ],
  meta: {
    total: 2,
  },
  links: {
    self: '/users',
  },
};

async function testSerializeReify() {
  console.log('Original document:', JSON.stringify(sampleDocument, null, 2));

  // Serialize the document
  const serializedChunks = [];
  for (const chunk of serializeDocument(sampleDocument)) {
    serializedChunks.push(chunk);
  }

  const serializedString = serializedChunks.join('');
  console.log('\nSerialized string:');
  console.log(JSON.stringify(serializedString));

  // Create a ReadableStream from the serialized string
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(serializedString));
      controller.close();
    },
  });

  // Reify the document
  const reifiedDocuments = await reifyDocument(stream);

  console.log('\nReified documents:', JSON.stringify(reifiedDocuments, null, 2));

  // Basic verification
  const reified = reifiedDocuments[0];
  console.log('\nVerification:');
  console.log(
    'Data length matches:',
    Array.isArray(reified.data) && reified.data.length === sampleDocument.data.length
  );
  console.log(
    'Included length matches:',
    Array.isArray(reified.included) && reified.included.length === sampleDocument.included.length
  );
  console.log('Meta matches:', JSON.stringify(reified.meta) === JSON.stringify(sampleDocument.meta));
  console.log('Links matches:', JSON.stringify(reified.links) === JSON.stringify(sampleDocument.links));
}

testSerializeReify().catch(console.error);
