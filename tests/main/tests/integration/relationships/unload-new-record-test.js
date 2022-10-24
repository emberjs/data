import EmberObject, { set } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('Relationships | unloading new records', function (hooks) {
  setupTest(hooks);
  let store;
  let adapter;
  let entryNode;
  let newNode;

  class NeverAdapter extends EmberObject {
    _assert(msg) {
      if (!this.assert) {
        throw new Error(`Failed to configure NeverAdapter with "assert" for this test.\n\n\t${msg}`);
      }
      this.assert.ok(false, msg);
    }
    shouldBackgroundReloadRecord() {
      return false;
    }
    shouldBackgroundReloadAll() {
      return false;
    }
    shouldReloadAll() {
      return false;
    }
    shouldReloadRecord() {
      return false;
    }
    findRecord() {
      this._assert(`Unexpected Adapter findRecord call`);
    }
    findBelongsTo() {
      this._assert(`Unexpected Adapter findBelongsTo call`);
    }
    findHasMany() {
      this._assert(`Unexpected Adapter findhasMany call`);
    }
    findMany() {
      this._assert(`Unexpected Adapter findMany call`);
    }
    findAll() {
      this._assert(`Unexpected Adapter findAll call`);
    }
    query() {
      this._assert(`Unexpected Adapter query call`);
    }
  }

  class Node extends Model {
    @attr() name;
    @belongsTo('node', { inverse: 'children', async: false }) parent;
    @belongsTo('node', { inverse: 'asyncEdges', async: true }) relatedGraph;
    @hasMany('node', { inverse: 'parent', async: false }) children;
    @hasMany('node', { inverse: 'relatedGraph', async: true }) asyncEdges;
  }

  hooks.beforeEach(function (assert) {
    const { owner } = this;
    owner.register('model:node', Node);
    owner.register('adapter:application', NeverAdapter);
    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
    adapter.assert = assert;

    entryNode = store.push({
      data: {
        type: 'node',
        id: '2',
        attributes: { name: 'entry-node' },
        relationships: {
          parent: { data: { type: 'node', id: '1' } },
          children: {
            data: [{ type: 'node', id: '3' }],
          },
          relatedGraph: { data: { type: 'node', id: '4' } },
          asyncEdges: { data: [{ type: 'node', id: '5' }] },
        },
      },
      included: [
        {
          type: 'node',
          id: '1',
          attributes: { name: 'root' },
          relationships: {
            children: {
              data: [{ type: 'node', id: '2' }],
            },
          },
        },
        {
          type: 'node',
          id: '3',
          attributes: { name: 'a child node' },
          relationships: {
            parent: {
              data: { type: 'node', id: '2' },
            },
          },
        },
        {
          type: 'node',
          id: '4',
          attributes: { name: 'an async relatedGraph entry' },
          relationships: {
            asyncEdges: {
              data: [{ type: 'node', id: '2' }],
            },
          },
        },
        {
          type: 'node',
          id: '5',
          attributes: { name: 'an async edge' },
          relationships: {
            relatedGraph: {
              data: { type: 'node', id: '2' },
            },
          },
        },
      ],
    });
    newNode = store.createRecord('node', {
      name: 'our newly created node',
    });
  });

  test('Unloading a sync belongsTo does not force the relationship state to reload', async function (assert) {
    const originalRootNode = entryNode.parent;

    assert.strictEqual(originalRootNode.name, 'root', 'PreCond: We have rootNode set');
    assert.deepEqual(
      originalRootNode.children.map((c) => c.id),
      ['2'],
      'Precond: Root Node has the correct children'
    );

    set(entryNode, 'parent', newNode);
    const value = entryNode.parent;

    assert.strictEqual(value, newNode, 'PreCond: We properly set the sync belongsTo to the new value');
    assert.deepEqual(
      originalRootNode.children.map((c) => c.id),
      [],
      'Precond: Root Node has the correct children'
    );

    newNode.unloadRecord();
    await settled();

    assert.strictEqual(entryNode.parent, null, 'Our relationship state is now null');
    assert.deepEqual(
      originalRootNode.children.map((c) => c.id),
      [],
      'Root Node still has the correct children'
    );
  });

  test('Unloading an entry in a sync hasMany does not force the relationship state to reload', async function (assert) {
    assert.deepEqual(
      entryNode.children.map((c) => c.id),
      ['3'],
      'Precond: EntryNode has the correct children'
    );
    assert.strictEqual(newNode.parent, null, 'PreCond: The new node does not have a parent');

    set(newNode, 'parent', entryNode);

    assert.strictEqual(newNode.parent, entryNode, 'PreCond: We properly set the sync belongsTo to the new value');
    assert.deepEqual(
      entryNode.children.map((c) => c.name),
      ['a child node', 'our newly created node'],
      'Precond: EntryNode has the correct children'
    );

    newNode.unloadRecord();
    await settled();

    assert.deepEqual(
      entryNode.children.map((c) => c.id),
      ['3'],
      'entryNode has the correct children'
    );
  });

  test('Unloading an async belongsTo does not force the relationship state to reload', async function (assert) {
    const originalRelatedNode = await entryNode.relatedGraph;

    assert.strictEqual(originalRelatedNode.name, 'an async relatedGraph entry', 'PreCond: We have rootNode set');

    let originalNodeAsyncEdges = await originalRelatedNode.asyncEdges;

    assert.deepEqual(
      originalNodeAsyncEdges.map((c) => c.id),
      ['2'],
      'Precond: Related Node has the correct asyncEdges'
    );

    set(entryNode, 'relatedGraph', newNode);

    let value = await entryNode.relatedGraph;
    originalNodeAsyncEdges = await originalRelatedNode.asyncEdges;

    assert.strictEqual(value, newNode, 'PreCond: We properly set the async belongsTo to the new value');
    assert.deepEqual(
      originalNodeAsyncEdges.map((c) => c.id),
      [],
      'Precond: Original Related Node has the correct asyncEdges'
    );

    newNode.unloadRecord();
    await settled();

    value = await entryNode.relatedGraph;
    assert.strictEqual(value, null, 'Our relationship state is now null');
  });

  test('Unloading an entry in an async hasMany does not force the relationship state to reload', async function (assert) {
    let asyncEdges = await entryNode.asyncEdges;
    assert.deepEqual(
      asyncEdges.map((c) => c.id),
      ['5'],
      'Precond: entryNode has the correct asyncEdges'
    );
    let originalRelatedNode = await newNode.relatedGraph;
    assert.strictEqual(originalRelatedNode, null, 'PreCond: newNode has no relatedGraph yet');

    set(newNode, 'relatedGraph', entryNode);

    let value = await newNode.relatedGraph;
    asyncEdges = await entryNode.asyncEdges;

    assert.strictEqual(value, entryNode, 'PreCond: We properly set the async belongsTo to the new value');
    assert.deepEqual(
      asyncEdges.map((c) => c.name),
      ['an async edge', 'our newly created node'],
      'Precond: entryNode has the correct asyncEdges'
    );

    newNode.unloadRecord();
    await settled();

    asyncEdges = await entryNode.asyncEdges;
    assert.deepEqual(
      asyncEdges.map((c) => c.name),
      ['an async edge'],
      'Precond: entryNode has the correct asyncEdges'
    );
  });
});
