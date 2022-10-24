import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

module('unit/transform - DateTransform', function (hooks) {
  setupTest(hooks);
  const dateString = '2015-01-01T00:00:00.000Z';
  const dateInMillis = Date.parse(dateString);
  const date = new Date(dateString);

  test('#serialize', async function (assert) {
    const transform = this.owner.lookup('transform:date');

    assert.strictEqual(transform.serialize(null), null);
    assert.strictEqual(transform.serialize(undefined), null);
    assert.strictEqual(transform.serialize(new Date('invalid')), null);

    assert.strictEqual(transform.serialize(date), dateString);
  });

  test('#deserialize', async function (assert) {
    const transform = this.owner.lookup('transform:date');

    // from String
    assert.strictEqual(transform.deserialize(dateString).toISOString(), dateString);

    // from Number
    assert.strictEqual(transform.deserialize(dateInMillis).valueOf(), dateInMillis);

    // from other
    assert.strictEqual(transform.deserialize({}), null);

    // from none
    assert.strictEqual(transform.deserialize(null), null);
    assert.strictEqual(transform.deserialize(undefined), undefined);
  });
});
