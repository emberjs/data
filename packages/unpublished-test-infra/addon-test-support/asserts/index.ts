import { TestContext } from '@ember/test-helpers';

import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';

import type Assert from 'ember-data-qunit-asserts';

import { CacheOperation, NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';

import { configureAssertAllDeprecations } from './assert-all-deprecations';
import { configureAssertionHandler } from './assert-assertion';
import { configureBetterAsserts } from './assert-better';
import { configureDeprecationHandler, DeprecationConfig, FoundDeprecation } from './assert-deprecation';
import { configureNotificationsAssert } from './assert-notification';
import { configureWarningHandler, WarningConfig } from './assert-warning';

declare module '@warp-drive/diagnostic' {
  export interface EmberDiagnostic extends Diagnostic {
    expectDeprecation(options: DeprecationConfig, label?: string): void;
    expectDeprecation(
      callback: () => void | Promise<void>,
      options: DeprecationConfig | string | RegExp,
      label?: string
    ): Promise<void>;
    expectNoDeprecation(
      callback: () => void | Promise<void>,
      label?: string,
      filter?: (deprecation: FoundDeprecation) => boolean
    ): Promise<void>;
    expectWarning(callback: () => unknown, options: WarningConfig | string | RegExp): Promise<void>;
    expectNoWarning(callback: () => unknown): Promise<void>;
    expectAssertion(callback: () => unknown, matcher: string | RegExp): Promise<void>;
    expectNoAssertion(callback: () => unknown): Promise<void>;
    watchNotifications(store?: unknown): void;
    /**
     * Asserts that each member of actual strictly matches the corresponding member of expected.
     * Asserts that actual is an array and has the same length as expected.
     */
    arrayStrictEquals<T>(actual: unknown, expected: T[], message: string): void;
    /**
     * Asserts that the given identifier has been notified of a change to the given bucket
     * and optional key the given number of times during the test.
     *
     * Clears the notification count for the given identifier, bucket and key after the assertion
     * is made so that it is easy to assert notification counts in between steps of a test.
     */
    notified(
      identifier: StableDocumentIdentifier | StableRecordIdentifier,
      bucket: NotificationType | CacheOperation,
      key: string | null,
      count: number
    ): void;

    clearNotifications(): void;
  }

  export interface EmberHooks<TC extends TestContext> {
    onSuiteStart: (cb: () => void | Promise<void>) => void;
    onSuiteFinish: (cb: () => void | Promise<void>) => void;
    beforeModule: (cb: () => void | Promise<void>) => void;
    afterModule: (cb: () => void | Promise<void>) => void;
    beforeEach: (cb: (this: TC, assert: EmberDiagnostic) => void | Promise<void>) => void;
    afterEach: (cb: (this: TC, assert: EmberDiagnostic) => void | Promise<void>) => void;
  }

  export function module<TC extends TestContext>(
    name: string,
    callback: (hooks: EmberHooks<TC>) => void | Promise<void>
  ): void;

  export function skip<TC extends TestContext>(
    name: string,
    callback: (this: TC, assert: EmberDiagnostic) => void | Promise<void>
  ): void;

  export function todo<TC extends TestContext>(
    name: string,
    callback: (this: TC, assert: EmberDiagnostic) => void | Promise<void>
  ): void;

  export function test<TC extends TestContext>(
    name: string,
    callback: (this: TC, assert: EmberDiagnostic) => void | Promise<void>
  ): void;
}

type CompatAssert = Assert & {
  test: {
    expected: number;
  };
};

export interface ExpandedHooks {
  onSuiteStart: (cb: () => void | Promise<void>) => void;
  onSuiteFinish: (cb: () => void | Promise<void>) => void;
  beforeModule: (cb: () => void | Promise<void>) => void;
  afterModule: (cb: () => void | Promise<void>) => void;
  beforeEach: (cb: (assert: CompatAssert) => void | Promise<void>) => void;
  afterEach: (cb: (assert: CompatAssert) => void | Promise<void>) => void;
}

function upgradeHooks(hooks: NestedHooks): ExpandedHooks {
  const upgraded = hooks as unknown as ExpandedHooks;
  // eslint-disable-next-line no-restricted-globals
  const Framework = typeof QUnit !== 'undefined' ? QUnit : null;
  if (Framework) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    upgraded.onSuiteStart = Framework.begin;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    upgraded.onSuiteFinish = Framework.done;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    upgraded.beforeModule = hooks.before;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    upgraded.afterModule = hooks.after;
  }
  return upgraded;
}

export default function configureAsserts(hooks: NestedHooks) {
  const upgraded = upgradeHooks(hooks);

  upgraded.beforeEach(function (this: TestContext, assert) {
    configureAssertionHandler(assert);
    configureDeprecationHandler(assert);
    configureWarningHandler(assert);
    configureBetterAsserts(assert);
    configureNotificationsAssert.call(this, assert);
  });
  configureAssertAllDeprecations(upgraded);
}
