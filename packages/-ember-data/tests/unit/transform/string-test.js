import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

module('unit/transform - StringTransform', function(hooks) {
  setupTest(hooks);

  test('#serialize', async function(assert) {
    const transform = this.owner.lookup('transform:string');

    assert.strictEqual(transform.serialize(null), null);
    assert.strictEqual(transform.serialize(undefined), null);

    assert.equal(transform.serialize('foo'), 'foo');
    assert.equal(transform.serialize(1), '1');
  });

  test('#deserialize', async function(assert) {
    const transform = this.owner.lookup('transform:string');

    assert.strictEqual(transform.deserialize(null), null);
    assert.strictEqual(transform.deserialize(undefined), null);

    assert.equal(transform.deserialize('foo'), 'foo');
    assert.equal(transform.deserialize(1), '1');
  });
});
