import { setupRecoveryRequests } from '@warp-drive-internal/specs/request-recovery';

import { getRequestState } from '@warp-drive/core/reactive';
import { module, test } from '@warp-drive/diagnostic';

function isUpdating(control: ReturnType<typeof setupRecoveryRequests>) {
  return Boolean((control.subscription as unknown as { _isUpdating?: boolean })._isUpdating);
}

module('Unit | signals | RequestSubscription recovery', function () {
  for (const operation of ['retry', 'reload', 'refresh'] as const) {
    test(`${operation} settles request failures while preserving the rejected Future and clearing update state`, async function (assert) {
      const control = setupRecoveryRequests();
      const { subscription } = control;
      try {
        if (operation === 'retry') {
          control.responses[0].reject(new Error('Initial failure'));
          await assert.throws(async () => {
            await subscription.request;
          }, /Initial failure/);
          assert.true(subscription.reqState.isError);
        } else {
          control.responses[0].resolve({ data: { name: 'Original' } });
          await subscription.request;
          assert.true(subscription.reqState.isSuccess);
        }

        const { reload } = subscription.contentFeatures;
        const recovering =
          operation === 'retry'
            ? subscription.errorFeatures.retry()
            : operation === 'reload'
              ? reload()
              : subscription.contentFeatures.refresh();
        await control.responses[1].started.promise;
        assert.true(isUpdating(control));
        const failedFuture = subscription.contentFeatures.latestRequest;
        assert.ok(failedFuture);
        control.responses[1].reject(new Error('Recovery failure'));
        await recovering;

        assert.false(isUpdating(control), 'settling a failed update releases the notification guard');
        assert.false(subscription.contentFeatures.isRefreshing);
        assert.true(getRequestState(failedFuture!).isError);
        await assert.throws(async () => {
          await failedFuture!;
        }, /Recovery failure/);
        if (operation === 'refresh') {
          assert.true(subscription.reqState.isSuccess, 'background failure retains the successful content');
          assert.equal(subscription.result.data.name, 'Original');
        } else {
          assert.true(subscription.reqState.isError);
        }

        const retrying = subscription.errorFeatures.retry();
        await control.responses[2].started.promise;
        control.responses[2].resolve({ data: { name: 'Recovered' } });
        await retrying;
        assert.true(subscription.reqState.isSuccess);
        assert.equal(subscription.result.data.name, 'Recovered');
        assert.false(isUpdating(control));
        assert.equal(control.calls, 3);
      } finally {
        control.dispose();
      }
    });
  }

  test('aborting a retry settles recovery in cancelled state and releases update state', async function (assert) {
    const control = setupRecoveryRequests();
    const { subscription } = control;
    try {
      control.responses[0].reject(new Error('Initial failure'));
      await assert.throws(async () => {
        await subscription.request;
      }, /Initial failure/);
      const retrying = subscription.errorFeatures.retry();
      await control.responses[1].started.promise;
      assert.true(isUpdating(control));
      const cancelledFuture = subscription.request;
      cancelledFuture.abort();
      await retrying;

      assert.true(subscription.reqState.isCancelled);
      assert.false(isUpdating(control));
      assert.false(subscription.contentFeatures.isRefreshing);
      await assert.throws(async () => {
        await cancelledFuture;
      }, /aborted/i);

      const recovering = subscription.errorFeatures.retry();
      await control.responses[2].started.promise;
      control.responses[2].resolve({ data: { name: 'Recovered' } });
      await recovering;
      assert.true(subscription.reqState.isSuccess);
      assert.equal(subscription.result.data.name, 'Recovered');
      assert.false(isUpdating(control));
    } finally {
      control.dispose();
    }
  });

  test('aborting a refresh preserves content and releases update state', async function (assert) {
    const control = setupRecoveryRequests();
    const { subscription } = control;
    try {
      control.responses[0].resolve({ data: { name: 'Original' } });
      await subscription.request;
      const refreshing = subscription.contentFeatures.refresh();
      await control.responses[1].started.promise;
      assert.true(isUpdating(control));
      const cancelledFuture = subscription.contentFeatures.latestRequest;
      assert.ok(cancelledFuture);
      cancelledFuture!.abort();
      await refreshing;

      assert.true(getRequestState(cancelledFuture!).isCancelled);
      assert.true(subscription.reqState.isSuccess);
      assert.equal(subscription.result.data.name, 'Original');
      assert.false(isUpdating(control));
      assert.false(subscription.contentFeatures.isRefreshing);
      await assert.throws(async () => {
        await cancelledFuture!;
      }, /aborted/i);
    } finally {
      control.dispose();
    }
  });

  test('offline and hidden recovery preconditions still reject without making a request', async function (assert) {
    const control = setupRecoveryRequests();
    const { subscription } = control;
    try {
      control.responses[0].resolve({ data: { name: 'Original' } });
      await subscription.request;
      const { reload } = subscription.contentFeatures;
      for (const property of ['isOnline', 'isHidden'] as const) {
        subscription.isOnline = property !== 'isOnline';
        subscription.isHidden = property === 'isHidden';
        await assert.throws(() => subscription.errorFeatures.retry(), /not online or the tab is hidden/);
        await assert.throws(reload, /not online or the tab is hidden/);
        await assert.throws(() => subscription.contentFeatures.refresh(), /not online or the tab is hidden/);
        assert.equal(control.calls, 1, 'unavailable recovery does not issue another request');
        assert.true(subscription.reqState.isSuccess);
        assert.false(isUpdating(control));
      }
    } finally {
      control.dispose();
    }
  });
});
