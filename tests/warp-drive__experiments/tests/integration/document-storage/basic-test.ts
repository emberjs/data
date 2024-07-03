import { module, test } from '@warp-drive/diagnostic';
import { DocumentStorage } from '@warp-drive/experiments/document-storage';

module('Unit | DocumentStorage | Basic', function (hooks) {
  test('it exists', function (assert) {
    const storage = new DocumentStorage();
    assert.ok(storage);
  });
});
