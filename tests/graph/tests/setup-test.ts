import { skip, test } from '@warp-drive/diagnostic';

import { createDeprecatedTestFn } from '@ember-data/unpublished-test-infra/test-support/test';

export const deprecatedTest = createDeprecatedTestFn({ skip, test });
