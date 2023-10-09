import { skip, test } from 'qunit';

import { createDeprecatedTestFn } from './test';

export const deprecatedTest = createDeprecatedTestFn({ skip, test });
