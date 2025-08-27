import type { PersistedResourceKey } from '@warp-drive/core/types/identifier';
import type { StructuredDataDocument } from '@warp-drive/core/types/request';
import type { ResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { ExistingResourceObject } from '@warp-drive/core/types/spec/json-api-raw';
import { module, test } from '@warp-drive/diagnostic';
import { DocumentStorage } from '@warp-drive/experiments/document-storage';

module('Unit | DocumentStorage | Basic', function (_hooks) {
  test('it exists', function (assert) {
    const storage = new DocumentStorage({ scope: 'my-test' });
    assert.ok(storage);
  });

  test('Read/Write is idempotent', async function (assert) {
    const storage = new DocumentStorage({ scope: 'my-test' });
    const foo = {
      type: 'foo',
      id: '1',
      attributes: { name: 'bar' },
      relationships: {
        baz: { data: { type: 'baz', id: '1' } },
      },
    };
    const baz = {
      type: 'baz',
      id: '1',
      attributes: { name: 'baz' },
    };
    const data = {
      lid: 'test-1-doc',
      data: {
        type: 'foo',
        id: '1',
        lid: 'foo:1',
      },
      included: [
        {
          type: 'baz',
          id: '1',
          lid: 'baz:1',
        },
      ],
      links: {},
      meta: {},
    };

    const fullData = {
      lid: 'test-1-doc',
      data: foo,
      included: [baz],
      links: {},
      meta: {},
    };
    const doc = {
      content: data,
    } as StructuredDataDocument<ResourceDataDocument>;
    const fullDoc = {
      content: fullData,
    } as unknown as StructuredDataDocument<ResourceDataDocument<ExistingResourceObject>>;

    await storage.putDocument(doc, (resourceIdentifier) => {
      if (resourceIdentifier.lid === 'foo:1') {
        assert.step('foo:1');
        return foo;
      }
      if (resourceIdentifier.lid === 'baz:1') {
        assert.step('baz:1');
        return baz;
      }
      assert.ok(false, `Unexpected resource identifier: ${resourceIdentifier.lid}`);
      return null as unknown as PersistedResourceKey;
    });

    assert.verifySteps(['foo:1', 'baz:1']);

    const readDoc = await storage.getDocument({ lid: 'test-1-doc' });

    // == ensure that we didn't leak the original object references

    // @ts-expect-error
    assert.notEqual(readDoc!.content!.data, doc.content.data, 'Document data is not the same object');
    // @ts-expect-error
    assert.notEqual(readDoc!.content!.data, foo, 'Document data is not the same object');
    assert.notEqual(
      // @ts-expect-error
      readDoc!.content!.included[0],
      doc.content.included![0],
      'Document incuded data is not the same object'
    );
    // @ts-expect-error
    assert.notEqual(readDoc!.content!.included[0], baz, 'Document included data is not the same object');
    assert.notEqual(readDoc, doc, 'Document is not the same object');

    // == ensure that the data is the same
    assert.deepEqual(readDoc, fullDoc, 'Document is the same data');

    await storage.clear();
  });
});
