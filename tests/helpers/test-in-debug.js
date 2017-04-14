import { runInDebug } from 'ember-data/-debug';
import { test, skip } from 'qunit';

export default function testInDebug() {
  let isDebug = false;

  // TODO: this should be debug-stripped...
  if (require.has('ember-data/-private/debug')) {
    require('ember-data/-private/debug').runInDebug(() => isDebug = true);
  }

  if (isDebug) {
    test(...arguments);
  } else {
    skip(...arguments);
  }
}
