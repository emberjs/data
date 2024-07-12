import type { StructuredDataDocument } from '@ember-data/request';
import type { ExistingRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { ResourceDataDocument } from '@warp-drive/core-types/spec/document';
import type { ExistingResourceObject } from '@warp-drive/core-types/spec/json-api-raw';
import { module, test } from '@warp-drive/diagnostic';
import { DocumentStorage } from '@warp-drive/experiments/document-storage';

module('Unit | DocumentStorage | Sync', function (_hooks) {
  test('Instances are shared based on scope', function (assert) {
    const storage1 = new DocumentStorage({ scope: 'my-test' });
    const storage2 = new DocumentStorage({ scope: 'my-test' });
    const storage3 = new DocumentStorage({ scope: 'my-test2' });

    assert.equal(storage1._storage, storage2._storage, 'Instances are shared based on scope');
    assert.notEqual(storage1._storage, storage3._storage, 'Instances are not shared when scope differs');
  });

  test('Isolation results in not sharing an instance', function (assert) {
    const storage1 = new DocumentStorage({ scope: 'my-test', isolated: true });
    const storage2 = new DocumentStorage({ scope: 'my-test', isolated: true });

    assert.notEqual(storage1._storage, storage2._storage, 'Instances are not shared when isolated is true');
  });

  test('Documents stored by one instance are retrievable by another', async function (assert) {
    const storage1 = new DocumentStorage({ scope: 'my-test', isolated: true });
    const storage2 = new DocumentStorage({ scope: 'my-test', isolated: true });

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
    } as StructuredDataDocument<ResourceDataDocument<ExistingRecordIdentifier>>;
    const fullDoc = {
      content: fullData,
    } as unknown as StructuredDataDocument<ResourceDataDocument<ExistingResourceObject>>;

    await storage1.putDocument(doc, (resourceIdentifier) => {
      if (resourceIdentifier.lid === 'foo:1') {
        assert.step('foo:1');
        return foo;
      }
      if (resourceIdentifier.lid === 'baz:1') {
        assert.step('baz:1');
        return baz;
      }
      assert.ok(false, `Unexpected resource identifier: ${resourceIdentifier.lid}`);
      return null as unknown as ExistingRecordIdentifier;
    });

    assert.verifySteps(['foo:1', 'baz:1']);

    const readDoc = await storage2.getDocument({ lid: 'test-1-doc' });

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
  });

  test('Documents updated by one instance invalidate other instances', async function (assert) {
    const storage1 = new DocumentStorage({ scope: 'my-test', isolated: true });
    const storage2 = new DocumentStorage({ scope: 'my-test', isolated: true });

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
    } as StructuredDataDocument<ResourceDataDocument<ExistingRecordIdentifier>>;
    const fullDoc = {
      content: fullData,
    } as unknown as StructuredDataDocument<ResourceDataDocument<ExistingResourceObject>>;

    await storage1.putDocument(doc, (resourceIdentifier) => {
      if (resourceIdentifier.lid === 'foo:1') {
        return foo;
      }
      if (resourceIdentifier.lid === 'baz:1') {
        return baz;
      }
      assert.ok(false, `Unexpected resource identifier: ${resourceIdentifier.lid}`);
      return null as unknown as ExistingRecordIdentifier;
    });

    // get the original document from storage2
    const readDoc = await storage2.getDocument({ lid: 'test-1-doc' });
    assert.deepEqual(readDoc, fullDoc, 'Document is the same data');

    // update the document in storage1
    const foo2 = structuredClone(foo);
    foo2.attributes.name = 'foo again';

    const invalidationEvent = new Promise<void>((resolve, reject) => {
      const channel = new BroadcastChannel(storage1._storage.options.scope);
      const timeout = setTimeout(reject, 100);
      channel.onmessage = (event) => {
        if (event.data.type === 'patch') {
          resolve();
          channel.close();
          clearTimeout(timeout);
        }
      };
    });

    await storage1.putDocument(doc, (resourceIdentifier) => {
      if (resourceIdentifier.lid === 'foo:1') {
        return foo2;
      }
      if (resourceIdentifier.lid === 'baz:1') {
        return baz;
      }
      assert.ok(false, `Unexpected resource identifier: ${resourceIdentifier.lid}`);
      return null as unknown as ExistingRecordIdentifier;
    });

    await invalidationEvent;

    assert.false(storage1._storage._invalidated, 'we do not invalidate ourselves');
    assert.true(storage2._storage._invalidated, 'we invalidate others');

    // get the updated document from storage2
    const readDoc2 = await storage2.getDocument({ lid: 'test-1-doc' });
    const fullData2 = structuredClone(fullData);
    fullData2.data = foo2;
    const fullDoc2 = {
      content: fullData2,
    } as unknown as StructuredDataDocument<ResourceDataDocument<ExistingResourceObject>>;

    assert.deepEqual(readDoc2, fullDoc2, 'Document contains the updated data');
    // @ts-expect-error
    assert.equal(readDoc2.content!.data!.attributes!.name, 'foo again', 'Document contains the updated data');

    await storage1.clear();
  });
});
