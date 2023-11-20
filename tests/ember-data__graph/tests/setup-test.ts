import { createDeprecatedTestFn } from '@ember-data/unpublished-test-infra/test-support/test';
import { skip, test } from '@warp-drive/diagnostic';

export const deprecatedTest = createDeprecatedTestFn({ skip, test });
