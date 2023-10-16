import { module, test } from './@warp-drive/diagnostic/index.js';
import { start } from './@warp-drive/diagnostic/runners/dom.js';

module('example-tests', function() {
  test('An example test', function(assert) {
    assert.ok(true, 'We ran a test');
  });

  test('Another example test 2', function(assert) {
    assert.ok(false, 'We ran another test 2');
    assert.ok(true, 'We passed!');
  });

  test('Another example test 3', function(assert) {
    assert.ok(true, 'We ran another test 3');
  });
});

start({
  useDiagnostic: true
});
