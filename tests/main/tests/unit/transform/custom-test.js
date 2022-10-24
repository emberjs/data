import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import Transform from '@ember-data/serializer/transform';

module('unit/transform - CustomTransform', function (hooks) {
  setupTest(hooks);

  test('#serialize', async function (assert) {
    const store = this.owner.lookup('service:store');

    class User extends Model {
      @attr('custom') name;
    }
    this.owner.register('model:user', User);

    class CustomTransform extends Transform {}

    this.owner.register('transform:custom', CustomTransform);
    this.owner.register('serializer:user', JSONSerializer);

    assert.throws(
      () => store.normalize('user', { id: '1', name: 'Chris' }),
      TypeError,
      'throws with missing deserialize method'
    );
  });

  test('#deserialize', async function (assert) {
    class User extends Model {
      @attr('custom') name;
    }
    this.owner.register('model:user', User);

    class CustomTransform extends Transform {}
    this.owner.register('transform:custom', CustomTransform);
    this.owner.register('serializer:user', JSONSerializer);

    const userRecord = this.owner.lookup('service:store').push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
      },
    });

    assert.throws(() => userRecord.serialize(), TypeError, 'throws with missing serialize method');
  });
});
