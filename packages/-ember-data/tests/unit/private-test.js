import { module, test } from 'qunit';

import { InternalModel } from '@ember-data/store/-private';

module('-private', function () {
  test('`InternalModel` is accessible via private import', function (assert) {
    assert.ok(!!InternalModel);
  });
});
