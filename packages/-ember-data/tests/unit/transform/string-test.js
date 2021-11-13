import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

module('unit/transform - StringTransform', function (hooks) {
  setupTest(hooks);

  test('#serialize', async function (assert) {
    const transform = this.owner.lookup('transform:string');

    assert.strictEqual(transform.serialize(null), null);
    assert.strictEqual(transform.serialize(undefined), null);

    assert.strictEqual(transform.serialize('foo'), 'foo');
    assert.strictEqual(transform.serialize(1), '1');
  });

  test('#deserialize', async function (assert) {
    const transform = this.owner.lookup('transform:string');

    assert.strictEqual(transform.deserialize(null), null);
    assert.strictEqual(transform.deserialize(undefined), null);

    assert.strictEqual(transform.deserialize('foo'), 'foo');
    assert.strictEqual(transform.deserialize(1), '1');
  });
});
