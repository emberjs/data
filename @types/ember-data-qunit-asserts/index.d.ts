import type { CacheOperation, NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { ResourceKey } from '@warp-drive/core-types';
import type { RequestKey } from '@warp-drive/core-types/identifier';

declare global {
  interface DeprecationConfig {
    id: string;
    count?: number;
    until: string;
    message?: string;
    url?: string;
  }
  interface WarningConfig {
    id: string;
    count?: number;
    until?: string;
    message?: string;
    url?: string;
  }

  interface Assert {
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
    /**
     * Asserts that each key of actual strictly matches the corresponding key of expected.
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
      identifier: RequestKey | ResourceKey,
      bucket: NotificationType | CacheOperation,
      key: string | null,
      count: number
    ): void;

    watchNotifications(store?: unknown): void;
    clearNotifications(): void;
  }

  namespace QUnit {
    export interface Assert {
      expectDeprecation(options: { id: string; count: number; until?: string }): void;
      expectDeprecation(
        callback: () => void | Promise<void>,
        options: DeprecationConfig | string | RegExp
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
      arrayStrictEquals<T>(unknown, expected: T[], message: string): void;
      notified(
        identifier: RequestKey | ResourceKey,
        bucket: NotificationType | CacheOperation,
        key: string | null,
        count: number
      ): void;

      watchNotifications(store?: unknown): void;
      clearNotifications(): void;
    }
  }

  interface QUnit {
    assert: Assert;
  }
}

export default Assert;
