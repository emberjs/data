import { module, test } from './@warp-drive/diagnostic/index.js';
import { start } from './@warp-drive/diagnostic/runners/dom.js';

module('example-tests', function() {
  test('An example test', function(assert) {
    assert.ok(true, 'We ran a test');
  });
});

start({
  useDiagnostic: true
});
