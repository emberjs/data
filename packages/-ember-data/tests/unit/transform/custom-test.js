import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Transform from '@ember-data/serializer/transform';

module('unit/transform - CustomTransform', function (hooks) {
  setupTest(hooks);

  test('#serialize', async function (assert) {
    class CustomTransform extends Transform {}
    this.owner.register('transform:custom', CustomTransform);
    const transform = this.owner.lookup('transform:custom');

    assert.throws(() => transform.serialize(''), null, 'throws with missing serialize method');
  });

  test('#deserialize', async function (assert) {
    class CustomTransform extends Transform {}
    this.owner.register('transform:custom', CustomTransform);
    const transform = this.owner.lookup('transform:custom');

    assert.throws(() => transform.transform.deserialize(''), null, 'throws with missing serialize method');
  });
});
