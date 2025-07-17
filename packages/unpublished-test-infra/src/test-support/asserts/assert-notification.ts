import { TestContext } from '@ember/test-helpers';

import type { StableRecordIdentifier } from '@warp-drive/core-types';

import type Assert from 'ember-data-qunit-asserts';

import type Store from '@ember-data/store';
import type { DocumentCacheOperation, NotificationType } from '@ember-data/store';
import type { StableDocumentIdentifier } from '@warp-drive/core-types/identifier';

type Counter = { count: number; delivered: number; ignored: number };
type NotificationStorage = Map<
  StableDocumentIdentifier | StableRecordIdentifier | 'document' | 'resource',
  Map<NotificationType | DocumentCacheOperation, Counter | Map<string | symbol, Counter>>
>;

function getCounter(
  context: TestContext,
  identifier: StableRecordIdentifier | StableDocumentIdentifier,
  bucket: NotificationType | DocumentCacheOperation,
  key: string | null
) {
  const storage = (context as unknown as { _notifications: NotificationStorage })._notifications;
  if (!storage) {
    throw new Error(`setupNotifications must be called before calling notified`);
  }

  let identifierStorage = storage.get(identifier);
  if (!identifierStorage) {
    identifierStorage = new Map();
    storage.set(identifier, identifierStorage);
  }

  let bucketStorage = identifierStorage.get(bucket);
  if (!bucketStorage) {
    if (bucket === 'added' || bucket === 'removed' || bucket === 'updated' || bucket === 'state') {
      bucketStorage = { count: 0, delivered: 0, ignored: 0 };
    } else {
      bucketStorage = new Map();
    }
    identifierStorage.set(bucket, bucketStorage);
  }

  let counter: Counter;
  if (bucketStorage instanceof Map) {
    const _key = key || Symbol.for(bucket);
    counter = bucketStorage.get(_key)!;
    if (!counter) {
      counter = { count: 0, delivered: 0, ignored: 0 };
      bucketStorage.set(_key, counter);
    }
  } else {
    counter = bucketStorage;
  }

  return counter;
}

function clearNotifications(context: TestContext) {
  const storage = (context as unknown as { _notifications: NotificationStorage })._notifications;
  if (!storage) {
    throw new Error(`setupNotifications must be called before calling notified`);
  }
  storage.clear();
}

function setupNotifications(context: TestContext, store: Store) {
  (context as unknown as { _notifications: NotificationStorage })._notifications = new Map();

  const notifications = store.notifications;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalNotify = notifications.notify;
  notifications.notify = function (
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    bucket: NotificationType | DocumentCacheOperation,
    key?: string | null
  ) {
    const counter = getCounter(context, identifier, bucket, key ?? null);
    counter.count++;

    // @ts-expect-error TS is bad at curried overloads
    const scheduled = originalNotify.apply(notifications, [identifier, bucket, key]);

    if (scheduled) {
      counter.delivered++;
    } else {
      counter.ignored++;
    }

    return scheduled;
  };
}

export function configureNotificationsAssert(this: TestContext, assert: Assert): void {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const context = this;

  assert.watchNotifications = function (store?: Store) {
    store = store ?? (context.owner.lookup('service:store') as unknown as Store);
    setupNotifications(context, store);
  };

  assert.notified = function (
    this: Assert,
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    bucket: NotificationType | DocumentCacheOperation,
    key: string | null,
    count: number,
    message?: string
  ) {
    const counter = getCounter(context, identifier, bucket, key);

    this.pushResult({
      result: counter.count === count,
      actual: counter.count,
      expected: count,
      message: `${message ? message + ' | ' : ''}Expected ${count} ${bucket} notifications for ${identifier.lid} ${key || ''}, got ${counter.count}`,
    });

    counter.count = 0;
  };

  assert.clearNotifications = function () {
    clearNotifications(context);
  };
}
