import type Owner from '@ember/owner';
import { render as renderTemplate, settled } from '@ember/test-helpers';

import * as QUnit from 'qunit';

import type Store from '@ember-data/store';
import { PRODUCTION } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

/*
  Temporary replacement for the render test helper
  which we will deprecate in EmberData 5.0, this allows
  an app to incrementally migrate to tests that render async
  relationships in stages with potential for tests in between.
*/
export async function render(template: object): Promise<void> {
  await renderTemplate(template);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const owner = QUnit.config.current.testEnvironment.owner as Owner;
  const store = owner.lookup('service:store') as Store;
  const pending = store._getAllPending();

  // this should only be necessary in production tests
  // where @ember/test-waiters is deactivated :()
  if (PRODUCTION) {
    assert(
      `No pending requests exist in this test, use \`import { render } from '@ember/test-helpers';\``,
      pending?.length
    );

    await pending;
    await settled();
  }
}
