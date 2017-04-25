import require from 'require';
import { test, skip } from 'qunit';

export default function testInDebug() {
  let isDebug = false;

  // TODO: this should be debug-stripped...
  if (require.has('ember-data/-debug')) {
    require('ember-data/-debug').runInDebug(() => isDebug = true);
  }

  if (isDebug) {
    test(...arguments);
  } else {
    skip(...arguments);
  }
}
