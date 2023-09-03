import type { TestContext } from '@ember/test-helpers';

import QUnit from 'qunit';

import type { CacheOperation, NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { clearNotifications, getCounter } from '../setup-notifications';

export function configureNotificationsAssert() {
  QUnit.assert.notified = function (
    this: Assert & { test: { testEnvironment: TestContext } },
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    bucket: NotificationType | CacheOperation,
    key: string | null,
    count: number
  ) {
    const counter = getCounter(this.test.testEnvironment, identifier, bucket, key);

    this.pushResult({
      result: counter.count === count,
      actual: counter.count,
      expected: count,
      message: `Expected ${count} ${bucket} notifications for ${identifier.lid} ${key || ''}, got ${counter.count}`,
    });

    counter.count = 0;
  };

  QUnit.assert.clearNotifications = function (this: Assert & { test: { testEnvironment: TestContext } }) {
    clearNotifications(this.test.testEnvironment);
  };
}
