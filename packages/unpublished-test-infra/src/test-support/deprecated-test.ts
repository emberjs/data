import { skip, test } from 'qunit';

import { createDeprecatedTestFn } from './test';
import { TestContext } from '@ember/test-helpers';

export const deprecatedTest: (
  testName: string,
  deprecation: {
    until: `${number}.${number}`;
    id: string;
    count: number;
    debugOnly?: boolean;
    refactor?: boolean;
  },
  testCallback: (this: TestContext, assert: Assert) => void | Promise<void>
) => void = createDeprecatedTestFn({ skip, test });
