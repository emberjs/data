import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

module('unit/transform - NumberTransform', function (hooks) {
  setupTest(hooks);

  test('#serialize', async function (assert) {
    const transform = this.owner.lookup('transform:number');

    assert.strictEqual(transform.serialize(null), null);
    assert.strictEqual(transform.serialize(undefined), null);
    assert.strictEqual(transform.serialize('1.1'), 1.1);
    assert.strictEqual(transform.serialize(1.1), 1.1);
    assert.strictEqual(transform.serialize(new Number(1.1)), 1.1);
    assert.strictEqual(transform.serialize(NaN), null);
    assert.strictEqual(transform.serialize(Infinity), null);
    assert.strictEqual(transform.serialize(-Infinity), null);
  });

  test('#deserialize', async function (assert) {
    const transform = this.owner.lookup('transform:number');

    assert.strictEqual(transform.deserialize(null), null);
    assert.strictEqual(transform.deserialize(undefined), null);
    assert.strictEqual(transform.deserialize('1.1'), 1.1);
    assert.strictEqual(transform.deserialize(1.1), 1.1);
    assert.strictEqual(transform.deserialize(new Number(1.1)), 1.1);
    assert.strictEqual(transform.deserialize(NaN), null);
    assert.strictEqual(transform.deserialize(Infinity), null);
    assert.strictEqual(transform.deserialize(-Infinity), null);
  });
});
