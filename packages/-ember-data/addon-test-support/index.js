import { assert } from '@ember/debug';
import { render as renderTemplate, settled } from '@ember/test-helpers';

import * as QUnit from 'qunit';

import { PRODUCTION } from '@ember-data/env';

/*
  Temporary replacement for the render test helper
  which we will deprecate in EmberData 5.0, this allows
  an app to incrementally migrate to tests that render async
  relationships in stages with potential for tests in between.
*/
export async function render(template) {
  await renderTemplate(template);
  const owner = QUnit.config.current.testEnvironment.owner;
  const pending = owner.lookup('service:store')._getAllPending();

  // this should only be necessary in production tests
  // where @ember/test-waiters is deactivated :()
  if (PRODUCTION) {
    assert(
      `No pending requests exist in this test, use \`import { render } from '@ember/test-helpers';\``,
      pending.length
    );

    await pending;
    await settled();
  }
}
