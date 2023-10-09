import { getTestMetadata, setupContext, SetupContextOptions, teardownContext, TestContext } from '@ember/test-helpers';

import type { EmberHooks } from '@warp-drive/diagnostic';

export function setupTest(hooks: EmberHooks<TestContext>, opts?: SetupContextOptions) {
  const options = { waitForSettled: false, ...opts };

  hooks.beforeEach(async function () {
    let testMetadata = getTestMetadata(this);
    testMetadata.framework = 'qunit';

    await setupContext(this, options);
  });

  hooks.afterEach(function (this: TestContext) {
    return teardownContext(this, options);
  });
}
